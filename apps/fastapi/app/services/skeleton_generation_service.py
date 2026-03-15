"""
Generate minimal code skeletons for backend files from API contract, data models, and file mapping.
Outputs controller, service, repository, schema, and test placeholders without full business logic.
"""

from __future__ import annotations

import re
from typing import Any

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Path patterns: backend/controllers/<entity>_controller.py, etc.
CONTROLLERS_DIR = "controllers"
SERVICES_DIR = "services"
REPOSITORIES_DIR = "repositories"
SCHEMAS_DIR = "schemas"
MODELS_DIR = "models"
TESTS_DIR = "tests"

# Pydantic type from schema type string
SCHEMA_TYPE_MAP = {
    "integer": "int",
    "string": "str",
    "datetime": "datetime",
    "date": "date",
    "boolean": "bool",
    "float": "float",
    "text": "str",
}


def _snake_to_pascal(snake: str) -> str:
    """Convert snake_case to PascalCase."""
    if not snake:
        return ""
    return "".join(w.capitalize() for w in snake.split("_"))


def _pascal_to_snake(name: str) -> str:
    """Convert PascalCase to snake_case."""
    if not name:
        return ""
    s = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s).lower()


def _parse_file_path(path: str) -> tuple[str | None, str | None]:
    """
    Return (entity, file_type) from path.
    e.g. backend/controllers/attendance_controller.py -> (attendance, controller)
    """
    path = path.replace("\\", "/").strip()
    parts = [p for p in path.split("/") if p]
    if not parts:
        return None, None
    name = parts[-1]
    if not name.endswith(".py"):
        return None, None
    name = name[:-3]
    parent = parts[-2] if len(parts) >= 2 else ""
    if name.endswith("_controller"):
        return name[:-11], "controller"
    if name.endswith("_service"):
        return name[:-8], "service"
    if name.endswith("_repository"):
        return name[:-11], "repository"
    if name.endswith("_schema"):
        return name[:-7], "schema"
    if parent == MODELS_DIR:
        return name, "model"
    if name.startswith("test_") and name.endswith("_api"):
        return name[5:-4], "test"
    return None, None


def _endpoint_parts(endpoint: str) -> tuple[str, str]:
    """Return (prefix, path) for APIRouter. e.g. /api/attendance -> (/api, /attendance)."""
    endpoint = (endpoint or "").strip().strip("/")
    if not endpoint:
        return "/", ""
    parts = endpoint.split("/")
    if len(parts) == 1:
        return "/", "/" + parts[0]
    prefix = "/" + parts[0]
    path = "/" + "/".join(parts[1:])
    return prefix, path


def _schema_type_to_pydantic(t: str) -> str:
    """Map request_schema/response_schema type string to Pydantic/annotation type."""
    key = (t or "string").strip().lower()
    return SCHEMA_TYPE_MAP.get(key, "str")


def _generate_controller_code(
    entity: str,
    api_contract: dict[str, Any],
) -> str:
    """Generate FastAPI router skeleton calling service layer."""
    endpoint = (api_contract.get("endpoint") or "/api/resource").strip()
    method = (api_contract.get("method") or "GET").upper()
    prefix, path = _endpoint_parts(endpoint)
    entity_pascal = _snake_to_pascal(entity)
    # Router path: often prefix is /api, path is /attendance
    if path == "/":
        path = ""
    router_prefix = prefix if prefix != "/" else ""
    tags = [entity_pascal]

    lines = [
        '"""Skeleton controller for %s. Generated – add auth and error handling as needed."""' % entity_pascal,
        "",
        "from fastapi import APIRouter, Depends, status",
        "from sqlalchemy.orm import Session",
        "",
        "from app.core.database import get_db",
        "from app.services.%s_service import %sService" % (entity, entity_pascal),
        "from app.schemas.%s_schema import %sCreate, %sResponse" % (entity, entity_pascal, entity_pascal),
        "",
        "router = APIRouter(prefix=%r, tags=%r)" % (router_prefix or "/api", tags),
        "",
        "",
    ]
    # Single endpoint from api_contract
    method_lower = method.lower()
    if method_lower == "get":
        decorator = '@router.get("%s")' % (path or "/")
        lines.append(decorator)
        lines.append("async def get_%s(" % entity)
        lines.append("    db: Session = Depends(get_db),")
        lines.append("):")
        lines.append("    \"\"\"Placeholder: implement get.\"\"\"")
        lines.append("    return %sService.get_list(db)" % entity_pascal)
    elif method_lower == "post":
        decorator = '@router.post("%s", status_code=status.HTTP_201_CREATED)' % (path or "/")
        lines.append(decorator)
        lines.append("async def create_%s(" % entity)
        lines.append("    data: %sCreate," % entity_pascal)
        lines.append("    db: Session = Depends(get_db),")
        lines.append("):")
        lines.append("    \"\"\"Placeholder: implement create.\"\"\"")
        lines.append("    return %sService.create(db, data)" % entity_pascal)
    elif method_lower == "put":
        decorator = '@router.put("%s")' % (path or "/")
        lines.append(decorator)
        lines.append("async def update_%s(" % entity)
        lines.append("    data: %sCreate," % entity_pascal)
        lines.append("    db: Session = Depends(get_db),")
        lines.append("):")
        lines.append("    \"\"\"Placeholder: implement update.\"\"\"")
        lines.append("    return %sService.update(db, data)" % entity_pascal)
    elif method_lower == "delete":
        decorator = '@router.delete("%s", status_code=status.HTTP_204_NO_CONTENT)' % (path or "/")
        lines.append(decorator)
        lines.append("async def delete_%s(" % entity)
        lines.append("    db: Session = Depends(get_db),")
        lines.append("):")
        lines.append("    \"\"\"Placeholder: implement delete.\"\"\"")
        lines.append("    %sService.delete(db)" % entity_pascal)
        lines.append("    return None")
    else:
        decorator = '@router.%s("%s")' % (method_lower, path or "/")
        lines.append(decorator)
        lines.append("async def %s_handler(" % entity)
        lines.append("    db: Session = Depends(get_db),")
        lines.append("):")
        lines.append("    \"\"\"Placeholder: implement handler.\"\"\"")
        lines.append("    return %sService.handle(db)" % entity_pascal)

    lines.append("")
    return "\n".join(lines)


