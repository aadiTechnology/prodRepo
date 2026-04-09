/**
 * Feedback — UI Primitives
 * Single point of access to MUI Alert and Snackbar.
 */

import { Alert as MuiAlert, Snackbar as MuiSnackbar } from "@mui/material";

export type AlertProps = React.ComponentProps<typeof MuiAlert>;
export type SnackbarProps = React.ComponentProps<typeof MuiSnackbar>;

export const Alert = MuiAlert;
export const Snackbar = MuiSnackbar;

