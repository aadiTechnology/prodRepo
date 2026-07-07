import sys
import os

# Add apps/fastapi to sys.path to allow importing from 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import Feature, Menu 
from datetime import datetime

def cleanup_deprecated_menus(db: Session) -> None:
    """Remove deprecated menus and their RBAC links from the database."""
    from app.models import RoleMenuPermission
    from app.models.role import role_menus

    deprecated_menu_names = [
        "test2",
        "test",
        "aman",
        "Enrollment",
        "Fee Installment Status",
        "Assign Student Fee",
        "Student Fee Ledger",
    ]
    deprecated_menu_paths = [
        "/admissions/enrollment",
        "/fees/installment-status",
        "/fees/assign-student-fee",
        "/fees/ledger",
    ]

    def _purge_menu(menu: Menu) -> None:
        children = db.query(Menu).filter(Menu.parent_id == menu.id).all()
        for child in children:
            _purge_menu(child)
        db.query(RoleMenuPermission).filter(RoleMenuPermission.menu_id == menu.id).delete()
        db.execute(role_menus.delete().where(role_menus.c.menu_id == menu.id))
        db.delete(menu)
        print(f"[CLEANUP] Removed deprecated menu: {menu.name} ({menu.path or 'no path'})")

    seen_ids: set[int] = set()
    for menu_name in deprecated_menu_names:
        for menu in db.query(Menu).filter(Menu.name == menu_name).all():
            menu_id = int(menu.id)  # type: ignore[arg-type]
            if menu_id not in seen_ids:
                seen_ids.add(menu_id)
                _purge_menu(menu)

    for menu_path in deprecated_menu_paths:
        for menu in db.query(Menu).filter(Menu.path == menu_path).all():
            menu_id = int(menu.id)  # type: ignore[arg-type]
            if menu_id not in seen_ids:
                seen_ids.add(menu_id)
                _purge_menu(menu)

    db.flush()


