/**
 * MUI Theme Component Overrides
 * Aadi Technology SaaS Design System (V1)
 * Button: height 40px, radius 6px. Input: height 40px, radius 6px, focus #2563EB.
 */

import { Components, Theme } from "@mui/material/styles";

export const components = (theme: Theme): Components => ({
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        minHeight: 40,
        padding: "8px 16px",
        textTransform: "none",
        fontWeight: 500,
      },
      contained: {
        backgroundColor: "#2563EB",
        "&:hover": {
          backgroundColor: "#1d4ed8",
        },
      },
      outlined: {
        borderColor: "#CBD5E1",
        color: theme.palette.text.primary,
        "&:hover": {
          borderColor: "#94a3b8",
          backgroundColor: "rgba(203, 213, 225, 0.08)",
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        "& .MuiOutlinedInput-root": {
          borderRadius: 6,
          minHeight: 40,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#2563EB",
            borderWidth: 1,
          },
        },
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: "thin",
        scrollbarColor: `${theme.palette.grey[400]} ${theme.palette.background.paper}`,
        "&::-webkit-scrollbar": {
          width: 8,
        },
        "&::-webkit-scrollbar-track": {
          background: theme.palette.background.paper,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.grey[400],
          borderRadius: 4,
          "&:hover": {
            backgroundColor: theme.palette.grey[500],
          },
        },
      },
    },
  },
});
