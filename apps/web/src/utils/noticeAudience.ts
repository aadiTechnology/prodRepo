import {
  isHomeworkReadOnlyAudience,
  isParentHomeworkUser,
  isStudentHomeworkUser,
} from "./homeworkAudience";

export { isHomeworkReadOnlyAudience as isNoticeReadOnlyAudience };

export function isStudentNoticeUser(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  return isStudentHomeworkUser(userRole, rbacRoles);
}

export function isTeacherNoticeUser(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  const tokens = new Set<string>();
  const primary = (userRole ?? "").trim().toLowerCase();
  if (primary) tokens.add(primary);
  for (const role of rbacRoles) {
    const normalized = (role ?? "").trim().toLowerCase();
    if (normalized) tokens.add(normalized);
  }
  return tokens.has("teacher") || tokens.has("teachers");
}

export function isParentNoticeUser(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  return isParentHomeworkUser(userRole, rbacRoles);
}
