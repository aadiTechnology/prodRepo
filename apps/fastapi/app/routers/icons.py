"""
Icons API endpoint - serves URLs for sidebar icons.
Icons are auto-uploaded to storage on first request.
"""

from fastapi import APIRouter, HTTPException, status
import logging

from app.services.icon_auto_uploader import get_icon_urls

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/icons", tags=["icons"])


@router.get("/sidebar")
def get_sidebar_icons() -> dict[str, str]:
    """
    Get sidebar icon URLs.
    
    Icons are automatically uploaded to configured storage on first call.
    Returns URLs for: academics, attendance, communication, settings, dashboard
    
    Example response:
    {
        "academics": "https://..../sidebar-icons/academics.png",
        "attendance": "https://..../sidebar-icons/attendance.png",
        ...
    }
    """
    try:
        urls = get_icon_urls()
        if not urls:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Icon storage not configured"
            )
        return urls
    except Exception as e:
        logger.error(f"Failed to get icon URLs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load icons"
        )
