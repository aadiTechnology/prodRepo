"""
Generate SQLAlchemy ORM model files and Alembic migrations from extracted data models.
Follows project structure: app/models/<name>.py and alembic/versions/create_<table>_table_<revision>.py.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from app.core.database import Base
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# SQLAlchemy type name -> (ORM Column type, migration sa type, optional length/default)
TYPE_MAP = {
    "integer": ("Integer", "sa.Integer()", None),
    "string": ("String(255)", "sa.String(length=255)", None),
    "datetime": ("DateTime", "sa.DateTime()", None),
    "date": ("Date", "sa.Date()", None),
    "boolean": ("Boolean", "sa.Boolean()", None),
    "float": ("Float", "sa.Float()", None),
    "text": ("Text", "sa.Text()", None),
}

# Default down_revision for generated migrations (chain after this head).
DEFAULT_DOWN_REVISION = "add_depends_on_task_id"


def _pascal_to_snake(name: str) -> str:
    """Convert PascalCase to snake_case."""
    s = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s).lower()


def _table_name(model_name: str) -> str:
    """Derive table name from model name (e.g. Attendance -> attendance)."""
    return _pascal_to_snake(model_name)


def _existing_tables() -> set[str]:
    """Return set of table names already present in Base.metadata."""
    return set(Base.metadata.tables.keys())


def _normalize_type(t: str) -> str:
    """Normalize type string to a key in TYPE_MAP."""
    if not t:
        return "string"
    key = t.strip().lower()
    return key if key in TYPE_MAP else "string"


def _orm_column_line(field_name: str, type_key: str) -> str:
    """Single column line for ORM model."""
    if field_name == "id":
        return '    id = Column(Integer, primary_key=True, index=True, autoincrement=True)'
    if field_name == "created_at":
        return "    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)"
    if type_key not in TYPE_MAP:
        type_key = "string"
    sa_type, _, _ = TYPE_MAP[type_key]
    return f'    {field_name} = Column({sa_type}, nullable=True)'


def _migration_column_line(field_name: str, type_key: str) -> str:
    """Single column line for Alembic migration (upgrade)."""
    if field_name == "id":
        return '        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),'
    if field_name == "created_at":
        return '        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),'
    if type_key not in TYPE_MAP:
        type_key = "string"
    _, sa_migration, _ = TYPE_MAP[type_key]
    return f'        sa.Column("{field_name}", {sa_migration}, nullable=True),'


def _build_fields_with_required(model_name: str, fields: dict[str, str]) -> list[tuple[str, str]]:
    """Build ordered list of (field_name, type_key) including required id and created_at."""
    out: list[tuple[str, str]] = []
    seen = set()

    # id first
    if "id" not in fields:
        out.append(("id", "integer"))
        seen.add("id")
    else:
        out.append(("id", _normalize_type(fields["id"])))
        seen.add("id")

    # user fields (excluding id, created_at to place them correctly)
    for name, t in fields.items():
        if name in seen:
            continue
        if name == "created_at":
            continue
        out.append((name, _normalize_type(t)))
        seen.add(name)

    # created_at last
    if "created_at" not in seen:
        out.append(("created_at", "datetime"))
    else:
        out.append(("created_at", _normalize_type(fields["created_at"])))

    return out


def _generate_orm_content(model_name: str, fields: dict[str, str]) -> str:
    """Generate full content for app/models/<name>.py."""
    table_name = _table_name(model_name)
    ordered = _build_fields_with_required(model_name, fields)

    imports = ["Integer", "DateTime"]
    for _, type_key in ordered:
        if type_key in TYPE_MAP:
            sa_type = TYPE_MAP[type_key][0]
            if "String" in sa_type and "String" not in imports:
                imports.append("String")
            if "Date" in sa_type and "Date" not in imports:
                imports.append("Date")
            if "Boolean" in sa_type and "Boolean" not in imports:
                imports.append("Boolean")
            if "Float" in sa_type and "Float" not in imports:
                imports.append("Float")
            if "Text" in sa_type and "Text" not in imports:
                imports.append("Text")

    import_line = "from sqlalchemy import Column, " + ", ".join(sorted(set(imports)))
    lines = [
        'from __future__ import annotations',
        "",
        "from datetime import datetime",
        "",
        import_line,
        "",
        "from app.core.database import Base",
        "",
        "",
        f"class {model_name}(Base):",
        f'    __tablename__ = "{table_name}"',
        "",
    ]
    for name, type_key in ordered:
        lines.append(_orm_column_line(name, type_key))
    return "\n".join(lines) + "\n"


def _generate_migration_content(
    table_name: str,
    model_name: str,
    fields: dict[str, str],
    revision_id: str,
    down_revision: str,
) -> str:
    """Generate full content for alembic/versions/create_<table>_table_<revision>.py."""
    ordered = _build_fields_with_required(model_name, fields)
    column_lines = [_migration_column_line(name, type_key) for name, type_key in ordered]

    return f'''"""create {table_name} table