def seed_rbac_data():
    db: Session = SessionLocal()
    try:
        print("[SEED] Starting Comprehensive RBAC seeding...")
        
        # Clean up deprecated modules first
        cleanup_deprecated_menus(db)
        db.commit()
        
        # 1. Features
        features_data = [
            {"code": "CORE", "name": "Core System", "category": "System"},
            {"code": "ADMIN_MGMT", "name": "Administration Management", "category": "Admin"},
            {"code": "ACADEMIC_MGMT", "name": "Academic Management", "category": "Academics"},
            {"code": "FEE_MGMT", "name": "Fee Management", "category": "Finance"},
            {"code": "STAFF_MGMT", "name": "Staff Management", "category": "HR"},
            {"code": "REPORTS_MGMT", "name": "Reports Management", "category": "Reports"},
            {"code": "ADMISSIONS_MGMT", "name": "Admissions Management", "category": "Admissions"},
            {"code": "SYSTEM_CONFIG", "name": "System Configuration", "category": "System"},
            {"code": "SPRINT_MGMT", "name": "Sprint Management", "category": "System"},
            {"code": "TEACHER_MGMT", "name": "Teacher Management", "category": "HR"},
            {"code": "COMMUNICATION_MGMT", "name": "Communication Management", "category": "Communication"},
            {"code": "HOMEWORK_MGMT", "name": "Homework Management", "category": "Academics"},
            {"code": "ACTIVITY_GALLERY_MGMT", "name": "Activity Gallery Management", "category": "Academics"},
        ]
        
        feature_map = {}
        for f in features_data:
            feature = db.query(Feature).filter(Feature.code == f["code"]).first()
            if not feature:
                feature = Feature(**f, is_active=True)
                db.add(feature)
                db.flush()
                print(f"[SEED] Created feature: {f['code']}")
            else:
                feature.name = f["name"]  # type: ignore
                feature.category = f["category"]  # type: ignore
                print(f"[SEED] Updated feature: {f['code']}")
            feature_map[f["code"]] = feature.id

        # 2. Hierarchy Data
        # NOTE: This is the authoritative list of modules and pages.
        # DO NOT include modules like "test", "aman", or other temporary/deprecated items.
        # Each time seed runs, it updates the global menu catalog only.
        # Permission assignments are managed manually by system admin.
        hierarchy = [
            {
                "name": "Dashboard", "level": 1, "icon": "dashboardIcon", "sort_order": 1,
                "children": [
                    {"name": "Overview", "path": "/", "feature": "CORE"}
                ]
            },
            {
                "name": "Administration", "level": 1, "icon": "adminIcon", "sort_order": 2,
                "children": [
                    {"name": "Users", "path": "/users", "feature": "ADMIN_MGMT"},
                    {"name": "Students", "path": "/students", "feature": "ADMIN_MGMT"},
                    {"name": "Roles", "path": "/roles", "feature": "ADMIN_MGMT"},
                ]
            },
            {
                "name": "Admissions", "level": 1, "icon": "admissionsIcon", "sort_order": 3,
                "children": [
                    {"name": "Enrollment", "path": "/admissions/enrollment", "feature": "ADMISSIONS_MGMT"},
                ]
            },
            {
                "name": "Academics", "level": 1, "icon": "academicsIcon", "sort_order": 4,
                "children": [
                    {"name": "Mark Attendance", "path": "/attendance/mark", "feature": "ACADEMIC_MGMT"},
                    {"name": "Attendance Report", "path": "/attendance/report", "feature": "ACADEMIC_MGMT"},
                    {"name": "Academic Years", "path": "/academic-years", "feature": "ACADEMIC_MGMT"},
                    {"name": "Classes", "path": "/classes", "feature": "ACADEMIC_MGMT"},
                    {"name": "Subjects", "path": "/subjects", "feature": "ACADEMIC_MGMT"},
                    {"name": "Holiday Configuration", "path": "/academics/configuration/holidays", "feature": "ACADEMIC_MGMT"},
                    {"name": "Academic Calendar", "path": "/calendar/academic", "feature": "ACADEMIC_MGMT"},
                    {"name": "Homework", "path": "/homework", "feature": "HOMEWORK_MGMT"},
                    {"name": "Homework Details", "path": "/homework/:id", "feature": "HOMEWORK_MGMT"},
                    {"name": "Photo / Video Gallery", "path": "/activity-management/photo-video-gallery", "feature": "ACTIVITY_GALLERY_MGMT"},
                ]
            },
            {
                "name": "Fees", "level": 1, "icon": "feesIcon", "sort_order": 5,
                "children": [
                    {"name": "Invoice List", "path": "/fees/invoices", "feature": "FEE_MGMT"},
                    {"name": "Fee Due List", "path": "/fees/due-list-v2", "feature": "FEE_MGMT"},
                    {"name": "Fee Collection", "path": "/fees/collect-payment", "feature": "FEE_MGMT"},
                    {"name": "Fee Category", "path": "/fees/categories", "feature": "FEE_MGMT"},
                    {"name": "Fee Structure", "path": "/fees/setup", "feature": "FEE_MGMT"},
                    {"name": "Fee Discount", "path": "/fees/discounts", "feature": "FEE_MGMT"},
                    {"name": "Fee Report", "path": "/fees/reports", "feature": "FEE_MGMT"},
                ]
            },
            {
                "name": "Staff", "level": 1, "icon": "staffIcon", "sort_order": 6,
                "children": [
                    {"name": "Staff List", "path": "/staff", "feature": "STAFF_MGMT"},
                    {"name": "Teachers", "path": "/teachers", "feature": "TEACHER_MGMT"},
                    {"name": "Assigned Class Teachers", "path": "/teacher-assignments", "feature": "TEACHER_MGMT"},
                ]
            },
            {
                "name": "Reports", "level": 1, "icon": "reportsIcon", "sort_order": 7,
                "children": [
                    {"name": "General Reports", "path": "/reports/general", "feature": "REPORTS_MGMT"},
                    {"name": "Sprint Performance", "path": "/reports/sprint-performance", "feature": "REPORTS_MGMT"},
                    {"name": "Sprintwise Performance", "path": "/reports/sprintwise-performance", "feature": "REPORTS_MGMT"},
                ]
            },
            {
                "name": "System Config", "level": 1, "icon": "settingsIcon", "sort_order": 8,
                "children": [
                    {"name": "Theme Studio", "path": "/admin/theme-studio", "feature": "SYSTEM_CONFIG"},
                    {"name": "Permission Mapping", "path": "/admin/permission-management", "feature": "SYSTEM_CONFIG"},
                    {"name": "Sprints", "path": "/sprints", "feature": "SPRINT_MGMT"},
                ]
            },
            {
                "name": "Communication", "level": 1, "icon": "chatIcon", "sort_order": 9,
                "children": [
                    {"name": "Create Notices", "path": "/communication/notices", "feature": "COMMUNICATION_MGMT"},
                ]
            }
        ]

        # 3. Create Menus
        for p_data in hierarchy:
            # Check for parent
            parent = db.query(Menu).filter(Menu.name == p_data["name"], Menu.level == 1).first()
            if not parent:
                parent = Menu(
                    name=p_data["name"],
                    level=1,
                    icon=p_data["icon"],
                    sort_order=p_data["sort_order"],
                    is_active=True
                )
                db.add(parent)
                db.flush()
                print(f"[SEED] Created Parent: {p_data['name']}")
            else:
                # Update parent if needed
                parent.icon = p_data["icon"]  # type: ignore
                parent.sort_order = p_data["sort_order"]  # type: ignore
                print(f"[SEED] Updated Parent: {p_data['name']}")

            # Check for children
            if "children" in p_data:
                for c_data in p_data["children"]:
                    child = db.query(Menu).filter(Menu.name == c_data["name"], Menu.parent_id == parent.id).first()
                    fid = feature_map.get(c_data["feature"])
                    if not child:
                        child = Menu(
                            name=c_data["name"],
                            path=c_data["path"],
                            parent_id=parent.id,
                            level=2,
                            feature_id=fid,
                            is_active=True
                        )
                        db.add(child)
                        print(f"[SEED] Created Child: {c_data['name']} under {p_data['name']}")
                    else:
                        child.path = c_data["path"]  # type: ignore
                        if fid is not None:
                            child.feature_id = fid  # type: ignore
                        print(f"[SEED] Updated Child: {c_data['name']}")

        # NOTE: Catalog menus are NOT auto-assigned to tenant ADMIN roles.
        # System admin must grant permissions manually via Permission Management.
        db.commit()
        print("[SEED] RBAC seeding completed successfully.")
        
    except Exception as e:
        import traceback
        db.rollback()
        print(f"[SEED] Error during seeding: {str(e)}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_rbac_data()
