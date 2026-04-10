/**
 * Application Routes - Central routing configuration for all pages
 * Defines all application routes with lazy loading and code-splitting
 * Integrates protected routes, layouts, and suspense fallbacks
 */

import { Routes, Route, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import ChangePassword from "../pages/ChangePassword";
import { AIReviewProvider } from "../features/aiReview";
import FeeCategoryManagement from "../pages/Fees/FeeCategoryManagement";
import AddEditFeeCategory from "../pages/Fees/AddEditFeeCategory";
import FeeDiscountsPage from "../pages/Fees/FeeDiscountsPage";
import AddFeeDiscount from "../pages/AddFeeDiscount";
import StudentFeeLedger from "../pages/StudentFeeLedger";

// ═══════════════════════════════════════════════════════════════════════════
// Lazy-loaded Pages - Code splitting for better performance
// ═══════════════════════════════════════════════════════════════════════════
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
const FeeStructureSetup = lazy(() => import("../pages/Fees/FeeStructureSetup"));
const FeeStructureForm = lazy(() => import("../pages/Fees/FeeStructureForm"));
const AcademicYearList = lazy(() => import("../pages/academics/AcademicYearList"));
const AddAcademicYear = lazy(() => import("../pages/academics/AddAcademicYear"));
const ClassList = lazy(() => import("../pages/academics/ClassList"));
const AddClass = lazy(() => import("../pages/academics/AddClass"));
const AssignStudentFee = lazy(() => import("../pages/Fees/AssignStudentFee"));
const PermissionManagementPage = lazy(() => import("../pages/admin/PermissionManagementPage"));
const FeeInstallmentStatus = lazy(() => import("../pages/Fees/FeeInstallmentStatus"));
const CollectPaymentPage = lazy(() => import("../pages/Fees/CollectPaymentPage"));
const SprintPerformanceReportPage = lazy(() => import("../pages/reports/SprintPerformanceReportPage"));
const SprintwisePerformanceReportPage = lazy(() => import("../pages/reports/SprintwisePerformanceReportPage"));
const SprintList = lazy(() => import("../pages/sprints/SprintList"));
const SprintForm = lazy(() => import("../pages/sprints/SprintForm"));
const SprintAssignmentsPage = lazy(() => import("../pages/sprints/SprintAssignmentsPage"));
const MyTasksEffortEntryPage = lazy(() => import("../pages/tasks/MyTasksEffortEntryPage"));

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
          <Route
            path="/reports/sprint-performance"
            element={
              <ProtectedRoute>
                <SprintPerformanceReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/sprintwise-performance"
            element={
              <ProtectedRoute>
                <SprintwisePerformanceReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tasks/effort-entry"
            element={
              <ProtectedRoute>
                <MyTasksEffortEntryPage />
              </ProtectedRoute>
            }
          />
          <Route path="/users" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:view"><Users /></ProtectedRoute>} />
          <Route path="/user/create" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:create"><CreateUser /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

          {/* Fee Category Management */}
          <Route path="/fees/categories" element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeCategoryManagement /></ProtectedRoute>} />
          <Route path="/fees/categories/add" element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><AddEditFeeCategory /></ProtectedRoute>} />
          <Route path="/fees/categories/edit/:id" element={<ProtectedRoute requiredPermissions="FEE_MGMT:edit"><AddEditFeeCategory /></ProtectedRoute>} />

          {/* Role Management */}
          <Route path="/roles" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:view"><RoleManagementPage /></ProtectedRoute>} />
          <Route path="/roles/create" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:create"><AddRole /></ProtectedRoute>} />
          <Route path="/roles/:id/edit" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:edit"><AddRole /></ProtectedRoute>} />
          <Route path="/roles/edit/:id" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:edit"><AddRole /></ProtectedRoute>} />
          <Route path="/roles/permissions" element={<ProtectedRoute requiredPermissions={["ADMIN_MGMT:view", "SYSTEM_CONFIG:view"]}><PermissionManagementPage /></ProtectedRoute>} />

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
          <Route path="/sprints" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><SprintList /></ProtectedRoute>} />
          <Route path="/sprints/add" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><SprintForm /></ProtectedRoute>} />
          <Route path="/sprints/:id/edit" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><SprintForm /></ProtectedRoute>} />
          <Route path="/sprints/assignments" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><SprintAssignmentsPage /></ProtectedRoute>} />
          
          {/* Fee Management */}
          <Route path="/fees/setup" element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeStructureSetup /></ProtectedRoute>} />
          <Route path="/fees/setup/add" element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><FeeStructureForm /></ProtectedRoute>} />
          <Route path="/fees/setup/:id/edit" element={<ProtectedRoute requiredPermissions="FEE_MGMT:edit"><FeeStructureForm /></ProtectedRoute>} />
          <Route path="/fees/ledger" element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><StudentFeeLedger /></ProtectedRoute>} />

          {/* Installment status / payment collection */}
          <Route
            path="/fees/installment-status"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeInstallmentStatus /></ProtectedRoute>}
          />
          <Route
            path="/fees/collect-payment"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><CollectPaymentPage /></ProtectedRoute>}
          />
          
          {/* FEES MODULE (from user request) */}
          <Route
            path="/fees/discounts"
            element={
              <ProtectedRoute requiredPermissions="FEE_MGMT:view">
                <FeeDiscountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fees/discounts/add"
            element={
              <ProtectedRoute requiredPermissions="FEE_MGMT:create">
                <AddFeeDiscount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fees/discounts/:id/edit"
            element={
              <ProtectedRoute requiredPermissions="FEE_MGMT:edit">
                <AddFeeDiscount />
              </ProtectedRoute>
            }
          />
          <Route path="/fees/assign-student-fee" element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><AssignStudentFee /></ProtectedRoute>} />

          
          <Route path="/admin/permission-management" element={<ProtectedRoute requiredPermissions={["ADMIN_MGMT:view", "SYSTEM_CONFIG:view"]}><PermissionManagementPage /></ProtectedRoute>} />
          <Route path="/admin/theme-studio" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><ThemeStudioPage /></ProtectedRoute>} />
          
          {/* Academic Year Management */}
          <Route path="/academic-years" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><AcademicYearList /></ProtectedRoute>} />
          <Route path="/academic-years/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddAcademicYear /></ProtectedRoute>} />
          <Route path="/academic-years/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddAcademicYear /></ProtectedRoute>} />
          <Route path="/academics/academic-years" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><AcademicYearList /></ProtectedRoute>} />
          <Route path="/academics/academic-years/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddAcademicYear /></ProtectedRoute>} />
          <Route path="/academics/academic-years/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddAcademicYear /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><ClassList /></ProtectedRoute>} />
          <Route path="/classes/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddClass /></ProtectedRoute>} />
          <Route path="/classes/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddClass /></ProtectedRoute>} />
          <Route path="/academics/classes" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><ClassList /></ProtectedRoute>} />
          <Route path="/academics/classes/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddClass /></ProtectedRoute>} />
          <Route path="/academics/classes/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddClass /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
