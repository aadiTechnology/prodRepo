/**
 * Box — UI Primitive
 * Single point of access to MUI Box for layout. Theme-driven when using sx.
 */

import { Box as MuiBox, BoxProps as MuiBoxProps } from "@mui/material";

export type BoxProps = MuiBoxProps;
export const Box = MuiBox;
