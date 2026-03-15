"""
Generate file mapping for development tasks: backend files required to implement
a task using API contract and data models. Follows Controller -> Service -> Repository
and existing app layout (routers, services, schemas, models).
"""

from __future__ import annotations

import re
from typing import Any

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Backend layout per spec: controllers, services, repositories, schemas, models, tests.
BACKEND_ROOT = "backend"
CONTROLLERS_DIR = "controllers"
SERVICES_DIR = "services"
REPOSITORIES_DIR = "repositories"
SCHEMAS_DIR = "schemas"
MODELS_DIR = "models"
TESTS_DIR = "tests"


def _pascal_to_snake(name: str) -> str:
    """Convert PascalCase to snake_case."""
    if not name:
        return ""
    s = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s).lower()


def _entity_from_endpoint(endpoint: str) -> str | None:
    """Extract entity name from endpoint path (e.g. /api/attendance -> attendance)."""
    if not endpoint:
        return None
    path = endpoint.strip().strip("/")
    parts = [p for p in path.split("/") if p and p != "api"]
    if not parts:
        return None
    # Last segment often the resource (e.g. /api/attendance -> attendance)
    last = parts[-1]
    # If it's already snake_case or single word, use it
    if "_" in last or last.isalpha():
        return last.lower()
    return _pascal_to_snake(last)


def _entity_from_model_name(model_name: str) -> str:
    """Convert model name to entity (e.g. Attendance -> attendance)."""
    return _pascal_to_snake((model_name or "").strip())


def _collect_entities(
    api_contract: dict[str, Any],
    models: list[dict[str, Any]],
    task_title: str,
) -> list[str]:
    """
    Collect unique entity names from endpoint, model names, and optionally task title.
    Deduplicated and ordered (models first, then endpoint, then title).
    """
    entities: list[str] = []
    seen: set[str] = set()

    # From data models (primary source)
    for m in models or []:
        name = (m.get("model_name") or "").strip()
        if not name:
            continue
        entity = _entity_from_model_name(name)
        if entity and entity not in seen:
            entities.append(entity)
            seen.add(entity)

    # From API contract endpoint
    endpoint = (api_contract or {}).get("endpoint") or ""
    from_endpoint = _entity_from_endpoint(endpoint)
    if from_endpoint and from_endpoint not in seen:
        entities.append(from_endpoint)
        seen.add(from_endpoint)

    # Fallback: try to derive from task_title (e.g. "Create attendance API" -> attendance)
    if not entities and task_title:
        # Simple heuristic: last word before "API" or first significant word
        title_lower = task_title.strip().lower()
        for word in title_lower.replace("_", " ").split():
            if word in ("api", "create", "add", "update", "delete", "get", "list", "the", "a", "an"):
                continue
            if len(word) > 1 and word.isalpha():
                entities.append(word)
                break

    return entities if entities else ["resource"]


def _file_paths_for_entity(entity: str, backend_root: str) -> list[str]:
    """
    Return ordered list of backend file paths for one entity.
    Naming: <entity>_controller.py, <entity>_service.py, <entity>_repository.py,
    <entity>_schema.py, <entity>.py (models), test_<entity>_api.py.
    """
    root = backend_root.strip("/") or BACKEND_ROOT
    return [
        f"{root}/{CONTROLLERS_DIR}/{entity}_controller.py",
        f"{root}/{SERVICES_DIR}/{entity}_service.py",
        f"{root}/{REPOSITORIES_DIR}/{entity}_repository.py",
        f"{root}/{SCHEMAS_DIR}/{entity}_schema.py",
        f"{root}/{MODELS_DIR}/{entity}.py",
        f"{root}/{TESTS_DIR}/test_{entity}_api.py",
    ]


def generate_file_mapping(
    task_id: str,
    task_title: str,
    api_contract: dict[str, Any],
    models: list[dict[str, Any]],
    *,
    backend_root: str | None = None,
) -> dict[str, Any]:
    """
    Determine backend files required to implement a task from API contract and data models.

    Args:
        task_id: Task identifier.
        task_title: Task title (e.g. "Create attendance API").
        api_contract: Dict with at least "endpoint"; optional "method", "request_schema", "response_schema".
        models: List of {"model_name": str, ...} from data model extraction.
        backend_root: Prefix for paths (default BACKEND_ROOT).

    Returns:
        {"files": [path, ...]} with paths like app/routers/<entity>_controller.py, etc.
    """
    backend_root = backend_root or BACKEND_ROOT
    entities = _collect_entities(api_contract, models, task_title)
    all_paths: list[str] = []
    seen_paths: set[str] = set()

    for entity in entities:
        for path in _file_paths_for_entity(entity, backend_root):
            path_normalized = path.replace("\\", "/")
            if path_normalized not in seen_paths:
                all_paths.append(path_normalized)
                seen_paths.add(path_normalized)

    logger.info("File mapping for task_id=%s: %d files for entities %s", task_id, len(all_paths), entities)
    return {"files": all_paths}
