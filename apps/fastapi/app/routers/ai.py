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
    DataModelExtractionRequest,
    SchemaGenerationRequest,
    FileMappingRequest,
    SkeletonGenerationRequest,
)
from app.services.intent_service import interpret
from app.services.ai_service import (
    generate_story_and_tests,
    generate_development_tasks,
    generate_api_contract_for_task,
    extract_data_models_from_api_contract,
    regenerate_user_story,
    regenerate_test_case,
    improve_story_quality,
)
from app.services.cache_service import get_cached_response, cache_response, generate_requirement_hash
from app.services.schema_generation_service import generate_schema_for_models
from app.services.file_mapping_service import generate_file_mapping
from app.services.skeleton_generation_service import generate_skeleton
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
    add_test_cases_to_story,
    get_user_story,
    get_test_case,
    check_development_tasks_for_story,
    get_development_task_for_story,
    get_development_tasks_by_story,
    save_development_tasks,
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
        "normalized_scenarios": result.normalized_scenarios,
        "missing_test_case_scenarios": result.missing_test_case_scenarios,
        "improvement_suggestions": result.improvement_suggestions,
    }


def _has_any_tasks(tasks_by_category: dict) -> bool:
    for v in tasks_by_category.values():
        if v:
            return True
    return False


@router.get("/user-stories/{user_story_id}/tasks/check")
async def check_story_tasks(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Return whether tasks exist for the story and total count. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    tasks_exist, task_count = check_development_tasks_for_story(db, user_story_id)
    return {"tasks_exist": tasks_exist, "task_count": task_count}


@router.get("/user-stories/{user_story_id}/tasks")
async def get_story_development_tasks(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Get development tasks for a story. Returns grouped tasks or empty groups. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    return get_development_tasks_by_story(db, user_story_id)


@router.post("/user-stories/{user_story_id}/tasks")
async def generate_or_get_development_tasks(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Duplicate protection: if tasks already exist for story_id, return them.
    Otherwise generate via AI, assign task IDs, persist, return stored tasks.
    Super Admin only. Story must be approved.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    if getattr(us, "review_status", "draft") != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Story must be approved before generating development tasks.",
        )

    existing = get_development_tasks_by_story(db, user_story_id)
    if _has_any_tasks(existing):
        return existing

    validation: StoryQualityResult = validate_story_quality(
        story_text=us.story or "",
        acceptance_criteria=us.acceptance_criteria,
        test_cases=[{"scenario": tc.scenario or ""} for tc in (us.test_cases or [])],
    )
    req = us.requirement
    story_dict = {
        "title": us.title,
        "prerequisite": us.prerequisite or [],
        "story": us.story or "",
        "acceptance_criteria": us.acceptance_criteria or [],
    }
    acceptance_criteria_list = us.acceptance_criteria if isinstance(us.acceptance_criteria, list) else []
    test_cases_payload = [
        {
            "scenario": tc.scenario,
            "steps": tc.steps or [],
            "expected_result": tc.expected_result or "",
        }
        for tc in (us.test_cases or [])
    ]

    ai_result = generate_development_tasks(
        requirement_title=req.title,
        requirement_description=req.description or "",
        story=story_dict,
        acceptance_criteria=acceptance_criteria_list,
        test_cases=test_cases_payload,
        normalized_scenarios=validation.normalized_scenarios,
        quality_score=validation.quality_score,
    )
    stored = save_development_tasks(
        db,
        user_story_id,
        ai_result,
        tenant_id=us.tenant_id,
        created_by=current_user.id,
    )
    return stored


@router.post("/user-stories/{user_story_id}/tasks/{task_id}/api-contract")
async def generate_task_api_contract(
    user_story_id: int,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Generate a structured REST API contract for a backend development task.
    Only backend tasks are supported. Returns endpoint, method, description,
    request_schema, response_schema, status_codes.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    task = get_development_task_for_story(db, user_story_id, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Development task not found.")
    if task.category != "backend":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API contract can only be generated for backend tasks.",
        )
    acceptance_criteria = us.acceptance_criteria if isinstance(us.acceptance_criteria, list) else []
    test_cases_payload = [
        {
            "scenario": tc.scenario or "",
            "steps": tc.steps or [],
            "expected_result": tc.expected_result or "",
        }
        for tc in (us.test_cases or [])
    ]
    contract = generate_api_contract_for_task(
        task_id=task.task_id,
        task_title=task.title or "",
        task_description=task.description or "",
        related_scenario=task.related_scenario or "",
        acceptance_criteria=acceptance_criteria,
        test_cases=test_cases_payload,
    )
    return contract


@router.post("/user-stories/{user_story_id}/tasks/{task_id}/data-models")
async def extract_task_data_models(
    user_story_id: int,
    task_id: str,
    body: DataModelExtractionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Extract backend data models from an API contract.
    Returns normalized SQLAlchemy-style models (id, created_at, and fields from request/response schema).
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")
    task = get_development_task_for_story(db, user_story_id, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Development task not found.")
    api_contract = {
        "endpoint": body.api_contract.endpoint,
        "method": body.api_contract.method,
        "request_schema": body.api_contract.request_schema,
        "response_schema": body.api_contract.response_schema,
    }
    return extract_data_models_from_api_contract(
        task_id=task.task_id,
        api_contract=api_contract,
    )


@router.post("/generate-schema")
async def generate_schema(
    body: SchemaGenerationRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Generate SQLAlchemy ORM model files and Alembic migrations from extracted data models.
    Writes app/models/<table>.py and alembic/versions/create_<table>_table_*.py.
    Skips models whose table already exists. Returns paths for each generated file.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    models_payload = [{"model_name": m.model_name, "fields": m.fields} for m in body.models]
    return generate_schema_for_models(
        task_id=body.task_id,
        models=models_payload,
        write_files=True,
    )


@router.post("/file-mapping")
async def get_file_mapping(
    body: FileMappingRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Determine backend files required to implement a task from API contract and data models.
    Returns paths for controller, service, repository, schema, model, and test files per entity.
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    api_contract = body.api_contract or {}
    models_payload = [{"model_name": m.model_name} for m in body.models]
    return generate_file_mapping(
        task_id=body.task_id,
        task_title=body.task_title or "",
        api_contract=api_contract,
        models=models_payload,
    )


@router.post("/code-skeleton")
async def get_code_skeleton(
    body: SkeletonGenerationRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Generate minimal code skeletons for backend files using API contract, data models, and file mapping.
    Returns path and code for each file (controller, service, repository, schema, test).
    """
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    api_contract = body.api_contract or {}
    models_payload = [{"model_name": m.model_name} for m in body.models]
    return generate_skeleton(
        task_id=body.task_id,
        task_title=body.task_title or "",
        api_contract=api_contract,
        models=models_payload,
        files=body.files,
    )


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


@router.post("/user-stories/{user_story_id}/improve-from-quality")
async def improve_user_story_from_quality(
    user_story_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Apply story quality validation improvements: fix ambiguity and/or add test cases for missing scenarios. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    us = get_user_story(db, user_story_id)
    if not us:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User story not found.")

    from app.services.story_quality_service import validate_story_quality, StoryQualityResult

    validation: StoryQualityResult = validate_story_quality(
        story_text=us.story or "",
        acceptance_criteria=us.acceptance_criteria,
        test_cases=[{"scenario": tc.scenario or ""} for tc in (us.test_cases or [])],
    )

    if validation.quality_score >= 100 and not validation.improvement_suggestions:
        return {
            "improvement_action": "no_change",
            "updated_story": None,
            "new_test_cases": [],
            "resolved_validation_issues": [],
            "validation": {
                "quality_score": validation.quality_score,
                "validation_checks": validation.validation_checks,
                "normalized_scenarios": validation.normalized_scenarios,
                "missing_test_case_scenarios": validation.missing_test_case_scenarios,
                "improvement_suggestions": validation.improvement_suggestions,
            },
        }

    req = us.requirement
    existing_tc = [
        {
            "test_case_id": tc.test_case_id,
            "scenario": tc.scenario,
            "pre_requisite": tc.pre_requisite or [],
            "test_data": tc.test_data,
            "steps": tc.steps or [],
            "expected_result": tc.expected_result,
        }
        for tc in (us.test_cases or [])
    ]
    story_dict = {
        "title": us.title,
        "prerequisite": us.prerequisite or [],
        "story": us.story or "",
        "acceptance_criteria": us.acceptance_criteria or [],
    }

    result = improve_story_quality(
        requirement_title=req.title,
        requirement_description=req.description or "",
        story=story_dict,
        existing_test_cases=existing_tc,
        normalized_scenarios=validation.normalized_scenarios,
        missing_test_case_scenarios=validation.missing_test_case_scenarios,
        validation_checks=validation.validation_checks,
        improvement_suggestions=validation.improvement_suggestions,
    )

    action = result.get("improvement_action", "no_change")
    updated_story_text = result.get("updated_story")
    new_test_cases_payload = result.get("new_test_cases") or []
    resolved = result.get("resolved_validation_issues") or []

    updated_us = None
    if action in ("update_story", "update_story_and_add_tests") and updated_story_text:
        updated_us = update_user_story_content(
            db,
            user_story_id,
            title=us.title,
            prerequisite=us.prerequisite or [],
            story=updated_story_text.strip(),
            acceptance_criteria=us.acceptance_criteria or [],
            updated_by=current_user.id,
        )

    added_tc = []
    if action in ("add_test_cases", "update_story_and_add_tests") and new_test_cases_payload:
        added_tc = add_test_cases_to_story(
            db, user_story_id, new_test_cases_payload, created_by=current_user.id
        )

    # Re-run validation after applying changes so the frontend can update the Story Quality panel immediately
    us_after = get_user_story(db, user_story_id)
    validation_after: StoryQualityResult = validate_story_quality(
        story_text=us_after.story or "",
        acceptance_criteria=us_after.acceptance_criteria,
        test_cases=[{"scenario": tc.scenario or ""} for tc in (us_after.test_cases or [])],
    )
    validation_payload = {
        "quality_score": validation_after.quality_score,
        "validation_checks": validation_after.validation_checks,
        "normalized_scenarios": validation_after.normalized_scenarios,
        "missing_test_case_scenarios": validation_after.missing_test_case_scenarios,
        "improvement_suggestions": validation_after.improvement_suggestions,
    }

    return {
        "improvement_action": action,
        "updated_story": _serialize_user_story(updated_us) if updated_us else None,
        "new_test_cases": [_serialize_test_case(t) for t in added_tc],
        "resolved_validation_issues": resolved,
        "validation": validation_payload,
    }


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
