import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  path: string;
  permission: string;
  menuPaths: string[];
};

type ConfigSection = {
  id: string;
  label: string;
  features: ConfigFeature[];
};

const hasAnyGrantedMenuPath = (granted: Set<string>, paths: string[]) =>
  paths.some((menuPath) => granted.has(menuPath));

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
        label: "Class - Division",
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
      {
        id: "holiday-exam-reminders",
        label: "Notification Schedule",
        path: "/academics/configuration/notification-schedule",
        permission: "ACADEMIC_MGMT:view",
        menuPaths: [
          "/academics/configuration/notification-schedule",
          "/academics/configuration/holidays",
          "/configuration",
        ],
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
        id: "user-permission",
        label: "User Permission",
        path: "/admin/permission-management",
        permission: "ADMIN_MGMT:view",
        menuPaths: ["/admin/permission-management"],
      },
    ],
  },

  {
    id: "attendance-related",
    label: "Attendance Related",
    features: [
      {
        id: "attendance-configuration",
        label: "Attendance Configuration",
        path: "/attendance/configuration",
        permission: "ACADEMIC_MGMT:view",
        menuPaths: ["/attendance/configuration"],
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
  const location = useLocation();
  const { grantedMenuPaths, isInitialized } = useRBAC();

  // Filter sections based on permissions
  const visibleSections = useMemo(() => {
    if (!isInitialized) return [];
    return CONFIG_SECTIONS.map((section) => ({
      ...section,
      features: section.features.filter((feature) =>
        hasAnyGrantedMenuPath(grantedMenuPaths, feature.menuPaths)
      ),
    })).filter((section) => section.features.length > 0);
  }, [grantedMenuPaths, isInitialized]);

  // Determine initial selection based on returnPath from navigation state
  const getInitialSectionId = () => {
    const state = location.state as { returnPath?: string } | null;
    if (state?.returnPath && visibleSections.length > 0) {
      for (const section of visibleSections) {
        if (section.features.some((f) => f.path === state.returnPath)) {
          return section.id;
        }
      }
    }
    return visibleSections[0]?.id ?? "";
  };

  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => getInitialSectionId());

  // Update selection when visibleSections change
  useEffect(() => {
    if (visibleSections.length === 0) return;
    
    const validSelection = visibleSections.find((s) => s.id === selectedSectionId);
    if (!validSelection) {
      setSelectedSectionId(visibleSections[0].id);
    }
  }, [visibleSections, selectedSectionId]);

  // Handle returnPath from navigation
  useEffect(() => {
    const state = location.state as { returnPath?: string } | null;
    if (state?.returnPath && visibleSections.length > 0) {
      for (const section of visibleSections) {
        if (section.features.some((f) => f.path === state.returnPath)) {
          setSelectedSectionId(section.id);
          break;
        }
      }
    }
  }, [location.state, visibleSections]);

  // Get currently selected section
  const selectedSection = useMemo(
    () => visibleSections.find((s) => s.id === selectedSectionId) || visibleSections[0] || null,
    [visibleSections, selectedSectionId]
  );

  const handleSectionClick = (sectionId: string) => {
    console.log("Section clicked:", sectionId);
    setSelectedSectionId(sectionId);
  };

  const handleFeatureClick = (featurePath: string) => {
    navigate(featurePath, { 
      state: { 
        fromConfigHub: true, 
        returnPath: featurePath 
      } 
    });
  };

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
                    onClick={() => handleSectionClick(section.id)}
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
                    <ListItemText 
                      primary={section.label} 
                      slotProps={{
                        primary: { sx: { fontSize: "0.9rem", fontWeight: 600 } }
                      }}
                    />
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
                  onClick={() => handleFeatureClick(feature.path)}
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
