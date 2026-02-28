/**
 * MUI Theme Typography Configuration
 * Aadi Technology SaaS Design System (V1)
 * Page Title 20px/600, Section 16px/600, Field Label 14px/500, Normal 14px, Helper 12px, Error 12px/#DC2626
 */

import { TypographyOptions } from "@mui/material/styles/createTypography";

export const typography: TypographyOptions = {
  fontFamily: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(","),
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: {
    fontSize: "1.25rem", // 20px - Page Title
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: "0em",
  },
  h2: {
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0em",
  },
  h3: {
    fontSize: "1rem", // 16px - Section Title
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: "0em",
  },
  h4: {
    fontSize: "1.25rem", // 20px
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: "0em",
  },
  h5: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: "0em",
  },
  h6: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.6,
    letterSpacing: "0em",
  },
  subtitle1: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0.00938em",
  },
  subtitle2: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.57,
    letterSpacing: "0.00714em",
  },
  body1: {
    fontSize: "0.875rem", // 14px - Normal Text
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0.00938em",
  },
  body2: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: "0.01071em",
  },
  button: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.75,
    letterSpacing: "0.02857em",
    textTransform: "none",
  },
  caption: {
    fontSize: "0.75rem", // 12px - Helper Text
    fontWeight: 400,
    lineHeight: 1.66,
    letterSpacing: "0.03333em",
  },
  overline: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 2.66,
    letterSpacing: "0.08333em",
    textTransform: "uppercase",
  },
};
