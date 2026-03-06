import time

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.core.logging_config import get_logger
from app.models.user import User, UserRole
from app.schemas.ai import InterpretRequest, InterpretResponse, GenerateStoryAndTestsRequest
from app.services.intent_service import interpret
from app.services.ai_service import generate_story_and_tests
from app.services.cache_service import get_cached_response, cache_response, generate_requirement_hash
from app.services.ai_persistence_service import save_ai_response, get_requirement_by_hash
from app.services.ai_models import AIResponse
from app.models.ai_entities import Requirement

router = APIRouter(prefix="/api/ai", tags=["AI"])
logger = get_logger(__name__)


def _saved_requirement_to_dict(db_req: Requirement) -> dict:
    requirement = {
        "id": db_req.id,
        "title": db_req.title,
        "description": db_req.description,
        "tenant_id": db_req.tenant_id,
        "is_super_admin_accessible": db_req.is_super_admin_accessible,
        "created_at": db_req.created_at,
        "created_by": db_req.created_by,
        "updated_at": db_req.updated_at,
        "updated_by": db_req.updated_by,
    }
    user_stories = [
        {
            "id": us.id,
            "requirement_id": us.requirement_id,
            "title": us.title,
            "prerequisite": us.prerequisite,
            "story": us.story,
            "acceptance_criteria": us.acceptance_criteria,
            "tenant_id": us.tenant_id,
            "is_super_admin_accessible": us.is_super_admin_accessible,
            "created_at": us.created_at,
            "created_by": us.created_by,
            "updated_at": us.updated_at,
            "updated_by": us.updated_by,
        }
        for us in db_req.user_stories
    ]
    test_cases = []
    for us in db_req.user_stories:
        for tc in us.test_cases:
            test_cases.append({
                "id": tc.id,
                "user_story_id": tc.user_story_id,
                "test_case_id": tc.test_case_id,
                "scenario": tc.scenario,
                "pre_requisite": tc.pre_requisite,
                "test_data": tc.test_data,
                "steps": tc.steps,
                "expected_result": tc.expected_result,
                "tenant_id": tc.tenant_id,
                "is_super_admin_accessible": tc.is_super_admin_accessible,
                "created_at": tc.created_at,
                "created_by": tc.created_by,
                "updated_at": tc.updated_at,
                "updated_by": tc.updated_by,
            })
    return {"requirement": requirement, "user_stories": user_stories, "test_cases": test_cases}


@router.post("/interpret", response_model=InterpretResponse)
async def ai_interpret(
    body: InterpretRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InterpretResponse:
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="/",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="User not found.",
        )
    return interpret(db, user, body.user_text)


@router.post("/generate-story-and-tests")
async def ai_generate_story_and_tests(
    body: GenerateStoryAndTestsRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Generate user stories and test cases, persist to DB, return saved data. Super Admin only."""
    request_start = time.perf_counter()
    logger.info("Request received: generate-story-and-tests")

    try:
        if current_user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can use this endpoint.",
            )
        requirement = body.requirement
        requirement_hash = generate_requirement_hash(requirement)

        db_lookup_start = time.perf_counter()
        db_req = get_requirement_by_hash(db, requirement_hash)
        db_lookup_duration_ms = (time.perf_counter() - db_lookup_start) * 1000
        logger.info("Database lookup executed, duration_ms=%.2f", db_lookup_duration_ms)

        if db_req is not None:
            logger.info("Duplicate requirement detected, requirement_hash=%s", requirement_hash[:16])
            total_ms = (time.perf_counter() - request_start) * 1000
            logger.info("Request completed, duration_ms=%.2f, source=database", total_ms)
            return _saved_requirement_to_dict(db_req)

        cached = get_cached_response(requirement)
        if cached is not None:
            response.headers["X-Cache"] = "HIT"
            total_ms = (time.perf_counter() - request_start) * 1000
            logger.info("Request completed, duration_ms=%.2f, source=cache", total_ms)
            return cached

        response.headers["X-Cache"] = "MISS"
        result = generate_story_and_tests(body.requirement)
        cache_response(requirement, result)
        ai_response = AIResponse.model_validate(result)

        persist_start = time.perf_counter()
        db_req = save_ai_response(db, ai_response, requirement)
        persist_duration_ms = (time.perf_counter() - persist_start) * 1000
        logger.info("Persistence completed, duration_ms=%.2f", persist_duration_ms)

        total_ms = (time.perf_counter() - request_start) * 1000
        logger.info("Request completed, duration_ms=%.2f, source=generated", total_ms)
        return _saved_requirement_to_dict(db_req)

    except HTTPException:
        raise
    except Exception as e:
        total_ms = (time.perf_counter() - request_start) * 1000
        logger.exception("Unexpected exception in generate-story-and-tests: %s", e)
        logger.error("API failure: generate-story-and-tests, duration_ms=%.2f", total_ms)
        raise


@router.post("/save-story-and-tests")
async def ai_save_story_and_tests(
    body: AIResponse,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Persist AI-generated requirement, user stories, and test cases. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    save_ai_response(db, body)
    return {"status": "saved"}
