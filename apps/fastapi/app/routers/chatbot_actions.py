"""Thin Chatbot Action API. Calls domain services; does not wrap UI HTTP contracts."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user, require_menu_path_permission
from app.routers.installment_tracking import require_installment_tracking_access
from app.services.chatbot_actions.errors import ChatbotActionError
from app.services.chatbot_actions.registry import execute_action
from app.services.notice_service import NOTICE_MENU_PATH

router = APIRouter(prefix="/api/chatbot/actions", tags=["Chatbot Actions"])


def _json_error(exc: ChatbotActionError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message},
    )


def _payload(body: dict[str, Any] | None) -> dict[str, Any]:
    return body if isinstance(body, dict) else {}


@router.post("/get_homework")
def get_homework(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "get_homework", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/add_homework")
def add_homework(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "add_homework", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/create_homework")
def create_homework_alias(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "add_homework", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/get_attendance")
def get_attendance(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "get_attendance", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/add_attendance")
def add_attendance(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "add_attendance", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/mark_attendance")
def mark_attendance_alias(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        return execute_action(db, current_user, "add_attendance", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/get_notices")
def get_notices(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(NOTICE_MENU_PATH, "view")
    ),
):
    try:
        return execute_action(db, current_user, "get_notices", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/get_notice")
def get_notice_alias(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_menu_path_permission(NOTICE_MENU_PATH, "view")
    ),
):
    try:
        return execute_action(db, current_user, "get_notices", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/get_fee_status")
def get_fee_status(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    try:
        return execute_action(db, current_user, "get_fee_status", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)


@router.post("/get_fee")
def get_fee_alias(
    body: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    try:
        return execute_action(db, current_user, "get_fee_status", _payload(body))
    except ChatbotActionError as exc:
        return _json_error(exc)
