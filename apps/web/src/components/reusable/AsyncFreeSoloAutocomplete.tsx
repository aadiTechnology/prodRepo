import React, { useState, useEffect, useCallback } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

interface AsyncFreeSoloAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fetchSuggestions: (query: string) => Promise<string[]>;
  disabled?: boolean;
}

const AsyncFreeSoloAutocomplete: React.FC<AsyncFreeSoloAutocompleteProps> = ({
  label,
  value,
  onChange,
  fetchSuggestions,
  disabled = false,
}) => {
  const [options, setOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value);

  // Sync inputValue when value prop changes (e.g. pre-population on edit)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const loadSuggestions = useCallback(async (q: string) => {
    if (!q || !q.trim()) {
      setOptions([]);
      return;
    }
    try {
      const suggestions = await fetchSuggestions(q);
      setOptions(suggestions);
    } catch {
      setOptions([]);
    }
  }, [fetchSuggestions]);

  // Debounce: wait 300ms after the user stops typing before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuggestions(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, loadSuggestions]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      filterOptions={(x) => x}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
        onChange(newInputValue);
      }}
      onChange={(_event, newValue) => {
        const val = typeof newValue === "string" ? newValue : "";
        setInputValue(val);
        onChange(val);
      }}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          fullWidth
        />
      )}
    />
  );
};

export default AsyncFreeSoloAutocomplete;
