"""
Story quality validation before task generation.
Validates structure, acceptance criteria coverage, scenario coverage, and ambiguity.
Extracts normalized scenarios for use in task generation.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any


VAGUE_TERMS = ("fast", "efficient", "easy", "secure")
MIN_ACCEPTANCE_CRITERIA = 2


def _has_story_structure(text: str) -> bool:
    """Check for 'As a ... I want ... so that ...' format (case-insensitive, flexible)."""
    if not text or not text.strip():
        return False
    t = text.strip().lower()
    return "as a" in t and "i want" in t and "so that" in t


def _normalize_to_scenario_id(text: str) -> str:
    """Convert a phrase to snake_case scenario identifier."""
    if not text or not text.strip():
        return ""
    s = text.strip().lower()
    s = re.sub(r"[^\w\s-]", " ", s)
    s = re.sub(r"[\s_-]+", " ", s)
    s = s.strip().replace(" ", "_")
    return s[:80] if s else ""


def _extract_scenario_candidates(text: str) -> list[str]:
    """From a sentence, yield candidate scenario names (e.g. 'payment success' -> payment_success)."""
    if not text or not text.strip():
        return []
    normalized = _normalize_to_scenario_id(text)
    if not normalized:
        return []
    return [normalized]


def _ac_list(ac: Any) -> list[str]:
    if ac is None:
        return []
    if isinstance(ac, list):
        return [str(x).strip() for x in ac if x and str(x).strip()]
    return [str(ac).strip()] if str(ac).strip() else []


def _test_cases_list(tcs: Any) -> list[dict[str, Any]]:
    if tcs is None:
        return []
    if isinstance(tcs, list):
        return [
            {"scenario": str(getattr(t, "scenario", t) if hasattr(t, "scenario") else t).strip()}
            for t in tcs
        ]
    return []


@dataclass
class ValidationCheck:
    name: str
    passed: bool
    message: str


@dataclass
class StoryQualityResult:
    quality_score: int
    validation_checks: list[dict[str, Any]] = field(default_factory=list)
    extracted_scenarios: list[str] = field(default_factory=list)
    improvement_suggestions: list[str] = field(default_factory=list)


def validate_story_quality(
    *,
    story_text: str,
    acceptance_criteria: Any,
    test_cases: Any,
) -> StoryQualityResult:
    """
    Validate story structure, AC coverage, scenario coverage, and ambiguity.
    Extract normalized scenarios from acceptance criteria and test cases.
    """
    checks: list[ValidationCheck] = []
    suggestions: list[str] = []
    ac_list = _ac_list(acceptance_criteria)
    tc_list = _test_cases_list(test_cases)

    # 1. Story structure: "As a ... I want ... so that ..."
    story_clean = (story_text or "").strip()
    structure_ok = _has_story_structure(story_clean)
    checks.append(
        ValidationCheck(
            name="story_structure",
            passed=structure_ok,
            message="Story should follow 'As a ... I want ... so that ...' format."
            if not structure_ok
            else "Story follows standard format.",
        )
    )
    if not structure_ok:
        suggestions.append("Rewrite the story in format: As a [role] I want [goal] so that [benefit].")

    # 2. Acceptance criteria: at least two
    ac_ok = len(ac_list) >= MIN_ACCEPTANCE_CRITERIA
    checks.append(
        ValidationCheck(
            name="acceptance_criteria_coverage",
            passed=ac_ok,
            message=f"At least {MIN_ACCEPTANCE_CRITERIA} acceptance criteria required (found {len(ac_list)})."
            if not ac_ok
            else f"Has {len(ac_list)} acceptance criteria.",
        )
    )
    if not ac_ok:
        suggestions.append(f"Add at least {MIN_ACCEPTANCE_CRITERIA - len(ac_list)} more acceptance criteria.")

    # 3. Scenario coverage: AC vs test cases
    tc_scenario_ids = set()
    for tc in tc_list:
        sc = (tc.get("scenario") or "").strip()
        if sc:
            tc_scenario_ids.add(_normalize_to_scenario_id(sc))
    ac_derived_ids = set()
    for ac in ac_list:
        for cand in _extract_scenario_candidates(ac):
            if cand:
                ac_derived_ids.add(cand)
    # Consider covered if each AC has some overlap with test scenarios or we have test scenarios
    missing_in_tests = ac_derived_ids - tc_scenario_ids if ac_derived_ids else set()
    coverage_ok = len(missing_in_tests) == 0 or len(tc_scenario_ids) >= len(ac_list)
    checks.append(
        ValidationCheck(
            name="scenario_coverage",
            passed=coverage_ok,
            message="Acceptance criteria should be reflected in test case scenarios."
            if not coverage_ok
            else "Test cases cover acceptance criteria scenarios.",
        )
    )
    if not coverage_ok and missing_in_tests:
        suggestions.append(
            f"Add test cases for scenarios: {', '.join(sorted(missing_in_tests)[:5])}"
            + ("..." if len(missing_in_tests) > 5 else "")
        )

    # 4. Ambiguity: vague terms without explanation
    combined_text = " ".join([story_clean] + ac_list).lower()
    found_vague = [t for t in VAGUE_TERMS if t in combined_text]
    ambiguity_ok = len(found_vague) == 0
    checks.append(
        ValidationCheck(
            name="ambiguity_detection",
            passed=ambiguity_ok,
            message=f"Avoid vague terms without explanation: {', '.join(found_vague)}."
            if found_vague
            else "No vague terms detected.",
        )
    )
    if found_vague:
        suggestions.append(
            f"Replace or qualify vague terms ({', '.join(found_vague)}) with measurable criteria."
        )

    # Quality score 0–100
    passed = sum(1 for c in checks if c.passed)
    quality_score = round((passed / len(checks)) * 100) if checks else 0

    # Extract normalized scenarios: from test cases first, then AC
    extracted = set()
    for tc in tc_list:
        sc = (tc.get("scenario") or "").strip()
        if sc:
            n = _normalize_to_scenario_id(sc)
            if n:
                extracted.add(n)
    for ac in ac_list:
        for cand in _extract_scenario_candidates(ac):
            if cand:
                extracted.add(cand)
    extracted_scenarios = sorted(extracted)

    return StoryQualityResult(
        quality_score=quality_score,
        validation_checks=[
            {"name": c.name, "passed": c.passed, "message": c.message}
            for c in checks
        ],
        extracted_scenarios=extracted_scenarios,
        improvement_suggestions=suggestions,
    )
