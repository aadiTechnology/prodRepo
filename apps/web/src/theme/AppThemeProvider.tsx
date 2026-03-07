/**
 * Theme Provider Integration (Phase 4)
 * Centralized wrapper that applies the token-driven MUI theme to the application.
 * Single entry point for the UI theme system.
 *
 * Flow: Design Tokens → Theme Layer → Theme Provider → Application Components
 */

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { ReactNode } from "react";
import theme from "./theme";

interface AppThemeProviderProps {
  children: ReactNode;
}

export default function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
