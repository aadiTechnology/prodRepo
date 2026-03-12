from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.core.logging_config import get_logger
from app.models.ai_entities import (
    Requirement,
    UserStory,
    TestCase,
    REVIEW_STATUS_DRAFT,
    REVIEW_STATUS_APPROVED,
    REVIEW_STATUS_REJECTED,
)
from app.services.ai_models import AIResponse
from app.services.cache_service import generate_requirement_hash

logger = get_logger(__name__)


def _int_or_none(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def get_requirement_by_hash(db: Session, requirement_hash: str) -> Requirement | None:
    return (
        db.query(Requirement)
        .options(
            joinedload(Requirement.user_stories).joinedload(UserStory.test_cases),
        )
        .filter(Requirement.requirement_hash == requirement_hash)
        .first()
    )


def save_ai_response(db: Session, ai_response: AIResponse, requirement_text: str | None = None) -> Requirement:
    req = ai_response.requirement
    meta = req.metadata
    tenant_id = _int_or_none(meta.tenant_id or ai_response.tenant_id)
    created_by = _int_or_none(meta.created_by)

    db_req = Requirement(
        requirement_hash=generate_requirement_hash(requirement_text) if requirement_text else None,
        title=req.title,
        description=req.description,
        tenant_id=tenant_id,
        is_super_admin_accessible=meta.is_super_admin_accessible,
        created_by=created_by,
    )
    db.add(db_req)
    db.flush()

    saved_user_stories: list[UserStory] = []
    for us in ai_response.user_stories:
        us_meta = us.metadata
        db_us = UserStory(
            requirement_id=db_req.id,
            title=us.title,
            prerequisite=us.prerequisite if us.prerequisite else None,
            story=us.story,
            acceptance_criteria=us.acceptance_criteria if us.acceptance_criteria else None,
            review_status=REVIEW_STATUS_DRAFT,
            tenant_id=_int_or_none(us_meta.tenant_id or ai_response.tenant_id),
            is_super_admin_accessible=us_meta.is_super_admin_accessible,
            created_by=_int_or_none(us_meta.created_by),
        )
        db.add(db_us)
        db.flush()
        saved_user_stories.append(db_us)

    for i, tc in enumerate(ai_response.test_cases):
        db_us = saved_user_stories[i % len(saved_user_stories)] if saved_user_stories else None
        if db_us is None:
            continue
        tc_meta = tc.metadata
        db_tc = TestCase(
            user_story_id=db_us.id,
            test_case_id=tc.test_case_id,
            scenario=tc.scenario,
            pre_requisite=tc.pre_requisite if tc.pre_requisite else None,
            test_data=tc.test_data,
            steps=tc.steps if tc.steps else None,
            expected_result=tc.expected_result,
            review_status=REVIEW_STATUS_DRAFT,
            tenant_id=_int_or_none(tc_meta.tenant_id or ai_response.tenant_id),
            is_super_admin_accessible=tc_meta.is_super_admin_accessible,
            created_by=_int_or_none(tc_meta.created_by),
        )
        db.add(db_tc)

    db.commit()
    db.refresh(db_req)
    _ = db_req.user_stories
    for us in db_req.user_stories:
        _ = us.test_cases
    logger.info("Persistence completed")
    return db_req


def get_draft_artifacts(db: Session) -> list[Requirement]:
    """Return requirements that have at least one user_story or test_case pending review."""
    sub_q = (
        db.query(Requirement.id)
        .join(UserStory, UserStory.requirement_id == Requirement.id)
        .filter(UserStory.review_status != REVIEW_STATUS_APPROVED)
    )
    sub_tc = (
        db.query(Requirement.id)
        .join(UserStory, UserStory.requirement_id == Requirement.id)
        .join(TestCase, TestCase.user_story_id == UserStory.id)
        .filter(TestCase.review_status != REVIEW_STATUS_APPROVED)
    )
    requirement_ids = set(sub_q.all()) | set(sub_tc.all())
    ids = [r[0] for r in requirement_ids]
    if not ids:
        return []
    return (
        db.query(Requirement)
        .options(
            joinedload(Requirement.user_stories).joinedload(UserStory.test_cases),
        )
        .filter(Requirement.id.in_(ids))
        .order_by(Requirement.created_at.desc())
        .all()
    )


def get_user_story(db: Session, user_story_id: int) -> UserStory | None:
    return (
        db.query(UserStory)
        .options(
            joinedload(UserStory.requirement),
            joinedload(UserStory.test_cases),
        )
        .filter(UserStory.id == user_story_id)
        .first()
    )


def get_test_case(db: Session, test_case_id: int) -> TestCase | None:
    return (
        db.query(TestCase)
        .options(
            joinedload(TestCase.user_story).joinedload(UserStory.requirement),
        )
        .filter(TestCase.id == test_case_id)
        .first()
    )


def _reset_to_draft(entity: UserStory | TestCase, updated_by: int | None = None) -> None:
    entity.review_status = REVIEW_STATUS_DRAFT
    entity.rejection_reason = None
    entity.updated_by = updated_by
    entity.updated_at = datetime.utcnow()


def approve_user_story(db: Session, user_story_id: int, updated_by: int | None = None) -> UserStory | None:
    us = get_user_story(db, user_story_id)
    if not us:
        return None
    us.review_status = REVIEW_STATUS_APPROVED
    us.rejection_reason = None
    us.updated_by = updated_by
    us.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(us)
    return us


def reject_user_story(
    db: Session,
    user_story_id: int,
    reason: str,
    updated_by: int | None = None,
) -> UserStory | None:
    us = get_user_story(db, user_story_id)
    if not us:
        return None
    us.review_status = REVIEW_STATUS_REJECTED
    us.rejection_reason = reason.strip()
    us.updated_by = updated_by
    us.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(us)
    return us


def approve_test_case(db: Session, test_case_id: int, updated_by: int | None = None) -> TestCase | None:
    tc = get_test_case(db, test_case_id)
    if not tc:
        return None
    tc.review_status = REVIEW_STATUS_APPROVED
    tc.rejection_reason = None
    tc.updated_by = updated_by
    tc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tc)
    return tc


