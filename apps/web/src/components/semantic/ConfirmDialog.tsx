/**
 * ConfirmDialog — Semantic component
 * Reusable confirmation dialog with header, icon, message, and Cancel/Confirm actions.
 * Uses Dialog primitive; encapsulates layout and styling.
 */

import { Dialog } from "../primitives";
import { Box, Divider, IconButton, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import { Button } from "../primitives";
import CancelButton from "./CancelButton";
import { colorTokens } from "../../tokens/colors";
import React from "react";
import { alpha } from "@mui/material/styles";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main heading (e.g. "Please Confirm"). */
  title?: string;
  /** Body message. */
  message?: string | React.ReactNode;
  /** Optional Custom node for message */
  messageNode?: React.ReactNode;
  /** Optional Warning block */
  warningContent?: React.ReactNode;
  /** Confirm button label. */
  confirmLabel?: string;
  /** Cancel button label. */
  cancelLabel?: string;
  /** Disable buttons and show loading state on confirm. */
  loading?: boolean;
  /** Stable test hook for the dialog root. */
  "data-testid"?: string;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Please Confirm",
  message,
  messageNode,
  warningContent,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  "data-testid": dataTestId,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") return;
        onClose();
      }}
      disableRestoreFocus
      data-testid={dataTestId}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 420,
          width: "calc(100% - 32px)",
          p: 0,
          m: 2,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={(theme) => ({
          background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          px: 2,
          py: 0.1,
          minHeight: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          boxShadow: theme.shadows[2],
        })}
      >
        <Box />
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={loading}
          data-testid="btn-close"
          sx={{ color: "white", bgcolor: "transparent", borderRadius: 2 }}
        >
          <CancelIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Box>
      {/* Body */}
      <Box
        sx={(theme) => ({
          px: 4,
          pt: 4,
          pb: 2.5,
          bgcolor: theme.palette.background.paper,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          textAlign: "left",
        })}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 0.25 }}>
          <CheckIcon
            sx={(theme) => ({
              fontSize: 32,
              color: theme.palette.success.main,
              mr: 1.5,
              p: 0,
            })}
          />
          <Typography
            variant="h6"
            sx={(theme) => ({
              fontWeight: 700,
              color: theme.palette.text.primary,
              lineHeight: 1.25,
            })}
          >
            {title}
          </Typography>
        </Box>
        {message && typeof message === "string" && (
          <Typography
            variant="body1"
            sx={(theme) => ({
              textAlign: "center",
              mb: 3,
              mt: 1,
              color: theme.palette.text.secondary,
              px: 1,
            })}
          >
            {message}
          </Typography>
        )}
        {message && typeof message !== "string" && (
           <Box sx={{ pr: 49, ml: 10, mb: 5 }}>{message}</Box>
        )}
        {messageNode && (
           <Box sx={{ pr: 49, ml: 10, mb: 5 }}>{messageNode}</Box>
        )}
        {warningContent && (
           <Box sx={{ px: 4, mb: 2 }}>{warningContent}</Box>
        )}
        <Divider sx={{ my: 0.5 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            width: "100%",
            mt: 0.5,
          }}
        >
          <CancelButton onClick={onClose} disabled={loading} data-testid="btn-cancel">
            {cancelLabel}
          </CancelButton>
          <Button
            autoFocus
            onClick={onConfirm}
            disabled={loading}
            data-testid="btn-confirm"
            sx={(theme) => ({
            color: theme.palette.success.main,
            backgroundColor: "transparent",
            boxShadow: "none",
            border: "none",
            fontWeight: "bold",
            fontSize: "1.1rem",
            px: 4,
            minWidth: 120,
            "&:hover": { 
              backgroundColor: alpha(theme.palette.success.main, 0.1), 
              textDecoration: "none",
              borderRadius: theme.shape.borderRadius,
            },
            "&:disabled": { color: theme.palette.grey[400] },
          })}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
