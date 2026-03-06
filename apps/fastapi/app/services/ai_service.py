from __future__ import annotations

import os
from typing import Any

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_openai import ChatOpenAI

from app.services.ai_models import AIResponse


def generate_story_and_tests(requirement: str) -> dict[str, Any]:
    parser = PydanticOutputParser(pydantic_object=AIResponse)
    format_instructions = parser.get_format_instructions()

    prompt = PromptTemplate.from_template(
        """You are a Senior Product Analyst and Senior QA Engineer.
Convert the following Requirement into User Stories and Test Cases.

Hierarchy: Requirement → UserStory → TestCase.

USER STORY RULES:
- Use standard Agile format.
- Include: title, prerequisite (list), story, acceptance_criteria (list).
- Clear, testable acceptance criteria.

TEST CASE RULES:
- Validate acceptance criteria.
- Include: test_case_id, scenario, pre_requisite (list), test_data (list or null), steps (list), expected_result.
- Clear step-by-step validation.
- Cover normal and edge scenarios.

For metadata use: tenant_id null, created_by "system", created_at as ISO datetime (e.g. 2025-03-04T12:00:00Z), is_super_admin_accessible true.
Do not generate database IDs; output only content fields.

Requirement:
{requirement}

{format_instructions}

Output only valid JSON, no explanation."""
    )

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        api_key=os.environ.get("OPENAI_API_KEY"),
        max_tokens=1200,
    )

    chain = prompt | llm | parser
    result: AIResponse = chain.invoke({"requirement": requirement, "format_instructions": format_instructions})
    return result.model_dump(mode="json")
