/**
 * PageHeader — Layout Component
 * Single header: Home + breadcrumb links (last = current page) + optional actions.
 * For use inside PageLayout header slot.
 */

import { Box, Typography, IconButton, Stack } from "@mui/material";
import { ReactNode } from "react";
import { ChevronRightTwoTone, HomeTwoTone } from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ConfigHubLocationState } from "../../hooks/useConfigHubNavigation";
import { colorTokens } from "../../tokens/colors";
import { alpha } from "@mui/material/styles";

export type NavLink = {
  title: string;
  path: string;
  onClick?: (e: React.MouseEvent) => void;
  state?: Record<string, unknown>;
};

const homeButtonSx = {
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
};

export interface LayoutPageHeaderProps {
  /** Breadcrumb trail; last item is current page. */
  links: NavLink[];
  /** Path for Home icon (default "/"). */
  homePath?: string;
  /** Right-side content (e.g. toolbar or buttons). */
  actions?: ReactNode;
}

function resolvePath(path: string): string {
  return path.toLowerCase().includes("caution") ? `${path}?reload=true` : path;
}

export default function PageHeader({
  links,
  homePath = "/",
  actions,
}: LayoutPageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (link: NavLink) => {
    const locState = location.state as ConfigHubLocationState | null;
    navigate(resolvePath(link.path), {
      state: {
        fromInternal: true,
        ...(locState?.fromConfigHub ? { fromConfigHub: true } : {}),
        ...(link.state || {}),
      },
    });
  };

  return (
    <Box
      sx={{
        pt: 1.5,
        pb: 1.5,
        width: "100%",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: { xs: 1.5, sm: 2 },
        flexWrap: "wrap",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        useFlexGap
        sx={{ minWidth: 0, flex: "1 1 auto", justifyContent: "flex-start" }}
      >
        <Link to={homePath} style={{ textDecoration: "none" }}>
          <IconButton aria-label="Home" sx={homeButtonSx}>
            <HomeTwoTone sx={{ fontSize: 24 }} />
          </IconButton>
        </Link>
        {links.slice(0, -1).map((link, index) => (
          <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ChevronRightTwoTone sx={{ fontSize: "small", color: "text.secondary" }} />
            <Typography
              variant="body1"
              fontSize={{ xs: "12px", sm: "13px", md: "14px", lg: "15px" }}
              sx={(theme) => ({
                fontWeight: theme.typography.fontWeightMedium,
                color: theme.palette.text.primary,
                cursor: "pointer",
                whiteSpace: "nowrap",
                "&:hover": { fontWeight: theme.typography.fontWeightBold },
              })}
              onClick={(e) =>
                link.onClick ? link.onClick(e) : handleNav(link)
              }
            >
              {link.title}
            </Typography>
          </Box>
        ))}
        {links.length > 0 && (
          <>
            <ChevronRightTwoTone sx={{ fontSize: "small", color: "text.secondary" }} />
            <Typography
              variant="body1"
              fontSize={{ xs: "12px", sm: "13px", md: "14px", lg: "15px" }}
              sx={(theme) => ({
                fontWeight: theme.typography.fontWeightBold,
                color: theme.palette.text.primary,
                whiteSpace: "nowrap",
              })}
            >
              {links[links.length - 1].title}
            </Typography>
          </>
        )}
      </Stack>
      {actions != null && (
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{
            flexShrink: 0,
            marginLeft: { xs: 0, sm: "auto" },
            width: { xs: "100%", sm: "auto" },
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {actions}
        </Stack>
      )}
    </Box>
  );
}
