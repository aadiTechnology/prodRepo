/**
 * ReviewStatusBadge — Semantic component
 * Displays draft / approved / rejected status using design tokens.
 */

import { Box, Typography } from "../primitives";
import { colorTokens } from "../../tokens";
import { radiusTokens } from "../../tokens";

export type ReviewStatus = "draft" | "approved" | "rejected";

export interface ReviewStatusBadgeProps {
  status: ReviewStatus;
}

const statusConfig: Record<
  ReviewStatus,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: "Draft",
    bg: colorTokens.semantic.draft,
    text: colorTokens.text.inverse,
  },
  approved: {
    label: "Approved",
    bg: colorTokens.success.main,
    text: colorTokens.success.contrast,
  },
  rejected: {
    label: "Rejected",
    bg: colorTokens.semantic.rejected,
    text: colorTokens.text.inverse,
  },
};

export default function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.5,
        py: 0.5,
        borderRadius: radiusTokens.lg,
        backgroundColor: config.bg,
        color: config.text,
        fontSize: "0.75rem",
        fontWeight: 700,
      }}
    >
      <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
        {config.label}
      </Typography>
    </Box>
  );
}
