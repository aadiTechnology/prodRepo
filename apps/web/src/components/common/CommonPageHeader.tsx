/**
 * CommonPageHeader – Reusable page header with breadcrumbs and optional right actions
 */

import { ChevronRightTwoTone, HomeTwoTone } from "@mui/icons-material";
import {
  Box,
  Breadcrumbs,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import React from "react";
import { Link, useNavigate } from "react-router-dom";

export type NavLink = {
  title: string;
  path: string;
  onClick?: (e: React.MouseEvent) => void;
};

export type NewAction = {
  Id: number;
  component: React.ReactNode;
  Type: 1 | 2;
  disabled?: boolean;
  Title?: string;
  backgroundColor?: string;
};

export type CommonPageHeaderProps = {
  navLinks: NavLink[];
  rightActions?: React.ReactNode;
  newAction?: NewAction[];
  /** Optional content above the header (e.g. academic year message) */
  topContent?: React.ReactNode;
  /** Home route for the breadcrumb icon. Defaults to "/" */
  homePath?: string;
};

const resolvePath = (path: string) =>
  path.toLowerCase().includes("caution") ? `${path}?reload=true` : path;

/* =====================================================
   HeaderBreadcrumbs (named export for standalone use)
===================================================== */

export const HeaderBreadcrumbs = ({
  navLinks,
  homePath = "/",
}: {
  navLinks: NavLink[];
  homePath?: string;
}) => {
  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      separator={<ChevronRightTwoTone fontSize="small" />}
      sx={{
        "& .MuiBreadcrumbs-separator": {
          marginLeft: "4px",
          marginRight: "4px",
        },
      }}
    >
      <Link to={homePath} style={{ textDecoration: "none" }}>
        <IconButton
          sx={{
            background: (theme) => theme.palette.common.white,
            boxShadow: "0px 0px 5px rgba(0,0,0,0.15)",
          }}
        >
          <HomeTwoTone
            color="primary"
            sx={{
              fontSize: {
                xs: "22px",
                sm: "22px",
                md: "24px",
                lg: "24px",
              },
            }}
          />
        </IconButton>
      </Link>

      {navLinks.slice(0, -1).map((link, index) =>
        link.path === "#" ? (
          <Typography
            key={index}
            variant="h6"
            fontWeight="bold"
            color="text.primary"
            sx={{
              fontSize: {
                xs: "16px !important",
                sm: "16px !important",
                md: "18px !important",
                lg: "18px !important",
              },
            }}
          >
            {link.title}
          </Typography>
        ) : (
          <Link
            key={index}
            to={resolvePath(link.path)}
            style={{ textDecoration: "none" }}
          >
            <Typography
              variant="h6"
              fontWeight="normal"
              color="text.primary"
              sx={{
                "&:hover": { fontWeight: "bold" },
                fontSize: {
                  xs: "14px",
                  sm: "16px",
                  md: "18px",
                  lg: "18px",
                },
              }}
            >
              {link.title}
            </Typography>
          </Link>
        )
      )}

      {navLinks.length > 0 && (
        <Typography
          color="text.primary"
          fontWeight={
            navLinks[navLinks.length - 1].path === "#" ? "bold" : "normal"
          }
          sx={{
            fontSize: {
              xs: "14px !important",
              sm: "16px !important",
              md: "18px !important",
              lg: "18px !important",
            },
          }}
        >
          {navLinks[navLinks.length - 1].title}
        </Typography>
      )}
    </Breadcrumbs>
  );
};

/* =====================================================
   CommonPageHeader (default export)
===================================================== */

const CommonPageHeader: React.FC<CommonPageHeaderProps> = ({
  navLinks,
  rightActions,
  newAction,
  topContent,
  homePath = "/",
}) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (path === "#") return;
    navigate(resolvePath(path), { state: { fromInternal: true } });
  };

  return (
    <Box>
      {topContent && (
        <Box sx={{ p: 2, textAlign: "center" }}>{topContent}</Box>
      )}

      <Box sx={{ pb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={6} lg={6}>
            <Breadcrumbs
              separator={<ChevronRightTwoTone fontSize="small" />}
              sx={{
                "& .MuiBreadcrumbs-separator": {
                  marginLeft: "4px",
                  marginRight: "4px",
                },
              }}
            >
              <Link
                to={homePath}
                color="inherit"
                style={{ textDecoration: "none" }}
              >
                <IconButton
                  sx={{
                    background: (theme) => theme.palette.common.white,
                    boxShadow: "0px 0px 5px rgba(0,0,0,0.15)",
                  }}
                >
                  <HomeTwoTone color="primary" />
                </IconButton>
              </Link>

              {navLinks.slice(0, -1).map((link, index) => (
                <Typography
                  key={index}
                  variant="h6"
                  sx={{
                    fontSize: {
                      xs: "12px",
                      sm: "14px",
                      md: "16px",
                      lg: "18px",
                    },
                    fontWeight: "normal",
                    color: "text.primary",
                    cursor: link.path === "#" ? "default" : "pointer",
                    "&:hover":
                      link.path === "#"
                        ? undefined
                        : { fontWeight: "bold" },
                  }}
                  onClick={(e) =>
                    link.onClick
                      ? link.onClick(e)
                      : link.path !== "#" && handleNavigation(link.path)
                  }
                >
                  {link.title}
                </Typography>
              ))}

              {navLinks.length > 0 && (
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: {
                      xs: "12px",
                      sm: "14px",
                      md: "16px",
                      lg: "18px",
                    },
                    color: "text.primary",
                  }}
                >
                  {navLinks[navLinks.length - 1].title}
                </Typography>
              )}
            </Breadcrumbs>
          </Grid>

          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={6}
            display="flex"
            justifyContent={{ xs: "flex-start", sm: "flex-end" }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
              {rightActions}

              {newAction && (
                <>
                  {newAction
                    .filter((a) => a.Type === 1)
                    .map((item) => (
                      <Box key={item.Id}>{item.component}</Box>
                    ))}

                  <Stack direction="row" gap={0.5}>
                    {newAction
                      .filter((a) => a.Type === 2)
                      .map((item) => (
                        <Tooltip key={item.Id} title={item.Title ?? ""}>
                          <IconButton
                            disabled={item.disabled}
                            sx={{
                              color: "white",
                              backgroundColor: item.backgroundColor,
                              height: 36,
                              "&:hover": { backgroundColor: grey[600] },
                            }}
                          >
                            {item.component}
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
};

export default CommonPageHeader;
