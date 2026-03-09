# UI Architecture — Layered Design System

This document describes the layered UI architecture used in the web app. **Do not import `@mui/material` outside of the primitives layer.**

## Layer Flow

```
Design Tokens → Theme → Primitives → Semantic → Form Patterns → React Hook Form → Zod
```

## 1. Primitives (`components/primitives`)

**Single source of MUI usage.** All `@mui/material` imports belong here.

- **Button**, **Typography**, **TextField**, **Select**, **Checkbox**, **Dialog**, **Tabs**, **Tab**
- **IconButton**, **InputAdornment**, **FormControlLabel**, **CircularProgress**
- **Box**, **Stack**, **PageContainer**, **AppCard**, **Section**

**Do not duplicate token-based theme.** Styling for Button, Card, TextField, Dialog (borderRadius, fontWeight, etc.) comes from `themeBuilder/getComponentsFromTokens` (tokens → theme). Primitives are thin wrappers and do not re-apply those values in `sx`; they only add styles not already in theme overrides (e.g. TextField hover/focus).

## 2. Semantic Components (`components/semantic`)

Application intent, not implementation. Built only on primitives.

- **SaveButton**, **CancelButton**, **DeleteButton**
- **EmailInput**, **PhoneInput**, **PasswordInput**

Feature screens should prefer semantic components over raw primitives.

## 3. Form Patterns (`components/patterns`)

Reusable form layouts that combine semantic components and primitives.

- **FormFieldRow** — label + input + optional error (reuses **FieldLabel** from `reusable`; no duplicate label styling)
- **FormActionsSection** — Cancel + Save (or custom primary)
- **FormCard** — card with optional dark header, body, and footer actions

Use these to reduce repeated form layout code.

## 4. React Hook Form Integration (`lib/forms`)

Components that bind primitives/semantic inputs to React Hook Form state.

- **FormTextField**, **FormEmailInput**, **FormPasswordInput**, **FormSelect**, **FormCheckbox**

Use with `Controller` and `control` from `useForm()`. Handles value, onChange, onBlur, and error display.

## 5. Validation (`lib/validation`)

Zod schemas and resolver for React Hook Form.

- **schemas**: `userFormSchema`, `loginSchema`, `changePasswordSchema`, and building blocks (`emailSchema`, `passwordSchema`, etc.)
- **zodResolver**: use with `useForm({ resolver: zodResolver(schema) })`

Validation lives in schemas; UI components stay free of validation logic.

## Theme Constraint

The app uses a **token-based multi-tenant theme**. Primitives and semantic components must:

- Use theme tokens (via `sx={(theme) => ...}` or theme-aware props), not hardcoded colors/spacing.
- Rely on the existing theme from `themeBuilder` and tenant overrides.

## Usage Example (new screen)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/validation";
import { userFormSchema, type UserFormValues } from "@/lib/validation";
import { FormEmailInput, FormPasswordInput, FormSelect, FormTextField } from "@/lib/forms";
import { FormCard, FormActionsSection } from "@/components/patterns";

export function CreateUserForm() {
  const { control, handleSubmit } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { email: "", full_name: "", role_code: "", is_active: true },
  });

  return (
    <FormCard title="New user" actions={<FormActionsSection onSave={handleSubmit(onSubmit)} onCancel={() => {}} />}>
      <FormTextField control={control} name="full_name" textFieldProps={{ label: "Full name" }} />
      <FormEmailInput control={control} name="email" />
      <FormPasswordInput control={control} name="password" />
      {/* ... */}
    </FormCard>
  );
}
```

Existing screens have not been refactored yet; this setup prepares the codebase for incremental migration.
