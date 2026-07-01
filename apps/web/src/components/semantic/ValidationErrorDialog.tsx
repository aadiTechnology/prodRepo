import { Dialog } from "../primitives";
import { Box, Divider, IconButton, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import { Button } from "../primitives";
import { colorTokens } from "../../tokens/colors";

export interface ValidationErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string | null;
  items?: string[];
  "data-testid"?: string;
}

export default function ValidationErrorDialog({
  open,
  onClose,
  title = "Validation Error",
  message,
  items = [],
  "data-testid": dataTestId,
}: ValidationErrorDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableRestoreFocus
      data-testid={dataTestId}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 460,
          width: "calc(100% - 32px)",
          p: 0,
          m: 2,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colorTokens.preschool.coral.main} 0%, ${colorTokens.error.main} 100%)`,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          px: 2,
          py: 0.1,
          minHeight: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          data-testid="btn-close-validation-error"
          sx={{ color: "white", bgcolor: "transparent", borderRadius: 2 }}
        >
          <CancelIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </Box>

      <Box
        sx={(theme) => ({
          px: 4,
          pt: 3,
          pb: 2.5,
          bgcolor: theme.palette.background.paper,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        })}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <ErrorOutlineIcon
            sx={{
              fontSize: 32,
              color: colorTokens.error.main,
              mr: 1.5,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.25 }}>
            {title}
          </Typography>
        </Box>

        {message ? (
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: items.length > 0 ? 2 : 3,
            }}
          >
            {message}
          </Typography>
        ) : null}

        {items.length > 0 ? (
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2.5,
              mb: 3,
              color: "text.primary",
            }}
          >
            {items.map((item) => (
              <Typography key={item} component="li" variant="body2" sx={{ mb: 0.75 }}>
                {item}
              </Typography>
            ))}
          </Box>
        ) : null}

        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
          <Button
            autoFocus
            onClick={onClose}
            data-testid="btn-ok-validation-error"
            sx={{
              color: colorTokens.error.main,
              backgroundColor: "transparent",
              boxShadow: "none",
              border: "none",
              fontWeight: "bold",
              fontSize: "1rem",
              px: 4,
              minWidth: 120,
              "&:hover": {
                backgroundColor: "rgba(211, 47, 47, 0.08)",
              },
            }}
          >
            OK
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
