import { useRef, type ChangeEvent } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { TextField, IconButton, InputAdornment, type TextFieldProps } from "../primitives";
import { todayDateInputValue } from "../../utils/dateInput";

export interface DateOfBirthInputProps extends Omit<TextFieldProps, "type"> {
  label?: string;
  htmlInput?: React.InputHTMLAttributes<HTMLInputElement>;
}

export default function DateOfBirthInput({
  label = "Date of Birth",
  value,
  onChange,
  htmlInput,
  slotProps,
  ...props
}: DateOfBirthInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const maxDate = todayDateInputValue();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (next && next > maxDate) return;
    onChange?.(event);
  };

  const openCalendar = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
  };

  return (
    <TextField
      type="date"
      label={label}
      fullWidth
      variant="outlined"
      value={value ?? ""}
      onChange={handleChange}
      InputLabelProps={{ shrink: true }}
      slotProps={{
        ...slotProps,
        htmlInput: {
          max: maxDate,
          ...htmlInput,
          ...slotProps?.htmlInput,
          ref: inputRef,
        },
        input: {
          ...slotProps?.input,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="Open calendar"
                onClick={openCalendar}
                onMouseDown={(event) => event.preventDefault()}
                edge="end"
                tabIndex={-1}
              >
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      {...props}
    />
  );
}