def reject_test_case(
    db: Session,
    test_case_id: int,
    reason: str,
    updated_by: int | None = None,
) -> TestCase | None:
    tc = get_test_case(db, test_case_id)
    if not tc:
        return None
    tc.review_status = REVIEW_STATUS_REJECTED
    tc.rejection_reason = reason.strip()
    tc.updated_by = updated_by
    tc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tc)
    return tc


def update_user_story_content(
    db: Session,
    user_story_id: int,
    *,
    title: str,
    prerequisite: list[str],
    story: str,
    acceptance_criteria: list[str],
    updated_by: int | None = None,
) -> UserStory | None:
    us = get_user_story(db, user_story_id)
    if not us:
        return None
    us.title = title.strip()
    us.prerequisite = prerequisite if prerequisite else None
    us.story = story.strip()
    us.acceptance_criteria = acceptance_criteria if acceptance_criteria else None
    _reset_to_draft(us, updated_by=updated_by)
    db.commit()
    db.refresh(us)
    return us


def update_test_case_content(
    db: Session,
    test_case_id: int,
    *,
    artifact_test_case_id: str,
    scenario: str,
    pre_requisite: list[str],
    test_data: list[str] | None,
    steps: list[str],
    expected_result: str,
    updated_by: int | None = None,
) -> TestCase | None:
    tc = get_test_case(db, test_case_id)
    if not tc:
        return None
    tc.test_case_id = artifact_test_case_id.strip()
    tc.scenario = scenario.strip()
    tc.pre_requisite = pre_requisite if pre_requisite else None
    tc.test_data = test_data if test_data else None
    tc.steps = steps if steps else None
    tc.expected_result = expected_result.strip()
    _reset_to_draft(tc, updated_by=updated_by)
    db.commit()
    db.refresh(tc)
    return tc
