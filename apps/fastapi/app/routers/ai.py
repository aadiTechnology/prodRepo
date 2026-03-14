import time

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.core.logging_config import get_logger
from app.models.user import User, UserRole
from app.schemas.ai import (
    InterpretRequest,
    InterpretResponse,
    GenerateStoryAndTestsRequest,
    RejectArtifactRequest,
    UpdateUserStoryRequest,
    UpdateTestCaseRequest,
    RegenerateArtifactRequest,
)
from app.services.intent_service import interpret
from app.services.ai_service import (
    generate_story_and_tests,
    regenerate_user_story,
    regenerate_test_case,
)
from app.services.cache_service import get_cached_response, cache_response, generate_requirement_hash
from app.services.ai_persistence_service import (
    save_ai_response,
    get_requirement_by_hash,
    get_draft_artifacts,
    approve_user_story as service_approve_user_story,
    reject_user_story as service_reject_user_story,
    approve_test_case as service_approve_test_case,
    reject_test_case as service_reject_test_case,
    update_user_story_content,
    update_test_case_content,
    get_user_story,
    get_test_case,
)
from app.services.story_quality_service import (
    validate_story_quality,
    StoryQualityResult,
)
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
            "review_status": getattr(us, "review_status", "draft"),
            "rejection_reason": getattr(us, "rejection_reason", None),
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
                "review_status": getattr(tc, "review_status", "draft"),
                "rejection_reason": getattr(tc, "rejection_reason", None),
                "tenant_id": tc.tenant_id,
                "is_super_admin_accessible": tc.is_super_admin_accessible,
                "created_at": tc.created_at,
                "created_by": tc.created_by,
                "updated_at": tc.updated_at,
                "updated_by": tc.updated_by,
            })
    return {"requirement": requirement, "user_stories": user_stories, "test_cases": test_cases}


def _serialize_user_story(us) -> dict:
    return {
        "id": us.id,
        "requirement_id": us.requirement_id,
        "title": us.title,
        "prerequisite": us.prerequisite,
        "story": us.story,
        "acceptance_criteria": us.acceptance_criteria,
        "review_status": us.review_status,
        "rejection_reason": getattr(us, "rejection_reason", None),
        "tenant_id": us.tenant_id,
        "is_super_admin_accessible": us.is_super_admin_accessible,
        "created_at": us.created_at,
        "created_by": us.created_by,
        "updated_at": us.updated_at,
        "updated_by": us.updated_by,
    }


def _serialize_test_case(tc) -> dict:
    return {
        "id": tc.id,
        "user_story_id": tc.user_story_id,
        "test_case_id": tc.test_case_id,
        "scenario": tc.scenario,
        "pre_requisite": tc.pre_requisite,
        "test_data": tc.test_data,
        "steps": tc.steps,
        "expected_result": tc.expected_result,
        "review_status": tc.review_status,
        "rejection_reason": getattr(tc, "rejection_reason", None),
        "tenant_id": tc.tenant_id,
        "is_super_admin_accessible": tc.is_super_admin_accessible,
        "created_at": tc.created_at,
        "created_by": tc.created_by,
        "updated_at": tc.updated_at,
        "updated_by": tc.updated_by,
    }


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


