import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import ChangePassword from "../pages/ChangePassword";
import RoleManagementPage from "../pages/RoleManagementPage"; // <-- Add this import
import AddRole from "../pages/AddRole"; // <-- Add this import
import EditRole from "../pages/EditRole";
import AIAssistant from "../components/AIAssistant";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("../pages/Home"));
const About = lazy(() => import("../pages/About"));
const Users = lazy(() => import("../pages/Users"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Profile = lazy(() => import("../pages/ProfilePage"));
const SessionExpired = lazy(() => import("../pages/SessionExpired"));
const TenantList = lazy(() => import("../pages/tenants/TenantList"));
const AddTenant = lazy(() => import("../pages/tenants/AddTenant"));
const TenantDetail = lazy(() => import("../pages/tenants/TenantDetail"));

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
          {/* Basic authentication - no permissions required */}
          <Route
            path="/roles"
            element={
              <ProtectedRoute>
                <RoleManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles/create"
            element={
              <ProtectedRoute>
                <AddRole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles/:id/edit"
            element={
              <ProtectedRoute>
                <EditRole />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/roles"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}>
                <RoleManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles/create"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}>
                <AddRole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles/edit/:id"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}>
                <AddRole />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                  <AIAssistant />
                </Box>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tenants"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN"]}>
                <TenantList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants/add"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN"]}>
                <AddTenant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants/:id"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN"]}>
                <TenantDetail />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
