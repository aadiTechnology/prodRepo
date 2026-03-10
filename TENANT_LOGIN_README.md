# Tenant Impersonation & Branding Setup Guide

This document outlines how to set up and use the new **Tenant Impersonation** (Tenant Login) and **Branding** features.

## 🚀 Post-Pull Setup

After pulling the latest changes, every team member **must** update their local database schema.

### 1. Update Database
Run the following command from the `apps/fastapi` directory:
```bash
alembic upgrade head
```
This adds the necessary columns (`logo_url`, `address_line1`, `city`, etc.) to the `tenants` table.

---

## 🛠 Features Overview

### 1. Tenant Impersonation ("Login as Tenant")
Allows **System Administrators** to log into the application as a specific Tenant's Admin user without needing their password.

*   **How to use**: 
    1.  Navigate to **Tenant Management** (accessible only by Super/System Admins).
    2.  Locate the tenant in the list.
    3.  Click the **Login (Door icon)** in the actions column.
    4.  The system will automatically switch your session to that tenant's view.
*   **Exiting**: A "Home" icon will appear in the top header. Click it to return to the System Admin view.

### 2. Tenant Branding
Tenants can now have custom logos and addresses.

*   **Logos**: You can provide a direct image URL or upload a logo in the "Add/Edit Tenant" form.
*   **Addresses**: Full address support (Line 1, Line 2, City, State, Pin Code) is now integrated into the tenant profile.
*   **Header Sync**: The application header automatically updates to show the selected tenant's logo and name.

---

## 📁 Technical Changes

### Staged Files for Push
*   **Backend**: `dependencies.py`, `auth.py`, `tenant.py`, `auth_service.py`, `tenant_service.py`, `user_service.py`.
*   **Frontend**: `AuthContext.tsx`, `MainLayout.tsx`, `TenantList.tsx`, `authService.ts`, `tenantService.ts`, and updated Types/Routes.

---

## ⚠️ Important Notes
*   **Role Security**: Only users with **NO tenant_id** (System Admins) can perform impersonation, fewature which use system admin to login in teant through teantlist.. 
*   **Logo Errors**: If a tenant logo URL is invalid, the system will fall back to the default "Aadi Technology" logo automatically.