@router.get("/drafts")
async def get_drafts(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Retrieve review artifacts with non-approved stories or test cases. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    requirements = get_draft_artifacts(db)
    return {"items": [_saved_requirement_to_dict(r) for r in requirements]}


@router.get("/user-stories/{user_story_id}/quality-validation")
async def get_story_quality_validation(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Run story quality validation for an approved or draft story. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    result: StoryQualityResult = validate_story_quality(
        story_text=us.story or "",
        acceptance_criteria=us.acceptance_criteria,
        test_cases=[{"scenario": tc.scenario or ""} for tc in (us.test_cases or [])],
    )
    return {
        "quality_score": result.quality_score,
        "validation_checks": result.validation_checks,
        "extracted_scenarios": result.extracted_scenarios,
        "improvement_suggestions": result.improvement_suggestions,
    }


@router.patch("/user-stories/{user_story_id}/approve")
async def approve_user_story(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Approve a user story. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = service_approve_user_story(db, user_story_id, updated_by=current_user.id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    return {"id": us.id, "review_status": us.review_status}


@router.patch("/user-stories/{user_story_id}/reject")
async def reject_user_story(
    user_story_id: int,
    body: RejectArtifactRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Reject a user story. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = service_reject_user_story(
        db,
        user_story_id,
        reason=body.reason,
        updated_by=current_user.id,
    )
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    return {"id": us.id, "review_status": us.review_status, "rejection_reason": us.rejection_reason}


@router.patch("/user-stories/{user_story_id}")
async def update_user_story(
    user_story_id: int,
    body: UpdateUserStoryRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Update a user story and reset it to draft. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = update_user_story_content(
        db,
        user_story_id,
        title=body.title,
        prerequisite=body.prerequisite,
        story=body.story,
        acceptance_criteria=body.acceptance_criteria,
        updated_by=current_user.id,
    )
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    return _serialize_user_story(us)


@router.post("/user-stories/{user_story_id}/regenerate")
async def regenerate_user_story_artifact(
    user_story_id: int,
    body: RegenerateArtifactRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Regenerate a user story from reviewer feedback and reset it to draft. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")

    regenerated = regenerate_user_story(
        requirement_title=us.requirement.title,
        requirement_description=us.requirement.description,
        current_story={
            "title": us.title,
            "prerequisite": us.prerequisite or [],
            "story": us.story,
            "acceptance_criteria": us.acceptance_criteria or [],
        },
        feedback=body.feedback,
    )
    updated = update_user_story_content(
        db,
        user_story_id,
        title=regenerated["title"],
        prerequisite=regenerated["prerequisite"],
        story=regenerated["story"],
        acceptance_criteria=regenerated["acceptance_criteria"],
        updated_by=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    return _serialize_user_story(updated)


@router.patch("/test-cases/{test_case_id}/approve")
async def approve_test_case(
    test_case_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Approve a test case. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    tc = service_approve_test_case(db, test_case_id, updated_by=current_user.id)
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
    return {"id": tc.id, "review_status": tc.review_status}


@router.patch("/test-cases/{test_case_id}/reject")
async def reject_test_case(
    test_case_id: int,
    body: RejectArtifactRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Reject a test case. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    tc = service_reject_test_case(
        db,
        test_case_id,
        reason=body.reason,
        updated_by=current_user.id,
    )
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
    return {"id": tc.id, "review_status": tc.review_status, "rejection_reason": tc.rejection_reason}


@router.patch("/test-cases/{test_case_id}")
async def update_test_case(
    test_case_id: int,
    body: UpdateTestCaseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Update a test case and reset it to draft. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    tc = update_test_case_content(
        db,
        test_case_id,
        artifact_test_case_id=body.test_case_id,
        scenario=body.scenario,
        pre_requisite=body.pre_requisite,
        test_data=body.test_data,
        steps=body.steps,
        expected_result=body.expected_result,
        updated_by=current_user.id,
    )
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
    return _serialize_test_case(tc)


@router.post("/test-cases/{test_case_id}/regenerate")
async def regenerate_test_case_artifact(
    test_case_id: int,
    body: RegenerateArtifactRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Regenerate a test case from reviewer feedback and reset it to draft. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    tc = get_test_case(db, test_case_id)
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")

    story = tc.user_story
    regenerated = regenerate_test_case(
        requirement_title=story.requirement.title,
        requirement_description=story.requirement.description,
        current_story={
            "title": story.title,
            "prerequisite": story.prerequisite or [],
            "story": story.story,
            "acceptance_criteria": story.acceptance_criteria or [],
        },
        current_test_case={
            "test_case_id": tc.test_case_id,
            "scenario": tc.scenario,
            "pre_requisite": tc.pre_requisite or [],
            "test_data": tc.test_data,
            "steps": tc.steps or [],
            "expected_result": tc.expected_result,
        },
        feedback=body.feedback,
    )
    updated = update_test_case_content(
        db,
        test_case_id,
        artifact_test_case_id=regenerated["test_case_id"],
        scenario=regenerated["scenario"],
        pre_requisite=regenerated["pre_requisite"],
        test_data=regenerated["test_data"],
        steps=regenerated["steps"],
        expected_result=regenerated["expected_result"],
        updated_by=current_user.id,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found.")
    return _serialize_test_case(updated)
