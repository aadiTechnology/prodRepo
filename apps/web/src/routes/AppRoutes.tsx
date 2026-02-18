import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

// Lazy load pages for code splitting and better performance
const Home = lazy(() => import("../pages/Home"));
const About = lazy(() => import("../pages/About"));
const Users = lazy(() => import("../pages/Users"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Profile = lazy(() => import("../pages/ProfilePage"));

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

        {/* Protected routes with layout */}
        <Route element={<MainLayout />}>
          {/* Basic authentication - no permissions required */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            }
          />

          {/* Permission-based protection example */}
          {/* Uncomment and adjust permissions based on your backend features */}
          {/* 
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermissions="USER_VIEW">
                <Users />
              </ProtectedRoute>
            }
          />
          */}

          {/* Current implementation - basic auth only */}
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

          {/* Example: Route with permission requirement */}
          {/* 
          <Route
            path="/users/create"
            element={
              <ProtectedRoute requiredPermissions="USER_CREATE">
                <CreateUserPage />
              </ProtectedRoute>
            }
          />
          */}

          {/* Example: Route with role requirement */}
          {/* 
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles="ADMIN">
                <AdminPage />
              </ProtectedRoute>
            }
          />
          */}

          {/* Example: Route with multiple permissions (OR) */}
          {/* 
          <Route
            path="/users/actions"
            element={
              <ProtectedRoute
                requiredPermissions={["USER_EDIT", "USER_DELETE"]}
              >
                <UserActionsPage />
              </ProtectedRoute>
            }
          />
          */}

          {/* Example: Route with multiple permissions (AND) */}
          {/* 
          <Route
            path="/users/export"
            element={
              <ProtectedRoute
                requiredPermissions={["USER_VIEW", "USER_EXPORT"]}
                requireAllPermissions
              >
                <ExportPage />
              </ProtectedRoute>
            }
          />
          */}
        </Route>
      </Routes>
    </Suspense>
  );
}