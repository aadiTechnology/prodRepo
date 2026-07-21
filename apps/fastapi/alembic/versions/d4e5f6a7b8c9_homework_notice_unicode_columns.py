"""homework and notice unicode text columns

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3c4d5e6
Create Date: 2026-07-21

Store Hindi/Marathi and other Unicode text in NVARCHAR columns (SQL Server).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mssql import NVARCHAR


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "homework",
        "title",
        existing_type=sa.String(length=255),
        type_=NVARCHAR(255),
        existing_nullable=False,
    )
    op.alter_column(
        "homework",
        "instructions",
        existing_type=sa.Text(),
        type_=NVARCHAR(length=None),
        existing_nullable=True,
    )
    op.alter_column(
        "homework_attachments",
        "file_name",
        existing_type=sa.String(length=255),
        type_=NVARCHAR(255),
        existing_nullable=False,
    )
    op.alter_column(
        "communication_notices",
        "title",
        existing_type=sa.String(length=255),
        type_=NVARCHAR(255),
        existing_nullable=False,
    )
    op.alter_column(
        "communication_notices",
        "description",
        existing_type=sa.Text(),
        type_=NVARCHAR(length=None),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "communication_notices",
        "description",
        existing_type=NVARCHAR(length=None),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.alter_column(
        "communication_notices",
        "title",
        existing_type=NVARCHAR(255),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.alter_column(
        "homework_attachments",
        "file_name",
        existing_type=NVARCHAR(255),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.alter_column(
        "homework",
        "instructions",
        existing_type=NVARCHAR(length=None),
        type_=sa.Text(),
        existing_nullable=True,
    )
    op.alter_column(
        "homework",
        "title",
        existing_type=NVARCHAR(255),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
