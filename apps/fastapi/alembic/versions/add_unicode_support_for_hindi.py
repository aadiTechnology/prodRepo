"""Add Unicode support for Hindi in gallery names and media files

Revision ID: add_unicode_support_hindi
Revises: add_refresh_tokens
Create Date: 2026-09-10 12:00:00.000000

"""
from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'add_unicode_support_hindi'
down_revision = 'add_refresh_tokens'
branch_labels = None
depends_on = None


_COLUMNS = (
    ("activity_gallery", "gallery_name", "NVARCHAR(255) NOT NULL"),
    ("activity_gallery", "description", "NVARCHAR(MAX)"),
    ("activity_gallery_media", "file_name", "NVARCHAR(255) NOT NULL"),
    ("activity_gallery_media", "original_file_name", "NVARCHAR(255)"),
)


def upgrade() -> None:
    conn = op.get_bind()
    for table_name, column_name, column_ddl in _COLUMNS:
        data_type = conn.execute(
            text(
                """
                SELECT DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = :table_name
                  AND COLUMN_NAME = :column_name
                """
            ),
            {"table_name": table_name, "column_name": column_name},
        ).scalar()
        if not data_type or str(data_type).lower() in {"nvarchar", "ntext"}:
            continue
        conn.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN {column_name} {column_ddl}"))


def downgrade() -> None:
    # Revert to VARCHAR if needed (may lose data)
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN gallery_name VARCHAR(255) NOT NULL')
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN description TEXT')
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN file_name VARCHAR(255) NOT NULL')
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN original_file_name VARCHAR(255)')
