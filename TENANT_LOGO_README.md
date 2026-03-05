# Tenant Logo & Branding Feature — Deployment Guide

This document identifies which files to push to production for the **Tenant Logo and Branding** feature and provides the necessary deployment steps.

## 🚀 Files to PUSH (Production)

Please include ONLY these files in your commit to ensure the feature works correctly without including temporary test scripts.

### Backend (FastAPI)
| Directory | File | Description |
| :--- | :--- | :--- |
| `apps/fastapi/alembic/versions/` | `add_logo_and_address_to_tenants.py` | DB Migration: Adds `logo_url` and address fields. |
| `apps/fastapi/alembic/versions/` | `increase_logo_url_length.py` | DB Migration: Sets `logo_url` to `NVARCHAR(MAX)`. |
| `apps/fastapi/app/models/` | `tenant.py` | Adds `logo_url` and Address fields to SQL model. |
| `apps/fastapi/app/routers/` | `auth.py` | Returns tenant branding in login context and `/me`. |
| `apps/fastapi/app/routers/` | `user.py` | Ensures tenant mapping for new users. |
| `apps/fastapi/app/schemas/` | `auth.py` | Updates Pydantic schemas for Login Response. |
| `apps/fastapi/app/schemas/` | `tenant.py` | Updates Pydantic schemas for Tenant CRUD. |
| `apps/fastapi/app/services/` | `tenant_service.py` | Core logic for logo upload and provision workflow. |
| `apps/fastapi/app/services/` | `user_service.py` | Tenant-sensitive user creation logic. |

### Frontend (React)
| Directory | File | Description |
| :--- | :--- | :--- |
| `apps/web/src/context/` | `AuthContext.tsx` | Persists Tenant branding data in localStorage. |
| `apps/web/src/layout/` | `MainLayout.tsx` | Header logic to show Tenant Logo or Name. |
| `apps/web/src/pages/tenants/` | `AddTenant.tsx` | New Form UI with Upload/URL tabs for Logo. |
| `apps/web/src/pages/tenants/` | `TenantList.tsx` | Adds Logo column to the tenant directory table. |
| `apps/web/src/types/` | `auth.ts` | TypeScript interfaces for User with Tenant branding. |
| `apps/web/src/types/` | `rbac.ts` | TypeScript interfaces for Login Context response. |
| `apps/web/src/types/` | `tenant.ts` | TypeScript interfaces for Tenant objects. |

---

## 🛑 Files to EXCLUDE / DELETE (Local Only)

Do **NOT** push these files. They are temporary scripts used for testing and schema verification:
- `apps/fastapi/check_schema.py`
- `apps/fastapi/check_schema_detailed.py`
- `apps/fastapi/test_db.py`
- `apps/fastapi/test_update.py`

---

## 🛠 Deployment Steps

Follow these steps on the server after pushing the files:

### 1. Database Migration
Run the following command in the `apps/fastapi` directory to apply the new table columns:
```bash
alembic upgrade head
```

### 2. Backend Dependencies
No new packages were added, but ensure the environment is active:
```bash
# Example
pip install -r requirements.txt
```

### 3. Frontend Build
Navigate to the `apps/web` directory and run the production build:
```bash
npm install
npm run build
```

---

## 📝 Change Summary

1.  **Multi-Tenancy Branding**: Tenant users now see their own company logo in the header instead of the default landing logo.
2.  **Admin Control**: System Admins can now manage tenant logos (upload local files or provide external URLs) and update address information.
3.  **Automatic Fallback**: If a tenant has no logo, the system automatically displays the Tenant Name in a professional font.
4.  **Resilient Header**: The header automatically detects changes to the logo URL and refreshes without requiring a re-login.
