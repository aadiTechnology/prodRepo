from __future__ import annotations

import os
import time
from typing import Any
import json

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI

from app.core.logging_config import get_logger
from app.services.ai_models import (
    AIResponse,
    DevelopmentTasksResponse,
    RegeneratedTestCase,
    RegeneratedUserStory,
    StoryQualityImprovementResult,
)

logger = get_logger(__name__)


def _build_llm(max_tokens: int = 1200) -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=os.environ.get("OPENAI_API_KEY"),
        max_tokens=max_tokens,
    )


def _invoke_structured_generation(
    *,
    prompt_text: str,
    parser: PydanticOutputParser,
    values: dict[str, Any],
) -> dict[str, Any]:
    prompt = PromptTemplate.from_template(prompt_text)
    chain = prompt | _build_llm() | parser
    result = chain.invoke({
        **values,
        "format_instructions": parser.get_format_instructions(),
    })
    return result.model_dump(mode="json")


def generate_story_and_tests(requirement: str) -> dict[str, Any]:
    logger.info("AI generation started")
    start = time.perf_counter()

    parser = PydanticOutputParser(pydantic_object=AIResponse)
    result = _invoke_structured_generation(
        prompt_text=
        """Role: Product Analyst + QA. Task: User stories and test cases. JSON only, no explanation.

UserStory: title, prerequisite (list), story, acceptance_criteria (list).
TestCase: test_case_id, scenario, pre_requisite (list), test_data (list|null), steps (list), expected_result.

Requirement: {requirement}

{format_instructions}""",
        parser=parser,
        values={"requirement": requirement},
    )
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI generation finished, duration_ms=%.2f", duration_ms)
    return result


def regenerate_user_story(
    *,
    requirement_title: str,
    requirement_description: str,
    current_story: dict[str, Any],
    feedback: str,
) -> dict[str, Any]:
    logger.info("AI user story regeneration started")
    start = time.perf_counter()
    parser = PydanticOutputParser(pydantic_object=RegeneratedUserStory)
    result = _invoke_structured_generation(
        prompt_text=
        """Role: Senior Product Analyst. Revise exactly one user story from reviewer feedback.

Return JSON only. Do not include explanations.

Requirement title: {requirement_title}
Requirement description: {requirement_description}
Current user story: {current_story}
Reviewer feedback: {feedback}

Keep the revised story aligned to the requirement while addressing the feedback.
Return these fields only:
- title
- prerequisite (list)
- story
- acceptance_criteria (list)

{format_instructions}""",
        parser=parser,
        values={
            "requirement_title": requirement_title,
            "requirement_description": requirement_description,
            "current_story": json.dumps(current_story),
            "feedback": feedback,
        },
    )
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI user story regeneration finished, duration_ms=%.2f", duration_ms)
    return result


def regenerate_test_case(
    *,
    requirement_title: str,
    requirement_description: str,
    current_story: dict[str, Any],
    current_test_case: dict[str, Any],
    feedback: str,
) -> dict[str, Any]:
    logger.info("AI test case regeneration started")
    start = time.perf_counter()
    parser = PydanticOutputParser(pydantic_object=RegeneratedTestCase)
    result = _invoke_structured_generation(
        prompt_text=
        """Role: Senior QA Analyst. Revise exactly one test case from reviewer feedback.

Return JSON only. Do not include explanations.

Requirement title: {requirement_title}
Requirement description: {requirement_description}
Related user story: {current_story}
Current test case: {current_test_case}
Reviewer feedback: {feedback}

Keep the revised test case aligned to the requirement and user story while addressing the feedback.
Return these fields only:
- test_case_id
- scenario
- pre_requisite (list)
- test_data (list|null)
- steps (list)
- expected_result

{format_instructions}""",
        parser=parser,
        values={
            "requirement_title": requirement_title,
            "requirement_description": requirement_description,
            "current_story": json.dumps(current_story),
            "current_test_case": json.dumps(current_test_case),
            "feedback": feedback,
        },
    )
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI test case regeneration finished, duration_ms=%.2f", duration_ms)
    return result


