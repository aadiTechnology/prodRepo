"""Add Unicode support for Hindi in gallery names and media files

Revision ID: add_unicode_support_hindi
Revises: add_refresh_tokens
Create Date: 2026-09-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_unicode_support_hindi'
down_revision = 'add_refresh_tokens'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Convert gallery_name to nvarchar for Unicode support
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN gallery_name NVARCHAR(255) NOT NULL')
    
    # Convert description to nvarchar(max) for Unicode support
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN description NVARCHAR(MAX)')
    
    # Convert file names to nvarchar for Unicode support
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN file_name NVARCHAR(255) NOT NULL')
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN original_file_name NVARCHAR(255)')


def downgrade() -> None:
    # Revert to VARCHAR if needed (may lose data)
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN gallery_name VARCHAR(255) NOT NULL')
    op.execute('ALTER TABLE activity_gallery ALTER COLUMN description TEXT')
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN file_name VARCHAR(255) NOT NULL')
    op.execute('ALTER TABLE activity_gallery_media ALTER COLUMN original_file_name VARCHAR(255)')
