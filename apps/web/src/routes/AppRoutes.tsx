import { Routes, Route, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import ChangePassword from "../pages/ChangePassword";
import { AIReviewProvider } from "../features/aiReview";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("../pages/Home"));
const Users = lazy(() => import("../pages/Users"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Profile = lazy(() => import("../pages/ProfilePage"));
const SessionExpired = lazy(() => import("../pages/SessionExpired"));
const TenantList = lazy(() => import("../pages/tenants/TenantList"));
const AddTenant = lazy(() => import("../pages/tenants/AddTenant"));
const RequirementGeneratePage = lazy(() => import("../pages/RequirementGeneratePage"));
const ArtifactReviewPage = lazy(() => import("../pages/ArtifactReviewPage"));
const ArtifactReviewDetailPage = lazy(() => import("../pages/ArtifactReviewDetailPage"));
const CreateUser = lazy(() => import("../pages/CreateUser"));
const ThemeStudioPage = lazy(() => import("../pages/admin/ThemeStudioPage"));
const RoleManagementPage = lazy(() => import("../pages/RoleManagementPage"));
const AddRole = lazy(() => import("../pages/AddRole"));
const EditRole = lazy(() => import("../pages/EditRole"));
const FeeStructureSetup = lazy(() => import("../pages/Fees/FeeStructureSetup"));
const FeeStructureForm = lazy(() => import("../pages/Fees/FeeStructureForm"));

// Loading fallback component
const PageLoader = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "400px",
    }}
  >
    <CircularProgress />
  </Box>
);

function AIReviewRouteLayout() {
  return (
    <AIReviewProvider>
      <Outlet />
    </AIReviewProvider>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/session-expired" element={<SessionExpired />} />

        {/* Protected routes with layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* User Management */}
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/user/create" element={<ProtectedRoute><CreateUser /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

          {/* Role Management */}
          <Route path="/roles" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}><RoleManagementPage /></ProtectedRoute>} />
          <Route path="/roles/create" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}><AddRole /></ProtectedRoute>} />
          <Route path="/roles/:id/edit" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}><EditRole /></ProtectedRoute>} />
          <Route path="/roles/edit/:id" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}><AddRole /></ProtectedRoute>} />

          {/* AI Features */}
          <Route
            path="/ai/generate"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN"]}>
                <RequirementGeneratePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai/review"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN"]}>
                <AIReviewRouteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ArtifactReviewPage />} />
            <Route path=":storyId" element={<ArtifactReviewDetailPage />} />
          </Route>

          {/* System Administration - Super Admin only */}
          <Route path="/tenants" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><TenantList /></ProtectedRoute>} />
          <Route path="/tenants/add" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><AddTenant /></ProtectedRoute>} />
          <Route path="/tenants/:id/edit" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><AddTenant /></ProtectedRoute>} />
          
          {/* Fee Management */}
          <Route path="/fees/setup" element={<ProtectedRoute requiredRoles={["TENANT_ADMIN", "ADMIN", "admin"]}><FeeStructureSetup /></ProtectedRoute>} />
          <Route path="/fees/setup/add" element={<ProtectedRoute requiredRoles={["TENANT_ADMIN", "ADMIN", "admin"]}><FeeStructureForm /></ProtectedRoute>} />
          <Route path="/fees/setup/:id/edit" element={<ProtectedRoute requiredRoles={["TENANT_ADMIN", "ADMIN", "admin"]}><FeeStructureForm /></ProtectedRoute>} />
          
          <Route path="/admin/theme-studio" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><ThemeStudioPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
