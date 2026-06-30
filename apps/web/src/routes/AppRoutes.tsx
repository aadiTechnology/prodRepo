/**
 * Application Routes - Central routing configuration for all pages
 * Defines all application routes with lazy loading and code-splitting
 * Integrates protected routes, layouts, and suspense fallbacks
 */
import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Routes, Route, Outlet, Navigate, useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import ActivityGalleryAccess from "../components/auth/ActivityGalleryAccess";
import ChangePassword from "../pages/ChangePassword";
import { AIReviewProvider } from "../features/aiReview";
import FeeCategoryManagement from "../pages/Fees/FeeCategoryManagement";
import AddEditFeeCategory from "../pages/Fees/AddEditFeeCategory";
import FeeDiscountsPage from "../pages/Fees/FeeDiscountsPage";
import AddFeeDiscount from "../pages/AddFeeDiscount";
import StudentList from "../pages/students/StudentList";
// ═══════════════════════════════════════════════════════════════════════════
// Lazy-loaded Pages - Code splitting for better performance
// ═══════════════════════════════════════════════════════════════════════════
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Users = lazy(() => import("../pages/Users"));
const TeacherList = lazy(() => import("../pages/teachers/TeacherList"));
const AddTeacher = lazy(() => import("../pages/teachers/AddTeacher"));
const TeacherDetails = lazy(() => import("../pages/teachers/TeacherDetailsPage"));
const TeacherAssignmentsPage = lazy(() => import("../pages/teacher/TeacherAssignmentsPage"));
const AssignTeacher = lazy(() => import("../pages/teacher/AssignTeacher"));
const MarkAttendance = lazy(() => import("../pages/Attendance/MarkAttendance"));
const AttendanceReport = lazy(() => import("../pages/Attendance/AttendanceReport"));

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
const SubjectList = lazy(() => import("../pages/academics/SubjectList"));
const AddSubject = lazy(() => import("../pages/academics/AddSubject"));
const PermissionManagementPage = lazy(() => import("../pages/admin/PermissionManagementPage"));
const AddMenuPage = lazy(() => import("../pages/admin/AddMenuPage"));
const CollectPaymentPage = lazy(() => import("../pages/Fees/CollectPaymentPage"));
const SprintPerformanceReportPage = lazy(() => import("../pages/reports/SprintPerformanceReportPage"));
const SprintwisePerformanceReportPage = lazy(() => import("../pages/reports/SprintwisePerformanceReportPage"));
const SprintList = lazy(() => import("../pages/sprints/SprintList"));
const SprintForm = lazy(() => import("../pages/sprints/SprintForm"));
const SprintAssignmentsPage = lazy(() => import("../pages/sprints/SprintAssignmentsPage"));
const MyTasksEffortEntryPage = lazy(() => import("../pages/tasks/MyTasksEffortEntryPage"));
const LeadManagementPage = lazy(() => import("../pages/Admissions/LeadManagementPage"));
const AddLeadPage = lazy(() => import("../pages/Admissions/AddLeadPage"));
const EnrollmentPage = lazy(() => import("../pages/Admissions/EnrollmentPage"));
const EnrollmentPrintPage = lazy(() => import("../pages/Admissions/EnrollmentPrintPage"));
const InvoiceList = lazy(() => import("../pages/Fees/InvoiceList"));
const InvoiceDetail = lazy(() => import("../pages/Fees/InvoiceDetail"));
const ReceiptPage = lazy(() => import("../pages/Fees/ReceiptPage"));
const GenerateInvoice = lazy(() => import("../pages/Fees/GenerateInvoice"));
const FeeReportPage = lazy(() => import("../pages/Fees/FeeReportPage"));
const FeeDueListV2 = lazy(() => import("../pages/Fees/FeeDueListV2"));
const CreateNotice = lazy(() => import("../pages/Communication/CreateNotice"));
const NoticeList = lazy(() => import("../pages/Communication/NoticeList"));
const NoticeDetails = lazy(() => import("../pages/Communication/NoticeDetails"));
const HolidayConfiguration = lazy(() => import("../pages/configuration/HolidayConfiguration"));
const HolidayForm = lazy(() => import("../pages/configuration/HolidayForm"));
const HomeworkList = lazy(() => import("../pages/academics/HomeworkList"));
const AddHomework = lazy(() => import("../pages/academics/AddHomework"));
const HomeworkDetails = lazy(() => import("../pages/academics/HomeworkDetails"));
const ActivityGalleryList = lazy(() => import("../pages/activity-management/ActivityGalleryList"));
const ActivityGalleryDetails = lazy(() => import("../pages/activity-management/ActivityGalleryDetails"));
const CreateActivityGallery = lazy(() => import("../pages/activity-management/CreateActivityGallery"));
const AcademicCalendar = lazy(() => import("../pages/calendar/AcademicCalendar"));
const ConfigurationHub = lazy(() =>
  import("../pages/configuration").then((module) => ({ default: module.ConfigurationHub }))
);
const DemoSetupVideosPage = lazy(() => import("../pages/configuration/DemoSetupVideosPage"));
const DemoSetupVideoFormPage = lazy(() => import("../pages/configuration/DemoSetupVideoFormPage"));
const DemoSetupVideoDetail = lazy(() => import("../pages/configuration/DemoSetupVideoDetail"));
const DigitalMarketingHub = lazy(() => import("../pages/marketing/DigitalMarketingHub"));
const MarketingPlatformFormPage = lazy(() => import("../pages/marketing/MarketingPlatformFormPage"));
const FaqList = lazy(() => import("../pages/support/FaqList"));
const AddFaq = lazy(() => import("../pages/support/AddFaq"));
const FaqDetail = lazy(() => import("../pages/support/FaqDetail"));
const ContactSupport = lazy(() => import("../pages/support/ContactSupport"));
const ProductUpdates = lazy(() => import("../pages/support/ProductUpdates"));
const ProductUpdateDetail = lazy(() => import("../pages/support/ProductUpdateDetail"));
const AddProductUpdate = lazy(() => import("../pages/support/AddProductUpdate"));
import SupportRouteLayout from "./SupportRouteLayout";
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

