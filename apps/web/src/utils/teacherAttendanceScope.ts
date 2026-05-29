import teacherAssignmentApi, { TeacherAssignmentApiItem } from "../api/teacherAssignmentApi";
import { TeacherResponse } from "../api/services/teacherService";
import { SchoolClass, ClassDivision } from "../api/services/schoolClassService";
import {
  AttendanceTeacherScopeResponse,
} from "../api/services/attendanceService";

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
        if (!row.class_id && (!row.class_name || !row.division_names?.length)) return [];
        const matchedClass = row.class_id
          ? classList.find((c) => c.id === row.class_id)
          : classList.find((c) => c.name === row.class_name);
        if (!matchedClass) return [];
        const matchedDivisionIds =
          row.divisions?.map((d) => d.id).filter((id) => id > 0) ||
          matchedClass.divisions
            .filter((d) => (row.division_names || []).includes(d.division_name))
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

/** Class teacher slot: no subject on assignment (Assign Teacher with subject blank). */
export function isClassTeacherAssignment(assignment: TeacherAssignmentApiItem): boolean {
  if (assignment.subject_id != null) return false;
  const designation = (assignment.designation || "").trim().toLowerCase();
  if (designation === "subject teacher") return false;
  return designation === "class teacher" || designation === "" || designation === "assigned";
}

