import { Autocomplete, TextField } from "../primitives";

export type SearchableOption = {
  id: number;
  label: string;
};

export interface SearchableSelectProps {
  label: string;
  valueId: number | null;
  options: SearchableOption[];
  onChangeId: (id: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
}

export default function SearchableSelect({
  label,
  valueId,
  options,
  onChangeId,
  placeholder,
  disabled,
  fullWidth = true,
  size = "small",
}: SearchableSelectProps) {
  const value = valueId == null ? null : options.find((o) => o.id === valueId) ?? null;

  return (
    <Autocomplete<SearchableOption, false, false, false>
      options={options}
      value={value}
      disabled={disabled}
      fullWidth={fullWidth}
      autoHighlight
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_e, v) => onChangeId(v?.id ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
        />
      )}
    />
  );
}