def _generate_service_code(entity: str) -> str:
    """Generate service class with placeholder methods."""
    entity_pascal = _snake_to_pascal(entity)
    lines = [
        '"""Skeleton service for %s. Add business logic here."""' % entity_pascal,
        "",
        "from sqlalchemy.orm import Session",
        "",
        "from app.schemas.%s_schema import %sCreate, %sResponse" % (entity, entity_pascal, entity_pascal),
        "",
        "",
        "class %sService:" % entity_pascal,
        "    \"\"\"Placeholder service for %s operations.\"\"\"" % entity_pascal,
        "",
        "    @staticmethod",
        "    def get_list(db: Session):",
        "        \"\"\"Placeholder: list records.\"\"\"",
        "        raise NotImplementedError",
        "",
        "    @staticmethod",
        "    def create(db: Session, data: %sCreate):" % entity_pascal,
        "        \"\"\"Placeholder: create record.\"\"\"",
        "        raise NotImplementedError",
        "",
        "    @staticmethod",
        "    def update(db: Session, data: %sCreate):" % entity_pascal,
        "        \"\"\"Placeholder: update record.\"\"\"",
        "        raise NotImplementedError",
        "",
        "    @staticmethod",
        "    def delete(db: Session):",
        "        \"\"\"Placeholder: delete record.\"\"\"",
        "        raise NotImplementedError",
        "",
        "    @staticmethod",
        "    def handle(db: Session):",
        "        \"\"\"Placeholder: generic handler.\"\"\"",
        "        raise NotImplementedError",
        "",
    ]
    return "\n".join(lines)


def _generate_repository_code(entity: str, model_name: str | None) -> str:
    """Generate repository class for DB access using SQLAlchemy session."""
    entity_pascal = _snake_to_pascal(entity)
    model = model_name or entity_pascal
    lines = [
        '"""Skeleton repository for %s DB access."""' % entity_pascal,
        "",
        "from sqlalchemy.orm import Session",
        "",
        "from app.models.%s import %s" % (entity, model),
        "",
        "",
        "class %sRepository:" % (entity_pascal + "Repository"),
        "    \"\"\"Placeholder repository for %s persistence.\"\"\"" % entity_pascal,
        "",
        "    def __init__(self, db: Session):",
        "        self.db = db",
        "",
        "    def get_by_id(self, id: int):",
        "        \"\"\"Placeholder: get by primary key.\"\"\"",
        "        return self.db.query(%s).filter(%s.id == id).first()" % (model, model),
        "",
        "    def list_all(self):",
        "        \"\"\"Placeholder: list all.\"\"\"",
        "        return self.db.query(%s).all()" % model,
        "",
        "    def add(self, entity: %s):" % model,
        "        \"\"\"Placeholder: add and flush.\"\"\"",
        "        self.db.add(entity)",
        "        self.db.flush()",
        "        return entity",
        "",
        "    def delete(self, entity: %s):" % model,
        "        \"\"\"Placeholder: delete.\"\"\"",
        "        self.db.delete(entity)",
        "",
    ]
    return "\n".join(lines)