export function filterClassTeacherAssignments(
  assignmentMappings: TeacherAssignmentApiItem[]
): TeacherAssignmentApiItem[] {
  return assignmentMappings.filter(isClassTeacherAssignment);
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

/** Attendance mark/report: class-teacher assignments only (supports multi class/division). */
export function getTeacherAttendanceScopedMappings(
  assignmentMappings: TeacherAssignmentApiItem[],
  teacherId: number,
  academicYearId: number
): TeacherAssignmentApiItem[] {
  return filterClassTeacherAssignments(
    getTeacherScopedMappings(assignmentMappings, teacherId, academicYearId)
  );
}

export function getAssignedTeacherIds(
  assignmentMappings: TeacherAssignmentApiItem[],
  academicYearId: number,
  classTeacherOnly = false
): Set<number> {
  const ids = new Set<number>();
  const source = classTeacherOnly
    ? filterClassTeacherAssignments(assignmentMappings)
    : assignmentMappings;
  for (const a of source) {
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

export function filterTeachersWithClassTeacherAssignments(
  teachers: TeacherResponse[],
  assignmentMappings: TeacherAssignmentApiItem[],
  academicYearId: number
): TeacherResponse[] {
  const assignedIds = getAssignedTeacherIds(assignmentMappings, academicYearId, true);
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
    const matched = allDivisions.filter((d) => assignedDivisionIds.includes(d.id));
    if (matched.length > 0) return matched;

    // Class list may lack division rows when built from assignment_rows without division ids.
    return assignedDivisionIds.map((divId) => {
      const mapping = teacherScopedMappings.find(
        (a) => a.class_id === classId && getAssignmentDivisionIds(a).includes(divId)
      );
      const names = mapping?.division_name
        ? mapping.division_name.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const nameIndex = mapping
        ? getAssignmentDivisionIds(mapping).indexOf(divId)
        : 0;
      return {
        id: divId,
        class_id: classId,
        division_name: names[nameIndex] || names[0] || "Division",
        is_active: true,
      };
    });
  }

  const selectedTeacher = teachers.find((t) => t.id === teacherId && t.class_id === classId);
  if (selectedTeacher?.class_division_id) {
    const matched = allDivisions.filter((d) => d.id === selectedTeacher.class_division_id);
    if (matched.length > 0) return matched;
    return [
      {
        id: selectedTeacher.class_division_id,
        class_id: classId,
        division_name: selectedTeacher.division_name || "Division",
        is_active: true,
      },
    ];
  }
  return [];
}

/** Ensure each class carries division ids from assignment mappings (for teacher fallback path). */
export function enrichClassListWithMappingDivisions(
  classList: SchoolClass[],
  assignmentMappings: TeacherAssignmentApiItem[]
): SchoolClass[] {
  return classList.map((cls) => {
    const mappings = assignmentMappings.filter((a) => a.class_id === cls.id);
    const divisions = [...cls.divisions];
    for (const mapping of mappings) {
      const divisionIds = getAssignmentDivisionIds(mapping);
      const names = mapping.division_name
        ? mapping.division_name.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      divisionIds.forEach((divId, index) => {
        if (divId > 0 && !divisions.some((d) => d.id === divId)) {
          divisions.push({
            id: divId,
            class_id: cls.id,
            division_name: names[index] || names[0] || "Division",
            is_active: true,
          });
        }
      });
    }
    return { ...cls, divisions };
  });
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

/** Build class list from GET /api/teachers/{id} assignment_rows (no classes API needed). */
/** Mark attendance: build class/division list from class-teacher assignments only (not subject slots). */
export function buildSchoolClassesFromClassTeacherMappings(
  mappings: TeacherAssignmentApiItem[],
  academicYearId: number,
  tenantId = 0
): SchoolClass[] {
  const byClassId = new Map<number, SchoolClass>();

  for (const mapping of mappings) {
    if (!mapping.class_id || !isClassTeacherAssignment(mapping)) continue;
    if (!byClassId.has(mapping.class_id)) {
      byClassId.set(mapping.class_id, {
        id: mapping.class_id,
        tenant_id: tenantId,
        academic_year_id: mapping.academic_year_id ?? academicYearId,
        name: mapping.class_name || "",
        code: mapping.class_name || "",
        is_active: true,
        divisions: [],
      });
    }
    const schoolClass = byClassId.get(mapping.class_id)!;
    for (const divId of getAssignmentDivisionIds(mapping)) {
      if (divId <= 0 || schoolClass.divisions.some((d) => d.id === divId)) continue;
      const names = mapping.division_name
        ? mapping.division_name.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const nameIndex = getAssignmentDivisionIds(mapping).indexOf(divId);
      schoolClass.divisions.push({
        id: divId,
        class_id: mapping.class_id,
        division_name: names[nameIndex] || names[0] || "Division",
        is_active: true,
      });
    }
  }

  return Array.from(byClassId.values());
}

export function buildSchoolClassesFromAssignmentRows(
  teacher: TeacherResponse,
  academicYearId: number,
  tenantId = 0
): SchoolClass[] {
  const byClassId = new Map<number, SchoolClass>();

  for (const row of teacher.assignment_rows || []) {
    if (!row.class_id) continue;
    if (!byClassId.has(row.class_id)) {
      byClassId.set(row.class_id, {
        id: row.class_id,
        tenant_id: tenantId,
        academic_year_id: academicYearId,
        name: row.class_name || "",
        code: row.class_name || "",
        is_active: true,
        divisions: [],
      });
    }
    const schoolClass = byClassId.get(row.class_id)!;
    const divisionEntries =
      row.divisions?.length
        ? row.divisions
        : (row.division_names || []).map((name, index) => ({
            id: -(index + 1),
            division_name: name,
          }));

    for (const div of divisionEntries) {
      if (div.id > 0 && !schoolClass.divisions.some((d) => d.id === div.id)) {
        schoolClass.divisions.push({
          id: div.id,
          class_id: row.class_id,
          division_name: div.division_name,
          is_active: true,
        });
      }
    }
  }

  if (
    byClassId.size === 0 &&
    teacher.class_id &&
    teacher.class_division_id
  ) {
    byClassId.set(teacher.class_id, {
      id: teacher.class_id,
      tenant_id: tenantId,
      academic_year_id: academicYearId,
      name: teacher.class_name || "",
      code: teacher.class_name || "",
      is_active: true,
      divisions: [
        {
          id: teacher.class_division_id,
          class_id: teacher.class_id,
          division_name: teacher.division_name || "",
          is_active: true,
        },
      ],
    });
  }

  return Array.from(byClassId.values());
}

export function buildMappingsFromTeacherDetail(
  teacher: TeacherResponse,
  classList: SchoolClass[],
  academicYearId: number
): TeacherAssignmentApiItem[] {
  const fromRows = buildTeacherFallbackMappings(teacher, classList).map((m) => ({
    ...m,
    academic_year_id: m.academic_year_id ?? academicYearId,
  }));
  return fromRows;
}

export function scopeToSchoolClasses(
  scope: AttendanceTeacherScopeResponse,
  tenantId = 0
): SchoolClass[] {
  return scope.classes.map((c) => ({
    id: c.id,
    tenant_id: tenantId,
    academic_year_id: c.academic_year_id ?? null,
    name: c.name,
    code: c.name,
    is_active: true,
    divisions: c.divisions.map((d) => ({
      id: d.id,
      class_id: c.id,
      division_name: d.division_name,
      is_active: true,
    })),
  }));
}

export function buildMappingsFromAttendanceScope(
  scope: AttendanceTeacherScopeResponse,
  academicYearId: number
): TeacherAssignmentApiItem[] {
  const items: TeacherAssignmentApiItem[] = [];
  let syntheticId = -1;
  for (const cls of scope.classes) {
    const divisionIds = cls.divisions.map((d) => d.id);
    if (!divisionIds.length) continue;
    items.push({
      id: syntheticId--,
      academic_year_id: cls.academic_year_id ?? academicYearId,
      class_id: cls.id,
      class_division_id: divisionIds[0],
      class_division_ids: divisionIds,
      class_name: cls.name,
      division_name: cls.divisions.map((d) => d.division_name).join(", "),
      teacher_id: scope.teacher_id,
      teacher_name: scope.teacher_name,
      designation: "Class Teacher",
      status: "ASSIGNED",
    });
  }
  return items;
}

export function countTeacherAttendanceClassDivisionPairs(
  teacherScopedMappings: TeacherAssignmentApiItem[]
): number {
  return getTeacherClassDivisionPairs(teacherScopedMappings).length;
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
