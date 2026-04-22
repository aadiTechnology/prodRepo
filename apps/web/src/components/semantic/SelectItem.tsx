import MenuItem from "../primitives/MenuItem";
import Select, { type SelectProps } from "../primitives/Select";

export type SelectItemOption = {
  id: string;
  value: string;
  label: string;
  textColor?: string;
  fontWeight?: number;
};

export interface SelectItemProps extends Omit<SelectProps, "children" | "label" | "name" | "onChange"> {
  options: SelectItemOption[];
  loading?: boolean;
  onValueChange: (value: string | string[]) => void;
  label?: string;
  name?: string;
  emptyOptionLabel?: string;
  disableWhenEmpty?: boolean;
  loadingLabel?: string;
  emptyListLabel?: string;
}

export default function SelectItem({
  options,
  loading = false,
  value,
  onValueChange,
  disabled,
  sx,
  required = true,
  label = "Select",
  name = "select",
  emptyOptionLabel,
  disableWhenEmpty = true,
  loadingLabel = "Loading...",
  emptyListLabel = "No options available",
  ...props
}: SelectItemProps) {
  const computedDisabled =
    disabled ?? (loading || (disableWhenEmpty && options.length === 0));
  const isMultiple = Boolean((props as { multiple?: boolean }).multiple);

  return (
    <Select
      fullWidth
      label={label}
      name={name}
      value={value}
      required={required}
      disabled={computedDisabled}
      onChange={(event) => {
        const v = event.target.value;
        if (isMultiple) {
          if (Array.isArray(v)) {
            onValueChange(v.map((item) => String(item)));
          } else {
            onValueChange(String(v ?? "").split(",").filter(Boolean));
          }
          return;
        }
        onValueChange(typeof v === "string" ? v : String(v ?? ""));
      }}
      sx={[
        { bgcolor: "background.paper" },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {loading ? (
        <MenuItem value="" disabled>
          {loadingLabel}
        </MenuItem>
      ) : options.length === 0 && disableWhenEmpty ? (
        <MenuItem value="" disabled>
          {emptyListLabel}
        </MenuItem>
      ) : (
        [
          ...(emptyOptionLabel
            ? [
                <MenuItem key="__empty" value="">
                  <em>{emptyOptionLabel}</em>
                </MenuItem>,
              ]
            : []),
          ...options.map((option) => (
            <MenuItem
              key={option.id}
              value={String(option.value)}
              sx={{
                color: option.textColor,
                fontWeight: option.fontWeight,
              }}
            >
              {option.label}
            </MenuItem>
          )),
        ]
      )}
    </Select>
  );
}
