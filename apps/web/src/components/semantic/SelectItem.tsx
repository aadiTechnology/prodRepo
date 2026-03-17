/**
 * RoleSelect — Semantic component
 * Role dropdown with loading/empty states and consistent styling.
 */

import { MenuItem } from "@mui/material";
import { Select, type SelectProps } from "../primitives"; // adjust import path to your primitives barrel if needed

export type RoleOption = { id: string; code: string; name: string };

export interface RoleSelectProps extends Omit<SelectProps, "children" | "label" | "name" | "onChange"> {
  roles: RoleOption[];
  loadingRoles?: boolean;
  onValueChange: (value: string) => void; // page gets the string directly
}

export default function SelectItem({
  roles,
  loadingRoles = false,
  value,
  onValueChange,
  disabled,
  sx,
  required = true,
  ...props
}: RoleSelectProps) {
    const computedDisabled = disabled ?? (loadingRoles || roles.length === 0);
  return (
    <Select
      fullWidth
      label="Role"
      name="role_code"
      value={value}
      required={required}
      disabled={computedDisabled}
      onChange={(event) => {
        const v = event.target.value;
        onValueChange(typeof v === "string" ? v : String(v ?? ""));
      }}
      sx={[
        { bgcolor: "background.paper" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {loadingRoles ? (
        <MenuItem value="" disabled>
          Loading roles...
        </MenuItem>
      ) : roles.length === 0 ? (
        <MenuItem value="" disabled>
          No roles found
        </MenuItem>
      ) : (
        roles.map((role) => (
          <MenuItem key={role.id} value={role.code}>
            {role.name}
          </MenuItem>
        ))
      )}
    </Select>
  );
}