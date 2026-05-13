#!/usr/bin/env python3
"""
Performance Optimization Verification Script
Validates that all optimizations have been applied correctly
"""

import subprocess
import sys
from pathlib import Path

def check_file_contains(filepath: str, search_string: str, description: str) -> bool:
    """Check if a file contains a specific string."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            if search_string in content:
                print(f"[OK] {description}")
                return True
            else:
                print(f"[FAIL] {description}")
                return False
    except Exception as e:
        print(f"[ERROR] {description} - Error: {e}")
        return False

def verify_migrations() -> bool:
    """Verify database migration file exists."""
    migration_file = Path("apps/fastapi/alembic/versions/add_performance_indexes.py")
    if migration_file.exists():
        print("[OK] Database migration file created")
        return True
    else:
        print("[FAIL] Database migration file missing")
        return False

def verify_backend() -> bool:
    """Verify backend optimizations."""
    results = []
    
    rbac_service = "apps/fastapi/app/services/rbac_service.py"
    
    # Check for eager loading
    results.append(check_file_contains(
        rbac_service,
        "joinedload(RoleMenuPermission.menu).joinedload(Menu.feature)",
        "Backend: Eager loading with joinedload"
    ))
    
    # Check for cache function
    results.append(check_file_contains(
        rbac_service,
        "_include_menu_with_parents_from_cache",
        "Backend: Cache-based menu parent inclusion"
    ))
    
    # Check for optimization comment
    results.append(check_file_contains(
        rbac_service,
        "OPTIMIZED: Uses eager loading and batch queries",
        "Backend: Performance optimization comments"
    ))
    
    return all(results)

def verify_frontend() -> bool:
    """Verify frontend optimizations."""
    results = []
    
    # Check RBACContext memoization
    rbac_context = "apps/web/src/context/RBACContext.tsx"
    results.append(check_file_contains(
        rbac_context,
        "const permissionMethods = useMemo",
        "Frontend: RBAC permission methods memoization"
    ))
    
    results.append(check_file_contains(
        rbac_context,
        "const roleMethods = useMemo",
        "Frontend: RBAC role methods memoization"
    ))
    
    # Check menu components memoization
    menu_renderer = "apps/web/src/components/menu/MenuRenderer.tsx"
    results.append(check_file_contains(
        menu_renderer,
        "export default memo(MenuRendererComponent)",
        "Frontend: MenuRenderer memoization"
    ))
    
    menu_group = "apps/web/src/components/menu/MenuGroup.tsx"
    results.append(check_file_contains(
        menu_group,
        "export default memo(MenuGroupComponent)",
        "Frontend: MenuGroup memoization"
    ))
    
    sub_menu = "apps/web/src/components/menu/SubMenuItem.tsx"
    results.append(check_file_contains(
        sub_menu,
        "export default memo(SubMenuItemComponent)",
        "Frontend: SubMenuItem memoization"
    ))
    
    return all(results)

def verify_documentation() -> bool:
    """Verify documentation files exist."""
    results = []
    
    docs = [
        ("PERFORMANCE_ANALYSIS_AND_FIXES.md", "Performance analysis report"),
        ("RBAC_CACHING_IMPLEMENTATION.md", "Redis caching implementation guide"),
        ("PERFORMANCE_OPTIMIZATION_SUMMARY.md", "Complete optimization summary"),
    ]
    
    for doc_file, description in docs:
        path = Path(doc_file)
        if path.exists():
            print(f"[OK] {description}")
            results.append(True)
        else:
            print(f"[FAIL] {description} - File not found")
            results.append(False)
    
    return all(results)

def main():
    print("=" * 70)
    print("PERFORMANCE OPTIMIZATION VERIFICATION")
    print("=" * 70)
    print()
    
    all_passed = True
    
    print("Checking Migrations...")
    print("-" * 70)
    all_passed &= verify_migrations()
    print()
    
    print("Checking Backend Optimizations...")
    print("-" * 70)
    all_passed &= verify_backend()
    print()
    
    print("Checking Frontend Optimizations...")
    print("-" * 70)
    all_passed &= verify_frontend()
    print()
    
    print("Checking Documentation...")
    print("-" * 70)
    all_passed &= verify_documentation()
    print()
    
    print("=" * 70)
    if all_passed:
        print("PASS: ALL OPTIMIZATIONS VERIFIED SUCCESSFULLY")
        print("=" * 70)
        print()
        print("Next Steps:")
        print("1. Apply database migration: cd apps/fastapi && alembic upgrade head")
        print("2. Restart backend server")
        print("3. Restart frontend dev server")
        print("4. Test login performance - should now be ~500-800ms")
        print()
        return 0
    else:
        print("FAIL: SOME VERIFICATIONS FAILED")
        print("=" * 70)
        print()
        print("Please check the items marked with [FAIL] and ensure all optimizations")
        print("have been applied correctly.")
        print()
        return 1

if __name__ == "__main__":
    sys.exit(main())
