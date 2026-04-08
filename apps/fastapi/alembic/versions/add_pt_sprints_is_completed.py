"""Add IsCompleted to dbo.PT_Sprints for sprint lifecycle.

Revision ID: add_pt_sprints_is_completed
Revises: add_depends_on_task_id
Create Date: 2026-04-08

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_pt_sprints_is_completed"
down_revision: Union[str, Sequence[str], None] = "add_depends_on_task_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID(N'dbo.PT_Sprints') AND name = N'IsCompleted'
            )
            ALTER TABLE dbo.PT_Sprints ADD IsCompleted INT NULL;
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID(N'dbo.PT_Sprints') AND name = N'IsCompleted'
            )
            ALTER TABLE dbo.PT_Sprints DROP COLUMN IsCompleted;
            """
        )
    )
