/**
 * Button — UI Primitive
 * Single point of access to MUI Button. Styling comes from token-based theme overrides
 * (getComponentsFromTokens: MuiButton borderRadius, fontWeight, etc.). No duplicate sx.
 */

import { Button as MuiButton, ButtonProps as MuiButtonProps } from "@mui/material";

export type ButtonProps = MuiButtonProps;

export default function Button(props: ButtonProps) {
  return <MuiButton {...props} />;
}
