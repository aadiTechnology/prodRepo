"""In-process scheduler for holiday/exam reminder and day notifications.

Uses asyncio only (no Celery/Redis). Started from FastAPI startup when enabled.
"""

from __future__ import annotations

import asyncio
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

_scheduler_task: Optional[asyncio.Task] = None


async def _run_once() -> None:
    """Open a DB session and process due holiday/exam scheduled notifications."""
    from app.core.database import SessionLocal
    from app.services import notification_service

    db = SessionLocal()
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: notification_service.process_scheduled_holiday_exam_notifications(db),
        )
        logger.info(
            "Notification scheduler run complete tenants=%s events=%s created=%s",
            result.tenants_processed,
            result.events_processed,
            result.notifications_created,
        )
    except Exception:
        logger.exception("Notification scheduler run failed")
    finally:
        db.close()


async def _scheduler_loop() -> None:
    interval = max(60, int(settings.NOTIFICATION_SCHEDULER_INTERVAL_SECONDS or 900))
    logger.info(
        "Notification scheduler started interval_seconds=%s",
        interval,
    )
    # Brief delay so startup DB init can finish first
    await asyncio.sleep(15)
    while True:
        await _run_once()
        await asyncio.sleep(interval)


def start_notification_scheduler() -> None:
    """Start background loop if enabled and not already running."""
    global _scheduler_task
    if not settings.NOTIFICATION_SCHEDULER_ENABLED:
        logger.info("Notification scheduler disabled via NOTIFICATION_SCHEDULER_ENABLED")
        return
    if _scheduler_task is not None and not _scheduler_task.done():
        return
    try:
        loop = asyncio.get_event_loop()
        _scheduler_task = loop.create_task(_scheduler_loop())
    except Exception:
        logger.exception("Failed to start notification scheduler")


async def stop_notification_scheduler() -> None:
    """Cancel background loop on shutdown."""
    global _scheduler_task
    if _scheduler_task is None:
        return
    _scheduler_task.cancel()
    try:
        await _scheduler_task
    except asyncio.CancelledError:
        pass
    except Exception:
        logger.exception("Error while stopping notification scheduler")
    finally:
        _scheduler_task = None
        logger.info("Notification scheduler stopped")
