/**
 * PageHeader Component
 * Consistent header for pages with title and optional actions
 */

import { Box, Typography, IconButton, Tooltip, Stack, TypographyProps } from "@mui/material";
import { ReactNode } from "react";
import { ArrowBack as BackIcon } from "@mui/icons-material";

interface Props {
  title: string | ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  backIcon?: ReactNode;
  titleVariant?: TypographyProps["variant"];
  sx?: any;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
  backIcon,
  titleVariant = "h5",
  sx = {}
}: Props) {
  return (
    <Box
      sx={{
        pt: 1.5,
        pb: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        ...sx
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            sx={{
              backgroundColor: "#1a1a2e",
              borderRadius: 1.2,
              width: 44,
              height: 44,
              "&:hover": { backgroundColor: "#2d2d44" }
            }}
          >
            {backIcon || <BackIcon sx={{ color: "white", fontSize: 24 }} />}
          </IconButton>
        )}
        <Box>
          <Typography
            variant={titleVariant}
            sx={{
              fontWeight: 700,
              fontSize: typeof title === 'string' ? "22px" : undefined,
              color: "#1A1A2E",
              letterSpacing: "-1px"
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, mt: 0.5, opacity: 0.8 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {actions && (
        <Stack direction="row" spacing={2} alignItems="center">
          {actions}
        </Stack>
      )}
    </Box>
  );
}
