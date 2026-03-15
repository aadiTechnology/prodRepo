/**
 * PageHeader — Layout Component (Phase 6)
 * Page title, subtitle, and optional actions. Theme-driven; composes Stack/Box.
 * For use inside PageLayout header slot.
 */

import { Box, Typography, IconButton, Stack, TypographyProps, alpha } from "@mui/material";
import { ReactNode } from "react";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { colorTokens } from "../../tokens/colors";

export interface LayoutPageHeaderProps {
  title: string | ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  backIcon?: ReactNode;
  titleVariant?: TypographyProps["variant"];
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
  backIcon,
  titleVariant = "h5",
}: LayoutPageHeaderProps) {
  return (
    <Box
      sx={{
        pt: 1.5,
        pb: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {onBack && (
          <IconButton
            onClick={onBack}
            aria-label="Go back"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
              borderRadius: 1.2,
              width: 44,
              height: 44,
              color: "#ffffff",
              boxShadow: `0 4px 12px ${alpha(colorTokens.preschool.turquoise.main, 0.2)}`,
              transition: "all 0.2s",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: `0 6px 16px ${alpha(colorTokens.preschool.turquoise.main, 0.3)}`,
              },
            })}
          >
            {backIcon ?? <BackIcon sx={{ fontSize: 24 }} />}
          </IconButton>
        )}
        <Box>
          <Typography
            variant={titleVariant}
            sx={(theme) => ({
              fontWeight: theme.typography.fontWeightBold,
              color: theme.palette.text.primary,
              letterSpacing: theme.typography.body1.letterSpacing,
            })}
          >
            {title}
          </Typography>
          {subtitle != null && (
            <Typography
              variant="body2"
              sx={(theme) => ({
                color: theme.palette.text.secondary,
                fontWeight: theme.typography.fontWeightMedium,
                mt: 0.5,
                opacity: 0.9,
              })}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {actions != null && (
        <Stack direction="row" spacing={2} alignItems="center">
          {actions}
        </Stack>
      )}
    </Box>
  );
}
