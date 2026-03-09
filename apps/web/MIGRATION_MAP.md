# Step 1 — Migration Map

## Files importing @mui/material (feature / UI only)

| File | Button | TextField | Select | Checkbox | Dialog | Patterns |
|------|--------|-----------|--------|----------|--------|----------|
| pages/CreateUser.tsx | Save, Cancel (form + dialog) | email, password, full_name, confirm, role (Select) | role (MenuItem) | — | Confirm dialog | Save+Cancel pair |
| pages/ChangePassword.tsx | Save, Cancel | current, new, confirm password | — | — | Confirm dialog | Save+Cancel pair |
| pages/AddRole.tsx | Save, Cancel | name, code, description | — | — | — | Save+Cancel pair |
| pages/ProfilePage.tsx | Save | 3 TextFields | — | — | — | — |
| pages/tenants/AddTenant.tsx | Save, Cancel | many (name, phone, email, password, etc.) | 1 Select | — | — | Save+Cancel pair |
| pages/tenants/TenantDetail.tsx | 3 Buttons | — | — | — | — | — |
| pages/Login.tsx | 1 Button | email, password | — | — | — | — |
| pages/Register.tsx | 1 Button | email, tel, name, etc. | — | — | — | — |
| pages/Users.tsx | — | — | 3 Selects | — | — | — |
| pages/RequirementGeneratePage.tsx | 2 Buttons | 1 TextField | — | — | — | — |
| components/UserForm.tsx | Cancel, Submit | 5 TextField (email, etc.) | Select + MenuItem | — | Dialog | Save+Cancel in dialog |
| components/roles/RoleForm.tsx | Save | 3 TextField, 3 Select | — | — | — | — |
| components/roles/RoleTable.tsx | — | 1 TextField | — | — | — | — |
| components/roles/PermissionGroup.tsx | — | — | — | Checkbox | — | — |
| components/roles/RoleSummaryCards.tsx | 1 Button | — | — | — | — | — |
| components/roles/RoleInfoBox.tsx | 1 Button | — | — | — | — | — |
| components/common/ConfirmDialog.tsx | Cancel, Confirm | — | — | — | Dialog | — |
| components/reusable/FormActionsBar.tsx | Cancel, Primary | — | — | — | — | — |
| components/reusable/ListPageToolbar.tsx | — | TextField (search) | — | — | — | — |
| components/reusable/TablePaginationBar.tsx | — | — | Select | — | — | — |
| components/AIAssistant.tsx | — | 1 TextField | — | — | — | — |
| components/ErrorFallback.tsx | 1 Button | — | — | — | — | — |
| components/ErrorBoundary.tsx | 2 Buttons | — | — | — | — | — |
| layout/Header.tsx | 1 Button | — | — | — | — | — |

## Suggested replacements (pattern-based)

| File | Component | Suggested Replacement |
|------|-----------|------------------------|
| CreateUser.tsx | Button "Save" / "Saving..." | SaveButton |
| CreateUser.tsx | Button "Cancel" | CancelButton |
| CreateUser.tsx | TextField label Email | EmailInput |
| CreateUser.tsx | TextField type password | PasswordInput |
| CreateUser.tsx | TextField (full name, etc.) | TextField (primitive) |
| CreateUser.tsx | Select + MenuItem (role) | Select (primitive) + MenuItem (primitive) |
| CreateUser.tsx | Dialog | Dialog (primitive) |
| ChangePassword.tsx | Button Save / Cancel | SaveButton / CancelButton |
| ChangePassword.tsx | TextField password | PasswordInput |
| ChangePassword.tsx | Dialog | Dialog (primitive) |
| AddRole.tsx | Button Save / Cancel | SaveButton / CancelButton |
| AddRole.tsx | TextField | TextField (primitive) |
| ProfilePage.tsx | Button Save | SaveButton |
| ProfilePage.tsx | TextField | TextField (primitive) |
| AddTenant.tsx | Button Save / Cancel | SaveButton / CancelButton |
| AddTenant.tsx | TextField email | EmailInput |
| AddTenant.tsx | TextField phone | PhoneInput |
| AddTenant.tsx | TextField password | PasswordInput |
| AddTenant.tsx | TextField (other) | TextField (primitive) |
| AddTenant.tsx | Select | Select (primitive) |
| Login.tsx | TextField email | EmailInput |
| Login.tsx | TextField password | PasswordInput |
| Login.tsx | Button | Button (primitive) |
| Register.tsx | TextField email | EmailInput |
| Register.tsx | TextField tel | PhoneInput |
| Register.tsx | TextField (other) | TextField (primitive) |
| Register.tsx | Button | Button (primitive) |
| Users.tsx | Select | Select (primitive) |
| UserForm.tsx | TextField email | EmailInput |
| UserForm.tsx | TextField | TextField (primitive) |
| UserForm.tsx | Select | Select (primitive) |
| UserForm.tsx | Dialog | Dialog (primitive) |
| UserForm.tsx | Button Cancel / Submit | CancelButton / SaveButton |
| RoleForm.tsx | TextField | TextField (primitive) |
| RoleForm.tsx | Select | Select (primitive) |
| RoleForm.tsx | Button Save | SaveButton |
| RoleTable.tsx | TextField | TextField (primitive) |
| PermissionGroup.tsx | Checkbox | Checkbox (primitive) |
| ConfirmDialog.tsx | Dialog, Button | Dialog, CancelButton, Button (confirm) |
| FormActionsBar.tsx | Button | Button (primitive) |
| ListPageToolbar.tsx | TextField | TextField (primitive) |
| TablePaginationBar.tsx | Select | Select (primitive) |
| ErrorFallback.tsx | Button | Button (primitive) |
| ErrorBoundary.tsx | Button | Button (primitive) |
| Header.tsx | Button | Button (primitive) |
