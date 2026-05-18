const STUDENT_ROLE_TOKENS = new Set(["student", "students"]);
const PARENT_ROLE_TOKENS = new Set(["parent", "parents", "guardian"]);

export function normalizeRoleToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function collectRoleTokens(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): Set<string> {
  const tokens = new Set<string>();
  const primary = normalizeRoleToken(userRole);
  if (primary) tokens.add(primary);
  for (const role of rbacRoles) {
    const normalized = normalizeRoleToken(role);
    if (normalized) tokens.add(normalized);
  }
  return tokens;
}

export function isStudentHomeworkUser(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  const tokens = collectRoleTokens(userRole, rbacRoles);
  return [...tokens].some((t) => STUDENT_ROLE_TOKENS.has(t));
}

export function isParentHomeworkUser(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  const tokens = collectRoleTokens(userRole, rbacRoles);
  return [...tokens].some((t) => PARENT_ROLE_TOKENS.has(t));
}

/** Students and parents only view published homework for their class/division (enforced on API). */
export function isHomeworkReadOnlyAudience(
  userRole: string | null | undefined,
  rbacRoles: readonly string[],
): boolean {
  return isStudentHomeworkUser(userRole, rbacRoles) || isParentHomeworkUser(userRole, rbacRoles);
}
