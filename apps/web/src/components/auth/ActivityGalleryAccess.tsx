import { ReactNode } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useActivityGalleryPermissions } from "../../hooks/useActivityGalleryPermissions";

const GALLERY_PATH = "/activity-management/photo-video-gallery";

type ActivityGalleryAccessProps = {
  children: ReactNode;
  requireCreate?: boolean;
  requireEdit?: boolean;
};

export default function ActivityGalleryAccess({
  children,
  requireCreate = false,
  requireEdit = false,
}: ActivityGalleryAccessProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const perms = useActivityGalleryPermissions();

  if (authLoading || perms.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowed = requireEdit
    ? perms.canEdit
    : requireCreate
      ? perms.canCreate
      : perms.canView;

  if (!allowed) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You are not authorized for this activity.
        </Typography>
        <Button variant="contained" onClick={() => navigate(GALLERY_PATH)}>
          Back to Gallery
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
