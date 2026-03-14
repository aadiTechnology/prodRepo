"""
Story quality validation before task generation.
Validates structure, acceptance criteria coverage, scenario coverage, and ambiguity.
Extracts normalized scenarios (canonical identifiers) and detects missing test coverage.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

VAGUE_TERMS = ("secure", "fast", "efficient", "easy", "robust")
MIN_ACCEPTANCE_CRITERIA = 2
WEIGHT_STORY_STRUCTURE = 20
WEIGHT_ACCEPTANCE_CRITERIA = 20
WEIGHT_SCENARIO_COVERAGE = 40
WEIGHT_AMBIGUITY = 20
SCENARIO_PREFIXES = ("test_case_", "scenario_")
MAX_SCENARIO_LENGTH = 60


def _has_story_structure(text: str) -> bool:
    """Check for 'As a ... I want ... so that ...' format (case-insensitive, flexible)."""
    if not text or not text.strip():
        return False
    t = text.strip().lower()
    return "as a" in t and "i want" in t and "so that" in t


def _to_snake(text: str) -> str:
    """Convert to snake_case and collapse duplicate wording."""
    if not text or not text.strip():
        return ""
    s = text.strip().lower()
    s = re.sub(r"[^\w\s-]", " ", s)
    s = re.sub(r"[\s_-]+", " ", s)
    parts = s.strip().split()
    # Remove consecutive duplicates
    seen = set()
    unique = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return "_".join(unique) if unique else ""


def _strip_scenario_prefixes(raw: str) -> str:
    """Remove test_case_, scenario_ and similar prefixes."""
    s = raw.strip().lower()
    for prefix in SCENARIO_PREFIXES:
        if s.startswith(prefix):
            s = s[len(prefix) :].strip("_")
    return s


def _shorten_action_based(raw: str) -> str:
    """Prefer concise action-based name; drop redundant suffixes."""
    s = raw.strip("_")
    # Optional: drop trailing _successfully, _correctly when we have an action
    for suffix in ("_successfully", "_correctly", "_properly"):
        if s.endswith(suffix) and len(s) > len(suffix):
            s = s[: -len(suffix)]
    return s[:MAX_SCENARIO_LENGTH] if s else ""


def _normalize_to_canonical_id(text: str) -> str:
    """
    Produce a short canonical scenario identifier.
    - Convert to snake_case, remove prefixes (test_case_, scenario_), dedupe words, shorten.
    """
    if not text or not text.strip():
        return ""
    raw = _to_snake(text)
    raw = _strip_scenario_prefixes(raw)
    raw = _shorten_action_based(raw)
    return raw if raw else ""


def _scenario_stem(canonical_id: str) -> str:
    """Stem for grouping similar scenarios (e.g. user_logout, user_logs_out -> same group)."""
    if not canonical_id:
        return ""
    parts = canonical_id.split("_")
    if len(parts) <= 2:
        return canonical_id
    # Prefer last part (action) + first part (actor) for grouping
    return "_".join([parts[0], parts[-1]]) if parts else ""


def _extract_canonical_from_phrase(phrase: str) -> str:
    """From one acceptance criterion or test scenario phrase, get one canonical id."""
    return _normalize_to_canonical_id(phrase)


def _deduplicate_canonicals(
    ac_ids: list[str], tc_ids: list[str]
) -> tuple[list[str], list[str], set[str]]:
    """
    Merge duplicate scenarios into one canonical per group.
    Returns (normalized_scenarios, missing_test_case_scenarios, tc_canonical_set).
    - normalized_scenarios: sorted unique canonical ids (one per logical scenario).
    - missing_test_case_scenarios: canonical ids that come from AC but have no TC coverage.
    - tc_canonical_set: set of canonical ids that are covered by test cases.
    """
    # Group by stem: stem -> list of (canonical_id, source: 'ac'|'tc')
    groups: dict[str, list[tuple[str, str]]] = {}
    for cid in ac_ids:
        if not cid:
            continue
        stem = _scenario_stem(cid)
        if stem not in groups:
            groups[stem] = []
        groups[stem].append((cid, "ac"))
    for cid in tc_ids:
        if not cid:
            continue
        stem = _scenario_stem(cid)
        if stem not in groups:
            groups[stem] = []
        groups[stem].append((cid, "tc"))

    normalized: list[str] = []
    missing: list[str] = []
    tc_covered_stems: set[str] = set()

    for stem, pairs in groups.items():
        # Pick one canonical id for this group (shortest action-based)
        canonical_ids = list({p[0] for p in pairs})
        chosen = min(canonical_ids, key=lambda x: (len(x), x))
        normalized.append(chosen)

        has_ac = any(s == "ac" for _, s in pairs)
        has_tc = any(s == "tc" for _, s in pairs)
        if has_tc:
            tc_covered_stems.add(stem)
        if has_ac and not has_tc:
            missing.append(chosen)

    return sorted(set(normalized)), sorted(missing), tc_covered_stems


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
            {
                "scenario": str(
                    getattr(t, "scenario", t) if hasattr(t, "scenario") else t
                ).strip()
            }
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
    normalized_scenarios: list[str] = field(default_factory=list)
    missing_test_case_scenarios: list[str] = field(default_factory=list)
    improvement_suggestions: list[str] = field(default_factory=list)


def validate_story_quality(
    *,
    story_text: str,
    acceptance_criteria: Any,
    test_cases: Any,
) -> StoryQualityResult:
    """
    Validate story structure, AC coverage, scenario coverage, and ambiguity.
    Extract normalized (deduplicated) scenarios; report missing test case coverage.
    Improvement suggestions: do not suggest modifying story/AC when only coverage is missing.
    """
    checks: list[ValidationCheck] = []
    suggestions: list[str] = []
    ac_list = _ac_list(acceptance_criteria)
    tc_list = _test_cases_list(test_cases)

    # 1. Story structure
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
        suggestions.append(
            "Rewrite the story in format: As a [role] I want [goal] so that [benefit]."
        )

    # 2. Acceptance criteria count
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
        suggestions.append(
            f"Add at least {MIN_ACCEPTANCE_CRITERIA - len(ac_list)} more acceptance criteria."
        )

    # 3. Scenario extraction and coverage
    ac_canonical_ids = [
        _extract_canonical_from_phrase(ac) for ac in ac_list if ac
    ]
    ac_canonical_ids = [x for x in ac_canonical_ids if x]
    tc_canonical_ids = []
    for tc in tc_list:
        sc = (tc.get("scenario") or "").strip()
        if sc:
            cid = _extract_canonical_from_phrase(sc)
            if cid:
                tc_canonical_ids.append(cid)

    normalized_scenarios, missing_test_case_scenarios, _ = _deduplicate_canonicals(
        ac_canonical_ids, tc_canonical_ids
    )

    coverage_ok = len(missing_test_case_scenarios) == 0
    checks.append(
        ValidationCheck(
            name="scenario_coverage",
            passed=coverage_ok,
            message="Some acceptance-criteria scenarios have no test case coverage."
            if not coverage_ok
            else "Test cases cover acceptance criteria scenarios.",
        )
    )
    # Only suggest adding test cases; do not suggest modifying story or AC for coverage.
    if not coverage_ok and missing_test_case_scenarios:
        suggestions.append(
            "Add new test cases for uncovered scenarios (do not modify story or AC): "
            + ", ".join(missing_test_case_scenarios[:10])
            + ("..." if len(missing_test_case_scenarios) > 10 else "")
        )

    # 4. Ambiguity
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

    # Weighted quality score 0–100 (story_structure=20, acceptance_criteria=20, scenario_coverage=40, ambiguity=20)
    quality_score = (
        (WEIGHT_STORY_STRUCTURE if structure_ok else 0)
        + (WEIGHT_ACCEPTANCE_CRITERIA if ac_ok else 0)
        + (WEIGHT_SCENARIO_COVERAGE if coverage_ok else 0)
        + (WEIGHT_AMBIGUITY if ambiguity_ok else 0)
    )

    return StoryQualityResult(
        quality_score=quality_score,
        validation_checks=[
            {"name": c.name, "passed": c.passed, "message": c.message}
            for c in checks
        ],
        normalized_scenarios=normalized_scenarios,
        missing_test_case_scenarios=missing_test_case_scenarios,
        improvement_suggestions=suggestions,
    )
