import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useRBAC } from "../../context/RBACContext";
import { PageHeader } from "../../components/layout";
import { ListPageLayout } from "../../components/reusable";

type ConfigFeature = {
  id: string;
  label: string;
  path: string;        // used for navigate()
  permission: string;  // kept for route-guard fallback
  /** RBAC menu paths that grant visibility (seed + tenant DB may use different paths). */
  menuPaths: string[];
};

const hasAnyGrantedMenuPath = (granted: Set<string>, paths: string[]) =>
  paths.some((menuPath) => granted.has(menuPath));

type ConfigSection = {
  id: string;
  label: string;
  features: ConfigFeature[];
};

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: "academic-related",
    label: "Academic Related",
    features: [
      {
        id: "academic-year",
        label: "Academic Year",
        path: "/academics/academic-years",
        permission: "ACADEMIC_MGMT:view",
        menuPaths: ["/academics/academic-years", "/academic-years"],
      },
      {
        id: "class-div-setup",
        label: "Class-Div Setup",
        path: "/academics/classes",
        permission: "ACADEMIC_MGMT:view",
        menuPaths: ["/academics/classes", "/classes"],
      },
      {
        id: "subjects",
        label: "Subjects",
        path: "/academics/subjects",
        permission: "ACADEMIC_MGMT:view",
        menuPaths: ["/academics/subjects", "/subjects"],
      },
    ],
  },
  {
    id: "user-related",
    label: "User Related",
    features: [
      {
        id: "role-management",
        label: "Role Management",
        path: "/roles",
        permission: "ADMIN_MGMT:view",
        menuPaths: ["/roles"],
      },
      {
        id: "teacher-creation",
        label: "Teacher Creation",
        path: "/teachers",
        permission: "TEACHER_MGMT:view",
        menuPaths: ["/teachers"],
      },
      {
        id: "student-creation",
        label: "Student Creation",
        path: "/students",
        permission: "ADMIN_MGMT:view",
        menuPaths: ["/students"],
      },
      {
        id: "user Permission ",
        label: "User Permission ",
        path: "/admin/permission-management",
        permission: "ADMIN_MGMT:view",
        menuPaths: ["/admin/permission-management"],
      },
    ],
  },
  {
    id: "fees-related",
    label: "Fees Related",
    features: [
      {
        id: "fee-category",
        label: "Fee Category",
        path: "/fees/categories",
        permission: "FEE_MGMT:view",
        menuPaths: ["/fees/categories"],
      },
      {
        id: "fee-structure",
        label: "Fee Structure",
        path: "/fees/setup",
        permission: "FEE_MGMT:view",
        menuPaths: ["/fees/setup"],
      },
      {
        id: "discount-management",
        label: "Discount Management",
        path: "/fees/discounts",
        permission: "FEE_MGMT:view",
        menuPaths: ["/fees/discounts"],
      },
    ],
  },
];

export default function ConfigurationHub() {
  const navigate = useNavigate();
  const { grantedMenuPaths, isInitialized } = useRBAC();

  const visibleSections = useMemo(() => {
    if (!isInitialized) return [];
    return CONFIG_SECTIONS.map((section) => ({
      ...section,
      features: section.features.filter((feature) =>
        hasAnyGrantedMenuPath(grantedMenuPaths, feature.menuPaths)
      ),
    })).filter((section) => section.features.length > 0);
  }, [grantedMenuPaths, isInitialized]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>(visibleSections[0]?.id ?? "");

  useEffect(() => {
    if (visibleSections.length === 0) {
      setSelectedSectionId("");
      return;
    }
    const hasSelectedSection = visibleSections.some((section) => section.id === selectedSectionId);
    if (!hasSelectedSection) {
      setSelectedSectionId(visibleSections[0].id);
    }
  }, [visibleSections, selectedSectionId]);

  const selectedSection = useMemo(
    () => visibleSections.find((section) => section.id === selectedSectionId) ?? visibleSections[0] ?? null,
    [visibleSections, selectedSectionId]
  );

  if (!isInitialized) {
    return (
      <ListPageLayout
        pageBackground
        header={<PageHeader links={[{ title: "Basic Configuration", path: "#" }]} homePath="/" />}
      >
        <Paper sx={{ p: 3, borderRadius: 3, minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress />
        </Paper>
      </ListPageLayout>
    );
  }

  if (!selectedSection && visibleSections.length === 0) {
    return (
      <ListPageLayout
        pageBackground
        header={<PageHeader links={[{ title: "Basic Configuration", path: "#" }]} homePath="/" />}
      >
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Basic Configuration
          </Typography>
          <Typography color="text.secondary">
            No configuration features are available for your account. Please contact your administrator.
          </Typography>
        </Paper>
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout
      pageBackground
      header={<PageHeader links={[{ title: "Basic Configuration", path: "#" }]} homePath="/" />}
    >
      <Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <Paper sx={{ width: { xs: "100%", md: 300 }, borderRadius: 3, p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 1 }}>
              Configuration Sections
            </Typography>
            <List disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              {visibleSections.map((section) => {
                const isActive = selectedSection?.id === section.id;
                return (
                  <ListItemButton
                    key={section.id}
                    selected={isActive}
                    onClick={() => setSelectedSectionId(section.id)}
                    sx={{
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 0,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-of-type": {
                        borderBottom: "none",
                      },
                    }}
                  >
                    <ListItemText primary={section.label} primaryTypographyProps={{ fontSize: "0.9rem", fontWeight: 600 }} />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>

          <Paper sx={{ flex: 1, borderRadius: 3, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, px: 1 }}>
              Configure Features
            </Typography>
            <List disablePadding sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
              {selectedSection?.features.map((feature) => (
                <ListItemButton
                  key={feature.id}
                  onClick={() => navigate(feature.path, { state: { fromConfigHub: true } })}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    minHeight: 34,
                    borderRadius: 0,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:hover .config-feature-link": {
                      textDecoration: "underline",
                    },
                    "&:last-of-type": {
                      borderBottom: "none",
                    },
                  }}
                >
                  <Typography
                    className="config-feature-link"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.86rem",
                      color: "primary.main",
                      textDecoration: "none",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    {feature.label}
                  </Typography>
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Stack>
      </Box>
    </ListPageLayout>
  );
}
