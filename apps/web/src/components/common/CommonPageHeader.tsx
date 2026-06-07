import React from "react";
import { ChevronRightTwoTone, HomeTwoTone } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link, useNavigate } from "react-router-dom";
import { colorTokens } from "../../tokens/colors";
// import AcademicYearMsg from "../SchoolNoticeBoard/AcademicYearMsg";

export type NavLink = {
  title: string;
  path: string;
  onClick?: (e: React.MouseEvent) => void;
};

export type HeaderAction = {
  id: number;
  component: React.ReactNode;
  type: 1 | 2; // 1 = render as-is, 2 = wrapped IconButton with backgroundColor
  disabled?: boolean;
  tooltip?: string;
  backgroundColor?: string;
};

export type CommonPageHeaderProps = {
  links: NavLink[];
  rightActions?: React.ReactNode;
  actions?: HeaderAction[];
  showAcademicYear?: boolean;
  homePath?: string;
};

const isCautionMoney = (path: string) =>
  path.toLowerCase().includes("caution") ? `${path}?reload=true` : path;

export default function CommonPageHeader({
  links,
  rightActions,
  actions,
  homePath = "/",
}: CommonPageHeaderProps) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(isCautionMoney(path), { state: { fromInternal: true } });
  };

  return (
    <Box>
      <Box sx={{ pt: 1.5, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", overflowX: "hidden", }}>
        <Grid container spacing={2} alignItems="center">
          {/* LEFT: Home + breadcrumbs */}
          <Grid
             size={{ xs: 12, sm: 12, md: 7, lg: 7 }}
            sx={{ minWidth: 0, flex: "1 1 0" }}
          >
            <Breadcrumbs
              separator={<ChevronRightTwoTone fontSize="small" />}
              sx={{
                "& .MuiBreadcrumbs-separator": {
                  mx: 0.5,
                },
              }}
            >
              {/* Home button, styled like PageHeader back button */}
              <Link to={homePath} style={{ textDecoration: "none" }}>
                <IconButton
                  aria-label="Home"
                  sx={{
                    background: `linear-gradient(135deg, ${colorTokens.preschool.turquoise.main} 0%, ${colorTokens.primary.main} 100%)`,
                    borderRadius: 1.2,
                    width: 44,
                    height: 44,
                    color: "#ffffff",
                    boxShadow: `0 4px 12px ${alpha(
                      colorTokens.preschool.turquoise.main,
                      0.2
                    )}`,
                    transition: "all 0.2s",
                    "&:hover": {
                      transform: "scale(1.1)",
                      boxShadow: `0 6px 16px ${alpha(
                        colorTokens.preschool.turquoise.main,
                        0.3
                      )}`,
                    },
                  }}
                >
                  <HomeTwoTone sx={{ fontSize: 24 }} />
                </IconButton>
              </Link>

              {/* Intermediate links */}
              {links.slice(0, -1).map((link, index) => (
                <Typography
                  key={index}
                  variant="h3"
                  fontSize={{ xs: "12px", sm: "14px", md: "16px", lg: "18px" }}
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightMedium,
                    color: theme.palette.text.primary,
                    letterSpacing: theme.typography.body1.letterSpacing,
                    cursor: "pointer",
                    "&:hover": {
                      fontWeight: theme.typography.fontWeightBold,
                    },
                  })}
                  onClick={(e) =>
                    link.onClick ? link.onClick(e) : handleNavigation(link.path)
                  }
                >
                  {link.title}
                </Typography>
              ))}

              {/* Current page */}
              {links.length > 0 && (
                <Typography
                  variant="h3"
                  fontSize={{ xs: "12px", sm: "14px", md: "16px", lg: "18px" }}
                  sx={(theme) => ({
                    fontWeight: theme.typography.fontWeightBold,
                    color: theme.palette.text.primary,
                    letterSpacing: theme.typography.body1.letterSpacing,
                  })}
                >
                  {links[links.length - 1].title}
                </Typography>
              )}
            </Breadcrumbs>
          </Grid>

          {/* RIGHT: actions */}
          <Grid
            size={{ xs: 12, sm: 12, md: 5, lg: 5 }}
            display="flex"
            justifyContent={{ xs: "flex-start", sm: "flex-end" ,}}
            sx={{ flexShrink: 0 }}
          >
            <Stack
              direction={{ xs: "row", sm: "row" }}
              gap={2}
              alignItems="center"
            >
              {rightActions}

              {actions && (
                <>
                  {/* Type 1: render component as-is */}
                  {actions
                    .filter((a) => a.type === 1)
                    .map((a) => (
                      <Box key={a.id}>{a.component}</Box>
                    ))}

                  {/* Type 2: wrap in themed IconButton + tooltip */}
                  <Stack direction="row" gap={0.5}>
                    {actions
                      .filter((a) => a.type === 2)
                      .map((a) => (
                        <Tooltip key={a.id} title={a.tooltip}>
                          <IconButton
                            disabled={a.disabled}
                            sx={(theme) => ({
                              color: theme.palette.common.white,
                              backgroundColor:
                                a.backgroundColor ?? colorTokens.primary.main,
                              height: 44,
                              width: 44,
                              boxShadow: `0 4px 12px ${alpha(
                                colorTokens.primary.main,
                                0.25
                              )}`,
                              transition: "all 0.2s",
                              "&:hover": {
                                transform: "scale(1.05)",
                                backgroundColor:
                                  a.backgroundColor ??
                                  colorTokens.preschool.turquoise.main,
                              },
                            })}
                          >
                            {a.component}
                          </IconButton>
                        </Tooltip>
                      ))}
                  </Stack>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}