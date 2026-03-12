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
    RegeneratedTestCase,
    RegeneratedUserStory,
)

logger = get_logger(__name__)


def _build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=os.environ.get("OPENAI_API_KEY"),
        max_tokens=1200,
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
