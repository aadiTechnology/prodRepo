/**
 * MUI Theme Configuration
 * Main theme file that combines all theme configurations
 */

import { createTheme, ThemeOptions } from "@mui/material/styles";
import { palette } from "./palette";
import { typography } from "./typography";
import { breakpoints } from "./breakpoints";
import { spacing } from "./spacing";
import { components } from "./components";

const themeOptions: ThemeOptions = {
  palette: {
    // mode: "dark",
  },
  typography,
  breakpoints,
  spacing,
  shape: {
    borderRadius: 8,
  },
};

// Create base theme
const baseTheme = createTheme(themeOptions);

// Create final theme with component overrides
const theme = createTheme({
  ...baseTheme,
  components: components(baseTheme),
});

export default theme;