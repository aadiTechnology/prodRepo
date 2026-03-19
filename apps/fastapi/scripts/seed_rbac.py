import sys
import os

# Add apps/fastapi to sys.path to allow importing from 'app'
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import Feature, Menu 
from datetime import datetime

def seed_rbac_data():
    db: Session = SessionLocal()
    try:
        print("[SEED] Starting Comprehensive RBAC seeding...")
        
        # 1. Features
        features_data = [
            {"code": "CORE", "name": "Core System", "category": "System"},
            {"code": "ADMIN_MGMT", "name": "Administration Management", "category": "Admin"},
            {"code": "ACADEMIC_MGMT", "name": "Academic Management", "category": "Academics"},
            {"code": "FEE_MGMT", "name": "Fee Management", "category": "Finance"},
            {"code": "STAFF_MGMT", "name": "Staff Management", "category": "HR"},
            {"code": "REPORTS_MGMT", "name": "Reports Management", "category": "Reports"},
            {"code": "SYSTEM_CONFIG", "name": "System Configuration", "category": "System"},
        ]
        
        feature_map = {}
        for f in features_data:
            feature = db.query(Feature).filter(Feature.code == f["code"]).first()
            if not feature:
                feature = Feature(**f, is_active=True)
                db.add(feature)
                db.flush()
                print(f"[SEED] Created feature: {f['code']}")
            feature_map[f["code"]] = feature.id

        # 2. Hierarchy Data
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
                "name": "Academics", "level": 1, "icon": "academicsIcon", "sort_order": 3,
                "children": [
                    {"name": "Attendance", "path": "/academics/attendance", "feature": "ACADEMIC_MGMT"},
                    {"name": "Academic Years", "path": "/academic-years", "feature": "ACADEMIC_MGMT"},
                ]
            },
            {
                "name": "Fees", "level": 1, "icon": "feesIcon", "sort_order": 4,
                "children": [
                    {"name": "Fee Collection", "path": "/fees/collection", "feature": "FEE_MGMT"},
                    {"name": "Fee Category", "path": "/fees/categories", "feature": "FEE_MGMT"},
                    {"name": "Fee Structure", "path": "/fees/setup", "feature": "FEE_MGMT"},
                    {"name": "Fee Discount", "path": "/fees/discounts", "feature": "FEE_MGMT"},
                ]
            },
            {
                "name": "Staff", "level": 1, "icon": "staffIcon", "sort_order": 5,
                "children": [
                    {"name": "Staff List", "path": "/staff", "feature": "STAFF_MGMT"},
                ]
            },
            {
                "name": "Reports", "level": 1, "icon": "reportsIcon", "sort_order": 6,
                "children": [
                    {"name": "General Reports", "path": "/reports/general", "feature": "REPORTS_MGMT"},
                ]
            },
            {
                "name": "System Config", "level": 1, "icon": "settingsIcon", "sort_order": 7,
                "children": [
                    {"name": "Theme Studio", "path": "/admin/theme-studio", "feature": "SYSTEM_CONFIG"},
                    {"name": "Permission Mapping", "path": "/roles/permissions", "feature": "SYSTEM_CONFIG"},
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
                parent.icon = p_data["icon"]
                parent.sort_order = p_data["sort_order"]
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
                        child.path = c_data["path"]
                        child.feature_id = fid
                        print(f"[SEED] Updated Child: {c_data['name']}")

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