Revision ID: {revision_id}
Revises: {down_revision}
Create Date: (generated)

"""
from alembic import op
import sqlalchemy as sa

revision = "{revision_id}"
down_revision = "{down_revision}"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "{table_name}",
{chr(10).join(column_lines)}
    )
    op.create_index("ix_{table_name}_id", "{table_name}", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_{table_name}_id", table_name="{table_name}")
    op.drop_table("{table_name}")
'''


def generate_schema_for_models(
    task_id: str,
    models: list[dict[str, Any]],
    *,
    down_revision: str | None = None,
    write_files: bool = True,
) -> dict[str, Any]:
    """
    Convert extracted data models into ORM files and Alembic migrations.

    Args:
        task_id: Task identifier (used for logging and revision naming).
        models: List of {"model_name": str, "fields": {field_name: type_string}}.
        down_revision: Alembic revision to depend on; default DEFAULT_DOWN_REVISION.
        write_files: If True, write model and migration files to disk.

    Returns:
        {"models": [{"model_name", "model_file", "migration_file"}]}
        For skipped (existing table): model_file and migration_file are null; include "skipped": true.
    """
    down_revision = down_revision or DEFAULT_DOWN_REVISION
    existing = _existing_tables()
    # App root: app/ (so app/models, and app/../alembic/versions)
    app_root = Path(__file__).resolve().parent.parent
    models_dir = app_root / "models"
    # Alembic versions live next to app (apps/fastapi/alembic/versions)
    migrations_dir = app_root.parent / "alembic" / "versions"

    result_models: list[dict[str, Any]] = []
    revision_chain = down_revision
    created_this_run: set[str] = set()

    for idx, m in enumerate(models):
        model_name = (m.get("model_name") or "").strip()
        fields = m.get("fields") or {}
        if not model_name:
            continue

        table_name = _table_name(model_name)
        if table_name in existing:
            logger.info("Skipping model %s: table %s already exists", model_name, table_name)
            result_models.append({
                "model_name": model_name,
                "model_file": None,
                "migration_file": None,
                "skipped": True,
                "reason": "Table already exists",
            })
            continue
        if table_name in created_this_run:
            result_models.append({
                "model_name": model_name,
                "model_file": None,
                "migration_file": None,
                "skipped": True,
                "reason": "Duplicate model in request",
            })
            continue

        created_this_run.add(table_name)

        # Unique revision id per generated migration
        safe_name = table_name
        revision_id = f"add_{safe_name}_table"

        orm_content = _generate_orm_content(model_name, fields)
        migration_content = _generate_migration_content(
            table_name, model_name, fields, revision_id, revision_chain
        )

        model_filename = f"{table_name}.py"
        migration_filename = f"create_{table_name}_table_{revision_id}.py"

        model_path = models_dir / model_filename
        migration_path = migrations_dir / migration_filename

        if write_files:
            models_dir.mkdir(parents=True, exist_ok=True)
            migrations_dir.mkdir(parents=True, exist_ok=True)
            model_path.write_text(orm_content, encoding="utf-8")
            migration_path.write_text(migration_content, encoding="utf-8")
            logger.info("Wrote ORM model %s and migration %s", model_path, migration_path)

        # Relative paths from project root (apps/fastapi)
        project_root = app_root.parent
        model_file_str = str(model_path.relative_to(project_root))
        migration_file_str = str(migration_path.relative_to(project_root))

        result_models.append({
            "model_name": model_name,
            "model_file": model_file_str.replace("\\", "/"),
            "migration_file": migration_file_str.replace("\\", "/"),
        })
        revision_chain = revision_id

    return {"models": result_models}
