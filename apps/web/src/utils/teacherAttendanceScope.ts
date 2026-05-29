import teacherAssignmentApi, { TeacherAssignmentApiItem } from "../api/teacherAssignmentApi";
import { TeacherResponse } from "../api/services/teacherService";
import { SchoolClass, ClassDivision } from "../api/services/schoolClassService";

export async function fetchAllTeacherAssignments(): Promise<TeacherAssignmentApiItem[]> {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  let collected: TeacherAssignmentApiItem[] = [];

  do {
    const response = await teacherAssignmentApi.getTeacherAssignments({ page, limit: pageSize });
    const rows = response.data || [];
    collected = collected.concat(rows);
    total = response.pagination?.total || collected.length;
    page += 1;
  } while (collected.length < total);

  return collected;
}

export function getAssignmentDivisionIds(assignment: TeacherAssignmentApiItem): number[] {
  const ids = [
    ...(assignment.class_division_ids || []),
    ...(assignment.class_division_id ? [assignment.class_division_id] : []),
  ];
  return Array.from(new Set(ids.filter((id): id is number => Boolean(id))));
}

export function buildTeacherFallbackMappings(
  teacher: TeacherResponse,
  classList: SchoolClass[]
): TeacherAssignmentApiItem[] {
  const rows = teacher.assignment_rows || [];
  const mappingsFromRows: TeacherAssignmentApiItem[] = rows.flatMap((row, index) => {
    if (!row.class_name || !row.division_names?.length) return [];
    const matchedClass = classList.find((c) => c.name === row.class_name);
    if (!matchedClass) return [];
    const matchedDivisionIds = matchedClass.divisions
      .filter((d) => row.division_names.includes(d.division_name))
      .map((d) => d.id);
    if (!matchedDivisionIds.length) return [];
    return [
      {
        id: -(index + 1),
        academic_year_id: matchedClass.academic_year_id ?? null,
        class_id: matchedClass.id,
        class_division_id: matchedDivisionIds[0],
        class_division_ids: matchedDivisionIds,
        class_name: matchedClass.name,
        division_name: row.division_names.join(", "),
        teacher_id: teacher.id,
        teacher_name: teacher.full_name,
        designation: "",
        status: "ASSIGNED",
      },
    ];
  });

  const mappingsFromLegacyIds: TeacherAssignmentApiItem[] =
    teacher.class_id && teacher.class_division_id
      ? [
          {
            id: -9999,
            academic_year_id: null,
            class_id: teacher.class_id,
            class_division_id: teacher.class_division_id,
            class_division_ids: [teacher.class_division_id],
            class_name: teacher.class_name || null,
            division_name: teacher.division_name || null,
            teacher_id: teacher.id,
            teacher_name: teacher.full_name,
            designation: "",
            status: "ASSIGNED",
          },
        ]
      : [];

  return [...mappingsFromRows, ...mappingsFromLegacyIds];
}

export function assignmentMatchesAcademicYear(
  assignment: TeacherAssignmentApiItem,
  academicYearId: number
): boolean {
  if (!academicYearId) return true;
  return assignment.academic_year_id === academicYearId || assignment.academic_year_id === null;
}

export function getTeacherScopedMappings(
  assignmentMappings: TeacherAssignmentApiItem[],
  teacherId: number,
  academicYearId: number
): TeacherAssignmentApiItem[] {
  if (!teacherId) return [];
  return assignmentMappings.filter(
    (a) =>
      a.teacher_id === teacherId &&
      assignmentMatchesAcademicYear(a, academicYearId)
  );
}

export function getAssignedTeacherIds(
  assignmentMappings: TeacherAssignmentApiItem[],
  academicYearId: number
): Set<number> {
  const ids = new Set<number>();
  for (const a of assignmentMappings) {
    if (!a.teacher_id || a.status !== "ASSIGNED") continue;
    if (!assignmentMatchesAcademicYear(a, academicYearId)) continue;
    if (a.class_id) ids.add(a.teacher_id);
  }
  return ids;
}

export function filterTeachersWithAssignments(
  teachers: TeacherResponse[],
  assignmentMappings: TeacherAssignmentApiItem[],
  academicYearId: number
): TeacherResponse[] {
  const assignedIds = getAssignedTeacherIds(assignmentMappings, academicYearId);
  return teachers.filter((t) => assignedIds.has(t.id));
}

export function getFilteredClassesForTeacher(
  classes: SchoolClass[],
  teachers: TeacherResponse[],
  teacherScopedMappings: TeacherAssignmentApiItem[],
  teacherId: number
): SchoolClass[] {
  if (!teacherId) return [];

  const assignedClassIds = Array.from(
    new Set(teacherScopedMappings.map((a) => a.class_id).filter(Boolean))
  ) as number[];

  if (assignedClassIds.length > 0) {
    return classes.filter((c) => assignedClassIds.includes(c.id));
  }

  const selectedTeacher = teachers.find((t) => t.id === teacherId);
  if (selectedTeacher?.class_id) {
    return classes.filter((c) => c.id === selectedTeacher.class_id);
  }
  return [];
}

export function getFilteredDivisionsForTeacher(
  classes: SchoolClass[],
  teachers: TeacherResponse[],
  teacherScopedMappings: TeacherAssignmentApiItem[],
  teacherId: number,
  classId: number
): ClassDivision[] {
  if (!classId) return [];
  const selectedClass = classes.find((c) => c.id === classId);
  if (!selectedClass) return [];
  const allDivisions = selectedClass.divisions || [];
  if (!teacherId) return allDivisions;

  const assignedDivisionIds = Array.from(
    new Set(
      teacherScopedMappings
        .filter((a) => a.class_id === classId)
        .flatMap((a) => getAssignmentDivisionIds(a))
    )
  ) as number[];

  if (assignedDivisionIds.length > 0) {
    return allDivisions.filter((d) => assignedDivisionIds.includes(d.id));
  }

  const selectedTeacher = teachers.find((t) => t.id === teacherId && t.class_id === classId);
  if (selectedTeacher?.class_division_id) {
    return allDivisions.filter((d) => d.id === selectedTeacher.class_division_id);
  }
  return [];
}

export function resolveTeacherForUser(
  teachers: TeacherResponse[],
  userId?: number | string,
  userEmail?: string
): TeacherResponse | undefined {
  if (!teachers.length) return undefined;
  let match = userId
    ? teachers.find((t) => String(t.user_id) === String(userId))
    : undefined;
  if (!match && userEmail) {
    match = teachers.find((t) => t.email?.toLowerCase() === userEmail.toLowerCase());
  }
  return match;
}

export function getTeacherClassDivisionPairs(
  teacherScopedMappings: TeacherAssignmentApiItem[]
): Array<{ class_id: number; division_id: number }> {
  const pairs = new Map<string, { class_id: number; division_id: number }>();
  for (const a of teacherScopedMappings) {
    if (!a.class_id) continue;
    for (const divId of getAssignmentDivisionIds(a)) {
      const key = `${a.class_id}-${divId}`;
      pairs.set(key, { class_id: a.class_id, division_id: divId });
    }
  }
  return Array.from(pairs.values());
}
