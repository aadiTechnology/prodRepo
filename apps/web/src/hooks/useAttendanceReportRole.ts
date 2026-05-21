import { useRBAC } from "../context/RBACContext";

/**
 * Role helpers for the attendance report screen.
 * Keeps STUDENT / TEACHER / admin branching in one place.
 */
export function useAttendanceReportRole() {
  const { hasRole } = useRBAC();
  const isTeacher = hasRole("TEACHER");
  const isStudent = hasRole("STUDENT");
  const isAdminLike = !isTeacher && !isStudent;

  return { isTeacher, isStudent, isAdminLike };
}
