/**
 * PageHeader — Layout Component
 * Single header: Home + breadcrumb links (last = current page) + optional actions.
 * For use inside PageLayout header slot.
 */

import { Box, Typography, IconButton, Stack } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ReactNode } from "react";
import { ChevronRightTwoTone, HomeTwoTone } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { colorTokens } from "../../tokens/colors";
import { alpha } from "@mui/material/styles";

export type NavLink = {
  title: string;
  path: string;
  onClick?: (e: React.MouseEvent) => void;
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

  const handleNav = (path: string) => {
    navigate(resolvePath(path), { state: { fromInternal: true } });
  };

  return (
    <Box
      sx={{
        pt: 1.5,
        pb: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        overflowX: "hidden",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 12, md: 7, lg: 7 }} sx={{ minWidth: 0, flex: "1 1 0" }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} useFlexGap>
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
                  fontSize={{ xs: "12px", sm: "14px", md: "16px", lg: "18px" }}
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightMedium,
                    color: theme.palette.text.primary,
                    cursor: "pointer",
                    "&:hover": { fontWeight: theme.typography.fontWeightBold },
                  })}
                  onClick={(e) =>
                    link.onClick ? link.onClick(e) : handleNav(link.path)
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
                  fontSize={{ xs: "12px", sm: "14px", md: "16px", lg: "18px" }}
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightBold,
                    color: theme.palette.text.primary,
                  })}
                >
                  {links[links.length - 1].title}
                </Typography>
              </>
            )}
          </Stack>
        </Grid>
        <Grid
          size={{ xs: 12, sm: 12, md: 5, lg: 5 }}
          display="flex"
          justifyContent={{ xs: "flex-start", sm: "flex-end" }}
          sx={{ flexShrink: 0 }}
        >
          {actions != null && (
            <Stack direction="row" gap={2} alignItems="center">
              {actions}
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