def improve_story_quality(
    *,
    requirement_title: str,
    requirement_description: str,
    story: dict[str, Any],
    existing_test_cases: list[dict[str, Any]],
    normalized_scenarios: list[str],
    missing_test_case_scenarios: list[str],
    validation_checks: list[dict[str, Any]],
    improvement_suggestions: list[str],
) -> dict[str, Any]:
    """
    Apply validation suggestions: fix ambiguity in story and/or add test cases for missing scenarios.
    Returns structured improvement (improvement_action, updated_story, new_test_cases, resolved_validation_issues).
    """
    logger.info("AI story quality improvement started")
    start = time.perf_counter()
    parser = PydanticOutputParser(pydantic_object=StoryQualityImprovementResult)
    result = _invoke_structured_generation(
        prompt_text="""Role: Product Analyst + QA. Apply story quality validation improvements only.

Rules (strict):
1. If validation reports ambiguity: improve story text by replacing vague terms with measurable system behaviour. Do not change AC or test cases.
2. If validation reports missing test case coverage: generate NEW test cases ONLY for the missing_scenarios listed. Use normalized scenario names. Do not modify story or AC.
3. If story structure is valid: do not modify the story.
4. If acceptance criteria are valid: do not modify acceptance criteria.
5. Never modify or remove existing test cases. Only append new test cases.
6. Do not generate duplicate scenarios or duplicate test cases.
7. Each new test case must have: test_case_id (unique, e.g. TC_new_1), scenario (from missing list), steps (list), expected_result.

Inputs:
Requirement title: {requirement_title}
Requirement description: {requirement_description}
Story: {story_json}
Existing test cases (do not modify): {existing_test_cases_json}
Normalized scenarios: {normalized_scenarios}
Missing test case scenarios (generate test cases for these): {missing_test_case_scenarios}
Validation checks: {validation_checks_json}
Improvement suggestions: {improvement_suggestions_json}

Choose improvement_action:
- no_change: if nothing to do or validation passed
- update_story: only fix ambiguity in story text (keep title, prerequisite, acceptance_criteria unchanged)
- add_test_cases: only add new test cases for missing scenarios (do not change story)
- update_story_and_add_tests: fix ambiguity AND add new test cases

When update_story or update_story_and_add_tests: set updated_story to the improved story TEXT only (single string).
When add_test_cases or update_story_and_add_tests: set new_test_cases to list of new test cases (test_case_id, scenario, pre_requisite, test_data, steps, expected_result).
Always set resolved_validation_issues to the list of validation problems you fixed (e.g. "ambiguity_detection", "scenario_coverage").

{format_instructions}""",
        parser=parser,
        values={
            "requirement_title": requirement_title,
            "requirement_description": requirement_description,
            "story_json": json.dumps(story),
            "existing_test_cases_json": json.dumps(existing_test_cases),
            "normalized_scenarios": json.dumps(normalized_scenarios),
            "missing_test_case_scenarios": json.dumps(missing_test_case_scenarios),
            "validation_checks_json": json.dumps(validation_checks),
            "improvement_suggestions_json": json.dumps(improvement_suggestions),
        },
    )
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI story quality improvement finished, duration_ms=%.2f", duration_ms)
    return result


def generate_development_tasks(
    *,
    requirement_title: str,
    requirement_description: str,
    story: dict[str, Any],
    acceptance_criteria: list[str],
    test_cases: list[dict[str, Any]],
    normalized_scenarios: list[str],
    quality_score: int,
) -> dict[str, Any]:
    """
    Generate developer implementation tasks from an approved user story.
    Tasks are grouped by frontend, backend, database, testing; 3–5 per category.
    Scenario-driven: normalized scenarios trigger tasks; avoid duplicates.
    Each task has title, description, related_scenario, component, priority, estimated_effort.
    """
    logger.info("AI development task generation started")
    start = time.perf_counter()
    parser = PydanticOutputParser(pydantic_object=DevelopmentTasksResponse)
    prompt = PromptTemplate.from_template(
        """Role: Senior Developer / Tech Lead. Generate actionable development tasks from a validated user story.

Architecture (follow strictly):
- Frontend: React + TypeScript. Components: React component, React hook, API service.
- Backend: FastAPI. Components: FastAPI controller, service layer, middleware.
- Database: SQL Server. Components: SQL table, migration.
- Testing: API test, integration test, UI test.

Rules:
1. Use the normalized scenarios as task triggers. A scenario may generate tasks across frontend, backend, and testing.
2. Map every task to a related_scenario (use normalized scenario id) or to an acceptance criterion.
3. Generate 3–5 tasks per category (frontend_tasks, backend_tasks, database_tasks, testing_tasks). Omit a category if not needed.
4. Avoid duplicate tasks (same intent in same layer).
5. Each task must have: title, description, related_scenario, component, priority, estimated_effort.
6. component must be one of: React component, React hook, API service, FastAPI controller, service layer, middleware, SQL table, migration, API test, integration test, UI test (or very similar).
7. priority: high, medium, or low. estimated_effort: e.g. "1h", "2h", "0.5d", "1d".

Inputs:
Requirement title: {requirement_title}
Requirement description: {requirement_description}
Story: {story_json}
Acceptance criteria: {acceptance_criteria_json}
Test cases (scenario, steps, expected_result): {test_cases_json}
Normalized scenarios (use these as related_scenario where applicable): {normalized_scenarios}
Quality score: {quality_score}%

Output: JSON only. frontend_tasks, backend_tasks, database_tasks, testing_tasks. Each task: title, description, related_scenario, component, priority, estimated_effort.

{format_instructions}"""
    )
    chain = prompt | _build_llm(max_tokens=2400) | parser
    result = chain.invoke({
        "requirement_title": requirement_title,
        "requirement_description": requirement_description,
        "story_json": json.dumps(story),
        "acceptance_criteria_json": json.dumps(acceptance_criteria),
        "test_cases_json": json.dumps(test_cases),
        "normalized_scenarios": json.dumps(normalized_scenarios),
        "quality_score": quality_score,
        "format_instructions": parser.get_format_instructions(),
    })
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI development task generation finished, duration_ms=%.2f", duration_ms)
    return result.model_dump(mode="json")
