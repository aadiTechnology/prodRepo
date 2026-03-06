from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.ai_entities import Requirement, UserStory, TestCase
from app.services.ai_models import AIResponse


def _int_or_none(value: str | None) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def save_ai_response(db: Session, ai_response: AIResponse) -> Requirement:
    req = ai_response.requirement
    meta = req.metadata
    tenant_id = _int_or_none(meta.tenant_id or ai_response.tenant_id)
    created_by = _int_or_none(meta.created_by)

    db_req = Requirement(
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
    return db_req
