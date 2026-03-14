/**
 * CommonPageHeader — Reusable page header with Home icon and breadcrumb (parent / current title).
 * Uses same layout and styling as CreateUser/AddRole-style headers. Does not change CSS.
 */

import { Box, IconButton, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import { useNavigate } from "react-router-dom";

export interface CommonPageHeaderProps {
  /** Path for the Home icon (default: "/"). */
  homeHref?: string;
  /** Breadcrumb parent label (e.g. "Users"). */
  parentLabel: string;
  /** Path when parent label is clicked (e.g. "/users"). */
  parentHref: string;
  /** Current page title (e.g. "Add User" or "Edit User"). */
  title: string;
}

export default function CommonPageHeader({
  homeHref = "/",
  parentLabel,
  parentHref,
  title,
}: CommonPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <IconButton
        onClick={() => navigate(homeHref)}
        sx={(theme) => ({
          backgroundColor: theme.palette.grey[800],
          borderRadius: 1.2,
          width: 44,
          height: 44,
          "&:hover": { backgroundColor: theme.palette.grey[700] },
        })}
      >
        <HomeIcon sx={{ color: "white", fontSize: 24 }} />
      </IconButton>
      <Typography
        variant="h5"
        sx={(theme) => ({
          fontWeight: 700,
          fontSize: "22px",
          color: theme.palette.text.primary,
          letterSpacing: "-1px",
        })}
      >
        <Box
          component="span"
          onClick={() => navigate(parentHref)}
          sx={(theme) => ({
            color: theme.palette.text.secondary,
            cursor: "pointer",
            "&:hover": { color: theme.palette.text.primary },
          })}
        >
          {parentLabel}
        </Box>
        <Box
          component="span"
          sx={(theme) => ({ color: theme.palette.grey[400], mx: 1.5 })}
        >
          /
        </Box>
        {title}
      </Typography>
    </Box>
  );
}