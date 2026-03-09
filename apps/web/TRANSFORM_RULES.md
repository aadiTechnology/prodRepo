# Step 2 — Deterministic Transform Rules

| Pattern | Replace With |
|---------|--------------|
| `Button` with text "Save" / "Saving..." / "Save Changes" / "Save User" / "Save Role" / "Update" (form primary) | `SaveButton` |
| `Button` with text "Cancel" | `CancelButton` |
| `TextField` type="email" or label="Email" / "Email Address" (no type) | `EmailInput` |
| `TextField` type="tel" or label="Phone" | `PhoneInput` |
| `TextField` type="password" or name/label contains "password" | `PasswordInput` |
| `TextField` (generic) | `TextField` (from primitives) |
| `Select` + `FormControl` + `InputLabel` | `Select` (from primitives, label prop) |
| `MenuItem` | `MenuItem` (from primitives after re-export added) |
| `Dialog` | `Dialog` (from primitives) |
| `DialogTitle` / `DialogContent` / `DialogActions` | same from primitives |
| `Checkbox` | `Checkbox` (from primitives) |
| `Button` (other: Confirm, Retry, etc.) | `Button` (from primitives) |

Rules: preserve all props; only swap component and import. No logic/handler/API/routing changes.
