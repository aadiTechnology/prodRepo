from app.models.permission import Permission
from sqlalchemy.orm import Session

def seed_permissions(db: Session):
    permissions = [
        # Platform Core
        {"code": "VIEW_TENANTS", "name": "View Tenants", "module_name": "Platform Core"},
        {"code": "CREATE_TENANT", "name": "Create Tenant", "module_name": "Platform Core"},
        {"code": "EDIT_TENANT", "name": "Edit Tenant", "module_name": "Platform Core"},
        {"code": "MANAGE_ROLES", "name": "Manage Roles", "module_name": "Platform Core"},
        {"code": "MANAGE_USERS", "name": "Manage Users", "module_name": "Platform Core"},
        # SmartKidz
        {"code": "VIEW_STUDENTS", "name": "View Students", "module_name": "SmartKidz"},
        {"code": "ADD_STUDENT", "name": "Add Student", "module_name": "SmartKidz"},
        {"code": "EDIT_STUDENT", "name": "Edit Student", "module_name": "SmartKidz"},
        {"code": "MANAGE_FEES", "name": "Manage Fees", "module_name": "SmartKidz"},
    ]
    for perm in permissions:
        if not db.query(Permission).filter_by(code=perm["code"]).first():
            db.add(Permission(**perm))
    db.commit()