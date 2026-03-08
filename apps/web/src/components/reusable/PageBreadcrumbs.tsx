/**
 * PageBreadcrumbs — Reusable (Phase 7.5)
 * Breadcrumb navigation for detail pages. Theme-driven.
 * Items: last item typically has no `to` (current page).
 */

import { Breadcrumbs, Link, Typography, Box, SxProps, Theme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ReactNode } from "react";

export interface PageBreadcrumbItem {
  label: ReactNode;
  /** Route path; omit for current page (last item). */
  to?: string;
}

export interface PageBreadcrumbsProps {
  items: PageBreadcrumbItem[];
  /** Spacing below (theme.spacing multiplier). Default 2.5. */
  spacing?: number;
  sx?: SxProps<Theme>;
}

export default function PageBreadcrumbs({
  items,
  spacing = 2.5,
  sx,
}: PageBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <Box sx={{ mb: spacing, ...sx }}>
      <Breadcrumbs>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          if (item.to != null && !isLast) {
            return (
              <Link
                key={index}
                component={RouterLink}
                to={item.to}
                underline="hover"
                sx={(theme) => ({
                  fontSize: theme.typography.body2.fontSize,
                  color: theme.palette.text.secondary,
                })}
              >
                {item.label}
              </Link>
            );
          }
          return (
            <Typography
              key={index}
              sx={(theme) => ({
                fontSize: theme.typography.body2.fontSize,
                color: theme.palette.text.primary,
                fontWeight: theme.typography.fontWeightBold,
              })}
            >
              {item.label}
            </Typography>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
