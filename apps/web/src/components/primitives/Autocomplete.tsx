/**
 * Autocomplete — UI Primitive
 * Single point of access to MUI Autocomplete. Theme-driven via tokens/theme.
 */

import { Autocomplete as MuiAutocomplete } from "@mui/material";
import type { AutocompleteProps as MuiAutocompleteProps } from "@mui/material";

export type AutocompleteProps<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
> = MuiAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>;

export default function Autocomplete<
  T,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>(props: AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) {
  return <MuiAutocomplete {...props} />;
}

