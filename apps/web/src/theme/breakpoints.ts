/**
 * MUI Theme Breakpoints Configuration
 * Defines responsive breakpoints matching the UI Resolution Chart:
 *   xs: mobile     0–600px
 *   sm: tablet     600–900px   (Tabs / mini iPads ≤ 900)
 *   md: sm-laptop  900–1200px  (Small Screen Laptops ≤ 1200)
 *   lg: md-desktop 1200–1600px (Medium Screen Laptops / Desktops ≤ 1600)
 *   xl: lg-screen  ≥ 1600px    (Large screen Laptops / Desktops ≥ 1600)
 */

import { BreakpointsOptions } from "@mui/material/styles";

export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1600,
  },
};
