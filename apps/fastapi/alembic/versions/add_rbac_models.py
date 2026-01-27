"""add RBAC and multi-tenant models

Revision ID: add_rbac_models
Revises: add_user_role
Create Date: 2026-01-27 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_rbac_models"
down_revision: Union[str, Sequence[str], None] = "add_user_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create RBAC and multi-tenant tables and extend users."""

    # --- Tenants ---
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_tenants_id", "tenants", ["id"], unique=False)
    op.create_index("ix_tenants_code", "tenants", ["code"], unique=True)

    # --- Roles ---
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.Integer(), nullable=True),
        sa.UniqueConstraint("tenant_id", "code", name="uq_roles_tenant_code"),
    )
    op.create_index("ix_roles_id", "roles", ["id"], unique=False)
    op.create_index("ix_roles_tenant_id", "roles", ["tenant_id"], unique=False)
    op.create_index("ix_roles_is_active", "roles", ["is_active"], unique=False)

    # --- Features (Permissions) ---
    op.create_table(
        "features",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_features_id", "features", ["id"], unique=False)
    op.create_index("ix_features_code", "features", ["code"], unique=True)
    op.create_index("ix_features_is_active", "features", ["is_active"], unique=False)

    # --- Menus (2-level hierarchy) ---
    op.create_table(
        "menus",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        # For SQL Server, avoid ON DELETE on self-referencing FK to prevent multiple cascade paths
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("menus.id"), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("path", sa.String(length=300), nullable=True),
        sa.Column("icon", sa.String(length=100), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.Integer(), nullable=True),
        sa.CheckConstraint("level IN (1, 2)", name="ck_menus_level"),
        sa.CheckConstraint(
            "(level = 1 AND parent_id IS NULL) OR (level = 2 AND parent_id IS NOT NULL)",
            name="ck_menus_hierarchy",
        ),
    )
    op.create_index("ix_menus_id", "menus", ["id"], unique=False)
    op.create_index("ix_menus_tenant_id", "menus", ["tenant_id"], unique=False)
    op.create_index("ix_menus_parent_id", "menus", ["parent_id"], unique=False)
    op.create_index("ix_menus_level", "menus", ["level"], unique=False)
    op.create_index("ix_menus_is_active", "menus", ["is_active"], unique=False)

    # --- Association tables ---

    # user_roles (many-to-many)
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("assigned_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"], unique=False)
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"], unique=False)

    # role_features (many-to-many)
    op.create_table(
        "role_features",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("feature_id", sa.Integer(), sa.ForeignKey("features.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("granted_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("granted_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_role_features_role_id", "role_features", ["role_id"], unique=False)
    op.create_index("ix_role_features_feature_id", "role_features", ["feature_id"], unique=False)

    # role_menus (many-to-many)
    op.create_table(
        "role_menus",
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("menu_id", sa.Integer(), sa.ForeignKey("menus.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("granted_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("granted_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_role_menus_role_id", "role_menus", ["role_id"], unique=False)
    op.create_index("ix_role_menus_menu_id", "role_menus", ["menu_id"], unique=False)

    # --- Extend users table for multi-tenant, phone, audit & soft delete ---
    op.add_column("users", sa.Column("tenant_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))
    op.add_column("users", sa.Column("created_by", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("updated_by", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("0")))
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("deleted_by", sa.Integer(), nullable=True))

    op.create_foreign_key(
        "fk_users_tenant",
        "users",
        "tenants",
        local_cols=["tenant_id"],
        remote_cols=["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"], unique=False)
    op.create_index("ix_users_is_active", "users", ["is_active"], unique=False)


def downgrade() -> None:
    """Drop RBAC and multi-tenant schema changes."""

    # Drop indices and FKs from users
    op.drop_index("ix_users_is_active", table_name="users")
    op.drop_index("ix_users_tenant_id", table_name="users")
    op.drop_constraint("fk_users_tenant", "users", type_="foreignkey")

    op.drop_column("users", "deleted_by")
    op.drop_column("users", "deleted_at")
    op.drop_column("is_deleted", table_name="users")
    op.drop_column("updated_by", table_name="users")
    op.drop_column("updated_at", table_name="users")
    op.drop_column("created_by", table_name="users")
    op.drop_column("is_active", table_name="users")
    op.drop_column("phone_number", table_name="users")
    op.drop_column("tenant_id", table_name="users")

    # Drop association tables
    op.drop_index("ix_role_menus_menu_id", table_name="role_menus")
    op.drop_index("ix_role_menus_role_id", table_name="role_menus")
    op.drop_table("role_menus")

    op.drop_index("ix_role_features_feature_id", table_name="role_features")
    op.drop_index("ix_role_features_role_id", table_name="role_features")
    op.drop_table("role_features")

    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")

    # Drop menus
    op.drop_index("ix_menus_is_active", table_name="menus")
    op.drop_index("ix_menus_level", table_name="menus")
    op.drop_index("ix_menus_parent_id", table_name="menus")
    op.drop_index("ix_menus_tenant_id", table_name="menus")
    op.drop_index("ix_menus_id", table_name="menus")
    op.drop_table("menus")

    # Drop features
    op.drop_index("ix_features_is_active", table_name="features")
    op.drop_index("ix_features_code", table_name="features")
    op.drop_index("ix_features_id", table_name="features")
    op.drop_table("features")

    # Drop roles
    op.drop_index("ix_roles_is_active", table_name="roles")
    op.drop_index("ix_roles_tenant_id", table_name="roles")
    op.drop_index("ix_roles_id", table_name="roles")
    op.drop_table("roles")

    # Drop tenants
    op.drop_index("ix_tenants_code", table_name="tenants")
    op.drop_index("ix_tenants_id", table_name="tenants")
    op.drop_table("tenants")

