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

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main heading (e.g. "Please Confirm"). */
  title?: string;
  /** Body message. */
  message: string;
  /** Confirm button label. */
  confirmLabel?: string;
  /** Cancel button label. */
  cancelLabel?: string;
  /** Disable buttons and show loading state on confirm. */
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Please Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 600,
          width: "100%",
          p: 0,
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translate(-50%, 0)",
          height: "30%",
          minHeight: "20px",
          overflowY: "auto",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={(theme) => ({
          bgcolor: theme.palette.grey[800],
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
              fontSize: 50,
              color: theme.palette.success.main,
              mr: 2,
              p: 0,
            })}
          />
          <Typography
            sx={(theme) => ({
              fontWeight: 175,
              fontSize: "1.9rem",
              color: theme.palette.text.primary,
              letterSpacing: "-1px",
              lineHeight: 1.1,
            })}
          >
            {title}
          </Typography>
        </Box>
        <Typography
         sx={(theme) => ({
         fontSize: "1.05rem",
         textAlign: "center",
         pr:49,
         ml:10,
         mb:5,
         color: theme.palette.text.primary,
         fontWeight: 125,
         })}
        >
         {message}
        </Typography>
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
          <CancelButton onClick={onClose} disabled={loading}>
            {cancelLabel}
          </CancelButton>
          <Button
            onClick={onConfirm}
            disabled={loading}
            sx={(theme) => ({
            color: theme.palette.success.main,
            backgroundColor: "transparent",
            boxShadow: "none",
            border: "none",
            fontWeight: "bold",
            fontSize: "1.1rem",
            px: 4,
            minWidth: 120,
            "&:hover": { backgroundColor: "transparent", textDecoration: "underline" },
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