function LegacyStudentEditRedirect() {
  const { id } = useParams<{ id?: string }>();
  const target = id
    ? `/admissions/enrollment?studentId=${encodeURIComponent(id)}&mode=edit&source=students`
    : "/admissions/enrollment?mode=edit";
  return <Navigate to={target} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/session-expired" element={<SessionExpired />} />

        {/* Protected routes with layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:view"><StudentList /></ProtectedRoute>} />
          <Route
            path="/students/add"
            element={
              <ProtectedRoute requiredPermissions="ADMIN_MGMT:create">
                <Navigate to="/admissions/enrollment?source=students" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:id/edit"
            element={
              <ProtectedRoute requiredPermissions="ADMIN_MGMT:edit">
                <LegacyStudentEditRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:studentId/view"
            element={
              <ProtectedRoute requiredPermissions="ADMIN_MGMT:view">
                <EnrollmentPage />
              </ProtectedRoute>
            }
          />
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

          {/* Teacher Management */}
          <Route path="/teachers" element={<ProtectedRoute requiredPermissions="TEACHER_MGMT:view"><TeacherList /></ProtectedRoute>} />
          <Route path="/teachers/add" element={<ProtectedRoute requiredPermissions="TEACHER_MGMT:create"><AddTeacher /></ProtectedRoute>} />
          <Route path="/teachers/:id" element={<ProtectedRoute requiredPermissions="TEACHER_MGMT:view"><TeacherDetails /></ProtectedRoute>} />
          <Route path="/teachers/:id/edit" element={<ProtectedRoute requiredPermissions="TEACHER_MGMT:edit"><AddTeacher /></ProtectedRoute>} />
          <Route path="/teacher-assignments" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:view"><TeacherAssignmentsPage /></ProtectedRoute>} />
          <Route path="/teacher-assignments/assign" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:create"><AssignTeacher /></ProtectedRoute>} />
          <Route path="/teacher-assignments/add" element={<ProtectedRoute requiredPermissions="ADMIN_MGMT:create"><AssignTeacher /></ProtectedRoute>} />

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

          {/* Sprint Management (RBAC) */}
          <Route path="/sprints" element={<ProtectedRoute requiredPermissions="SPRINT_MGMT:view"><SprintList /></ProtectedRoute>} />
          <Route path="/sprints/add" element={<ProtectedRoute requiredPermissions="SPRINT_MGMT:create"><SprintForm /></ProtectedRoute>} />
          <Route path="/sprints/:id/edit" element={<ProtectedRoute requiredPermissions="SPRINT_MGMT:edit"><SprintForm /></ProtectedRoute>} />
          <Route path="/sprints/assignments" element={<ProtectedRoute requiredPermissions="SPRINT_MGMT:view"><SprintAssignmentsPage /></ProtectedRoute>} />

          {/* Fee Management */}
          <Route path="/fees/setup" element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeStructureSetup /></ProtectedRoute>} />
          <Route path="/fees/setup/add" element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><FeeStructureForm /></ProtectedRoute>} />
          <Route path="/fees/setup/:id/edit" element={<ProtectedRoute requiredPermissions="FEE_MGMT:edit"><FeeStructureForm /></ProtectedRoute>} />
          <Route
            path="/fees/collect-payment"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><CollectPaymentPage /></ProtectedRoute>}
          />
          <Route
            path="/fees/invoices"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><InvoiceList /></ProtectedRoute>}
          />
          <Route
            path="/fees/invoices/:invoiceId/detail"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><InvoiceDetail /></ProtectedRoute>}
          />
          <Route
            path="/fees/invoices/:invoiceId/edit"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:edit"><GenerateInvoice /></ProtectedRoute>}
          />
          <Route
            path="/fees/receipt/:paymentId"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><ReceiptPage /></ProtectedRoute>}
          />
          <Route
            path="/fees/receipt/invoice/:invoiceId"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><ReceiptPage /></ProtectedRoute>}
          />
          <Route
            path="/fees/generate-invoice"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:create"><GenerateInvoice /></ProtectedRoute>}
          />
          <Route
            path="/fees/reports"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeReportPage /></ProtectedRoute>}
          />
          <Route
            path="/fees/due-list-v2"
            element={<ProtectedRoute requiredPermissions="FEE_MGMT:view"><FeeDueListV2 /></ProtectedRoute>}
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
          <Route path="/admin/permission-management" element={<ProtectedRoute requiredPermissions={["ADMIN_MGMT:view", "SYSTEM_CONFIG:view"]}><PermissionManagementPage /></ProtectedRoute>} />
          <Route path="/admin/menus/add" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN"]}><AddMenuPage /></ProtectedRoute>} />
          <Route path="/admin/menus/:id/edit" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN"]}><AddMenuPage /></ProtectedRoute>} />
          <Route path="/admin/theme-studio" element={<ProtectedRoute requiredRoles={["SUPER_ADMIN"]}><ThemeStudioPage /></ProtectedRoute>} />

          {/* Communication — Notices */}
          <Route
            path="/communication/notices/new"
            element={
              <ProtectedRoute requiredPermissions="COMMUNICATION_MGMT:create">
                <CreateNotice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communication/notices/:id/edit"
            element={
              <ProtectedRoute requiredPermissions="COMMUNICATION_MGMT:edit">
                <CreateNotice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communication/notices/:id"
            element={
              <ProtectedRoute requiredPermissions="COMMUNICATION_MGMT:view">
                <NoticeDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communication/notices"
            element={
              <ProtectedRoute requiredPermissions="COMMUNICATION_MGMT:view">
                <NoticeList />
              </ProtectedRoute>
            }
          />

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
          <Route path="/subjects" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><SubjectList /></ProtectedRoute>} />
          <Route path="/subjects/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddSubject /></ProtectedRoute>} />
          <Route path="/subjects/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddSubject /></ProtectedRoute>} />
          <Route path="/academics/subjects" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><SubjectList /></ProtectedRoute>} />
          <Route path="/academics/subjects/new" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><AddSubject /></ProtectedRoute>} />
          <Route path="/academics/subjects/:id/edit" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><AddSubject /></ProtectedRoute>} />
          <Route
            path="/academics/configuration/holidays"
            element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><HolidayConfiguration /></ProtectedRoute>}
          />
          <Route
            path="/academics/configuration/holidays/new"
            element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:create"><HolidayForm /></ProtectedRoute>}
          />
          <Route
            path="/academics/configuration/holidays/:id/edit"
            element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:edit"><HolidayForm /></ProtectedRoute>}
          />
          <Route
            path="/calendar/academic"
            element={
              <ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view">
                <AcademicCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuration"
            element={
              <ProtectedRoute
                requiredPermissions={[
                  "ACADEMIC_MGMT:view",
                  "ADMIN_MGMT:view",
                  "TEACHER_MGMT:view",
                  "FEE_MGMT:view",
                ]}
              >
                <ConfigurationHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo-setup-videos"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <DemoSetupVideosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo-setup-videos/:id"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <DemoSetupVideoDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo-setup-videos/new"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <DemoSetupVideoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/demo-setup-videos/:id/edit"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <DemoSetupVideoFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing/hub/new"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <MarketingPlatformFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing/hub/:id/edit"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <MarketingPlatformFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketing/hub"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "ADMIN"]}>
                <DigitalMarketingHub />
              </ProtectedRoute>
            }
          />
          {/* Activity Management — Photo/Video Gallery */}
          <Route
            path="/activity-management/photo-video-gallery"
            element={
              <ActivityGalleryAccess>
                <ActivityGalleryList />
              </ActivityGalleryAccess>
            }
          />
          <Route
            path="/activity-management/photo-video-gallery/new"
            element={
              <ActivityGalleryAccess requireCreate>
                <CreateActivityGallery />
              </ActivityGalleryAccess>
            }
          />
          <Route
            path="/activity-management/photo-video-gallery/:id/edit"
            element={
              <ActivityGalleryAccess requireEdit>
                <CreateActivityGallery />
              </ActivityGalleryAccess>
            }
          />
          <Route
            path="/activity-management/photo-video-gallery/:id"
            element={
              <ActivityGalleryAccess>
                <ActivityGalleryDetails />
              </ActivityGalleryAccess>
            }
          />

          {/* Homework Management */}
          <Route path="/homework" element={<ProtectedRoute requiredPermissions="HOMEWORK_MGMT:view"><HomeworkList /></ProtectedRoute>} />
          <Route path="/homework/new" element={<ProtectedRoute requiredPermissions="HOMEWORK_MGMT:create"><AddHomework /></ProtectedRoute>} />
          <Route path="/homework/:id/edit" element={<ProtectedRoute requiredPermissions="HOMEWORK_MGMT:edit"><AddHomework /></ProtectedRoute>} />
          <Route path="/homework/:id" element={<ProtectedRoute requiredPermissions="HOMEWORK_MGMT:view"><HomeworkDetails /></ProtectedRoute>} />

          {/* Attendance Management */}
          {/* Attendance Management */}
          <Route path="/attendance/mark" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><MarkAttendance /></ProtectedRoute>} />
          <Route path="/attendance/report" element={<ProtectedRoute requiredPermissions="ACADEMIC_MGMT:view"><AttendanceReport /></ProtectedRoute>} />


          {/* Admissions – Lead Management */}
          <Route path="/admissions/leads" element={<ProtectedRoute requiredPermissions="ADMISSIONS_MGMT:view"><LeadManagementPage /></ProtectedRoute>} />
          <Route path="/admissions/leads/add" element={<ProtectedRoute requiredPermissions="ADMISSIONS_MGMT:create"><AddLeadPage /></ProtectedRoute>} />
          <Route path="/admissions/leads/:id/edit" element={<ProtectedRoute requiredPermissions="ADMISSIONS_MGMT:edit"><AddLeadPage /></ProtectedRoute>} />

          {/* Admissions – Enrollment */}
          <Route
            path="/admissions/enrollment"
            element={
              <ProtectedRoute requiredPermissions={["ADMISSIONS_MGMT:view", "ADMISSIONS_MGMT:create", "ADMISSIONS_MGMT:edit"]}>
                <EnrollmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/enrollment/from-lead/:leadId"
            element={
              <ProtectedRoute requiredPermissions={["ADMISSIONS_MGMT:view", "ADMISSIONS_MGMT:create", "ADMISSIONS_MGMT:edit"]}>
                <EnrollmentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admissions/enrollment/print" element={<ProtectedRoute requiredPermissions="ADMISSIONS_MGMT:view"><EnrollmentPrintPage /></ProtectedRoute>} />

          {/* Support Foundation */}
          <Route
            path="/support"
            element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN", "TEACHER"]}>
                <SupportRouteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="faqs" replace />} />
            <Route path="faqs" element={<FaqList />} />
            <Route
              path="faqs/add"
              element={
                <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN"]}>
                  <AddFaq />
                </ProtectedRoute>
              }
            />
            <Route
              path="faqs/:id/edit"
              element={
                <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN", "TENANT_ADMIN", "ADMIN", "SCHOOL_ADMIN"]}>
                  <AddFaq />
                </ProtectedRoute>
              }
            />
            <Route path="faqs/:id" element={<FaqDetail />} />
            <Route path="contact" element={<ContactSupport />} />
            <Route path="updates" element={<ProductUpdates />} />
            <Route path="updates/add" element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN"]}>
                <AddProductUpdate />
              </ProtectedRoute>
            } />
            <Route path="updates/:id/edit" element={
              <ProtectedRoute requiredRoles={["SUPER_ADMIN", "SYSTEM_ADMIN"]}>
                <AddProductUpdate />
              </ProtectedRoute>
            } />
            <Route path="updates/:id" element={<ProductUpdateDetail />} />
          </Route>
        </Route>

      </Routes>
    </Suspense>
  );
}
