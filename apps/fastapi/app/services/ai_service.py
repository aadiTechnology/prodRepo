from __future__ import annotations

import os
import time
from typing import Any

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI

from app.core.logging_config import get_logger
from app.services.ai_models import AIResponse

logger = get_logger(__name__)


def generate_story_and_tests(requirement: str) -> dict[str, Any]:
    logger.info("AI generation started")
    start = time.perf_counter()

    parser = PydanticOutputParser(pydantic_object=AIResponse)
    format_instructions = parser.get_format_instructions()

    prompt = PromptTemplate.from_template(
        """Role: Product Analyst + QA. Task: User stories and test cases. JSON only, no explanation.

UserStory: title, prerequisite (list), story, acceptance_criteria (list).
TestCase: test_case_id, scenario, pre_requisite (list), test_data (list|null), steps (list), expected_result.

Requirement: {requirement}

{format_instructions}"""
    )

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=os.environ.get("OPENAI_API_KEY"),
        max_tokens=1200,
    )

    chain = prompt | llm | parser
    result: AIResponse = chain.invoke({"requirement": requirement, "format_instructions": format_instructions})
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI generation finished, duration_ms=%.2f", duration_ms)
    return result.model_dump(mode="json")