def _generate_schema_code(
    entity: str,
    api_contract: dict[str, Any],
) -> str:
    """Generate Pydantic request/response models from API contract."""
    entity_pascal = _snake_to_pascal(entity)
    request_schema = api_contract.get("request_schema") or {}
    response_schema = api_contract.get("response_schema") or {}

    all_types = list(request_schema.values()) + list(response_schema.values())
    need_date = any(_schema_type_to_pydantic(v) == "date" for v in all_types)
    need_datetime = any(_schema_type_to_pydantic(v) == "datetime" for v in all_types)

    lines = [
        '"""Pydantic schemas for %s. Derived from API contract."""' % entity_pascal,
        "",
    ]
    if need_date or need_datetime:
        imps = []
        if need_date:
            imps.append("date")
        if need_datetime:
            imps.append("datetime")
        lines.append("from datetime import " + ", ".join(imps))
        lines.append("")
    lines.append("from typing import Optional")
    lines.append("from pydantic import BaseModel")
    lines.append("")
    lines.append("")
    lines.append("class %sCreate(BaseModel):" % entity_pascal)
    lines.append("    \"\"\"Request schema for create.\"\"\"")
    have_request = False
    for field_name, type_str in request_schema.items():
        if field_name in ("id", "created_at"):
            continue
        have_request = True
        py_type = _schema_type_to_pydantic(type_str)
        lines.append("    %s: Optional[%s] = None" % (field_name, py_type))
    if not have_request:
        lines.append("    pass")
    lines.append("")
    lines.append("")
    lines.append("class %sResponse(BaseModel):" % entity_pascal)
    lines.append("    \"\"\"Response schema.\"\"\"")
    response_fields = dict(response_schema) if response_schema else {"id": "integer"}
    for field_name, type_str in response_fields.items():
        py_type = _schema_type_to_pydantic(type_str)
        lines.append("    %s: %s" % (field_name, py_type))
    if not response_fields:
        lines.append("    id: int")
    lines.append("")
    return "\n".join(lines)


def _generate_model_placeholder_code(entity: str) -> str:
    """Return a short comment; model file is assumed to exist from schema generation."""
    return '"""ORM model for %s – use the model generated by schema generation (app/models/%s.py)."""\n' % (
        _snake_to_pascal(entity),
        entity,
    )


def _generate_test_code(entity: str, api_contract: dict[str, Any]) -> str:
    """Generate pytest skeleton with test for endpoint success."""
    endpoint = (api_contract.get("endpoint") or "/api/resource").strip()
    method = (api_contract.get("method") or "GET").upper()
    entity_pascal = _snake_to_pascal(entity)
    lines = [
        '"""Pytest skeleton for %s API. Add test data and assertions."""' % entity_pascal,
        "",
        "import pytest",
        "from fastapi.testclient import TestClient",
        "",
        "from app.main import app",
        "",
        "",
        "client = TestClient(app)",
        "",
        "",
        "@pytest.mark.skip(reason=\"Wire endpoint and implement test\")",
        "def test_%s_endpoint_success():" % entity,
        "    \"\"\"Placeholder: test %s %s endpoint returns success.\"\"\"" % (entity, method),
        "    response = client.%s(%r)" % (method.lower(), endpoint),
        "    assert response.status_code in (200, 201, 204)",
        "",
    ]
    return "\n".join(lines)


def generate_skeleton(
    task_id: str,
    task_title: str,
    api_contract: dict[str, Any],
    models: list[dict[str, Any]],
    files: list[str],
) -> dict[str, Any]:
    """
    Generate minimal code skeleton for each backend file path.

    Args:
        task_id: Task identifier.
        task_title: Task title.
        api_contract: endpoint, method, request_schema, response_schema.
        models: List of {model_name, ...} for entity/model name lookup.
        files: List of file paths from file mapping.

    Returns:
        {"files": [{"path": str, "code": str}, ...]}
    """
    api_contract = api_contract or {}
    models = models or []
    files = files or []

    # Primary model name for repository (first model)
    model_name = None
    if models:
        first = models[0]
        model_name = (first.get("model_name") or "").strip()
    if not model_name and files:
        for f in files:
            ent, ft = _parse_file_path(f)
            if ft == "schema" and ent:
                model_name = _snake_to_pascal(ent)
                break

    result: list[dict[str, Any]] = []
    for path in files:
        path_norm = path.replace("\\", "/")
        entity, file_type = _parse_file_path(path_norm)
        if not entity or not file_type:
            result.append({"path": path_norm, "code": "# Unrecognized file path; add code manually.\n"})
            continue
        if file_type == "controller":
            code = _generate_controller_code(entity, api_contract)
        elif file_type == "service":
            code = _generate_service_code(entity)
        elif file_type == "repository":
            code = _generate_repository_code(entity, model_name)
        elif file_type == "schema":
            code = _generate_schema_code(entity, api_contract)
        elif file_type == "model":
            code = _generate_model_placeholder_code(entity)
        elif file_type == "test":
            code = _generate_test_code(entity, api_contract)
        else:
            code = "# Placeholder for %s\n" % path_norm
        result.append({"path": path_norm, "code": code})

    logger.info("Skeleton generation for task_id=%s: %d files", task_id, len(result))
    return {"files": result}
