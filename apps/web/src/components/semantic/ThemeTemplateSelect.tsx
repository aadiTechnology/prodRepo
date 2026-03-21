import MenuItem from "../primitives/MenuItem";
import Select, { type SelectProps } from "../primitives/Select";
import type { ThemeTemplate } from "../../types/themeTemplate";

export interface ThemeTemplateSelectProps
  extends Omit<SelectProps, "children" | "value" | "onChange" | "label" | "name"> {
  templates: ThemeTemplate[];
  value: number | null;
  onValueChange: (id: number | null) => void;
  label?: string;
  name?: string;
}

export default function ThemeTemplateSelect({
  templates,
  value,
  onValueChange,
  label = "Branding Template",
  name = "theme_template_id",
  ...rest
}: ThemeTemplateSelectProps) {
  const strVal = value === null || value === undefined ? "" : String(value);
  return (
    <Select
      label={label}
      name={name}
      value={strVal}
      onChange={(e) => {
        const v = e.target.value;
        onValueChange(v === "" ? null : Number(v));
      }}
      {...rest}
    >
      <MenuItem value="">
        <em>Default Theme</em>
      </MenuItem>
      {templates.map((t) => (
        <MenuItem key={t.id} value={String(t.id)}>
          {t.name}
        </MenuItem>
      ))}
    </Select>
  );
}
