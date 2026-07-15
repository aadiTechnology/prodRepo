/**
 * Navigation Assistant catalog — create/action pages and friendly hints.
 * Create pages require the matching :create permission (RBAC).
 */

export interface NavActionPage {
  name: string;
  path: string;
  hint: string;
  permission: string;
}

/** Pages for creating new records (not in sidebar menu catalog). */
export const NAV_ACTION_PAGES: NavActionPage[] = [
  { name: "Add Teacher", path: "/teachers/add", hint: "Create a new teacher here", permission: "TEACHER_MGMT:create" },
  { name: "Add User", path: "/user/create", hint: "Create a new user here", permission: "ADMIN_MGMT:create" },
  { name: "Add Class - Division", path: "/classes/new", hint: "Create a new class division setup here", permission: "ACADEMIC_MGMT:create" },
  { name: "Add Subject", path: "/subjects/new", hint: "Create a new subject here", permission: "ACADEMIC_MGMT:create" },
  { name: "Add Academic Year", path: "/academic-years/new", hint: "Create a new academic year here", permission: "ACADEMIC_MGMT:create" },
  { name: "Add Fee Category", path: "/fees/categories/add", hint: "Create a new fee category here", permission: "FEE_MGMT:create" },
  { name: "Add Role", path: "/roles/create", hint: "Create a new role here", permission: "ADMIN_MGMT:create" },
  { name: "Add Fee Structure", path: "/fees/setup/add", hint: "Create a new fee structure here", permission: "FEE_MGMT:create" },
  { name: "Create Notice", path: "/communication/notices/new", hint: "Create a new notice here", permission: "COMMUNICATION_MGMT:create" },
  { name: "Assign Class Teacher", path: "/teacher-assignments/assign", hint: "Assign a teacher to a class here", permission: "ADMIN_MGMT:create" },
];

/** Friendly one-line descriptions for list/main pages (shown instead of raw paths). */
export const NAV_PAGE_HINTS: Record<string, string> = {
  "/": "Go to dashboard overview",
  "/users": "View and manage users",
  "/students": "View and manage students",
  "/roles": "View and manage roles",
  "/teachers": "View and manage teachers",
  "/teacher-assignments": "View class teacher assignments",
  "/classes": "View and manage class divisions",
  "/subjects": "View and manage subjects",
  "/academic-years": "View and manage academic years",
  "/homework": "View and manage homework",
  "/attendance/mark": "Mark student attendance",
  "/attendance/report": "View attendance reports",
  "/fees/collect-payment": "Collect fee payments",
  "/fees/invoices": "View fee invoices",
  "/fees/due-list-v2": "View students with due fees",
  "/fees/categories": "Manage fee categories",
  "/fees/setup": "Configure fee structures",
  "/fees/discounts": "Manage fee discounts",
  "/fees/reports": "View fee reports",
  "/communication/notices": "View and manage notices",
  "/staff": "View staff list",
  "/calendar/academic": "Open academic calendar",
  "/activity-management/photo-video-gallery": "Photo and video gallery",
  "/admin/permission-management": "Manage role permissions",
  "/admin/theme-studio": "Customize app theme",
  "/sprints": "Manage sprints",
};

export function hintForPage(name: string, path: string): string {
  return NAV_PAGE_HINTS[path] ?? `Open ${name}`;
}
