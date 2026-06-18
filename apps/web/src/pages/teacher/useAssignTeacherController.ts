import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useFormManager } from "../../hooks/useFormManager";
import type { FormValidationConfig } from "../../utils/formValidation";
import type { SelectItemOption } from "../../components/semantic";
import { useAuth } from "../../context/AuthContext";
import teacherAssignmentApi, {
  type SubjectOption,
} from "../../api/teacherAssignmentApi";
import type { ApiError } from "../../api/client";
import {
  assignTeacherFormConfig,
  type AssignTeacherFormData,
} from "../../formConfig/assignTeacherFormConfig";
import type { ClassDivisionColumn } from "../../components/reusable/ApplicableToClassSelector";

const emptyFormValues = (): AssignTeacherFormData => ({
  academic_year_id: null,
  class_id: null,
  class_division_ids: [],
  teacher_id: null,
  subject_id: null,
});

const resolveCurrentAcademicYearId = (
  years: { id: number; is_current?: boolean | number; is_active?: boolean | number }[]
): number | null => {
  const current =
    years.find((y) => y.is_current === true || y.is_current === 1) ??
    years.find((y) => y.is_active === true || y.is_active === 1) ??
    years[0];
  return current?.id ?? null;
};

function buildSubjectClassDivisionMap(
  subjects: SubjectOption[],
  subjectName: string,
  academicYearId: number
): ClassDivisionColumn[] {
  const subjectNameKey = subjectName.trim().toLowerCase();
  const relatedSubjects = subjects.filter(
    (subject) => subject.name.trim().toLowerCase() === subjectNameKey
  );
  const map = new Map<number, ClassDivisionColumn>();

  for (const subject of relatedSubjects) {
    for (const mapping of subject.classes || []) {
      if (mapping.academic_year_id && mapping.academic_year_id !== academicYearId) {
        continue;
      }
      if (mapping.class_division_id == null) {
        continue;
      }

      const classId = mapping.class_id;
      const className = mapping.class_name?.trim() || `Class ${classId}`;
      if (!map.has(classId)) {
        map.set(classId, { id: classId, name: className, divisions: [] });
      }

      const column = map.get(classId)!;
      if (!column.divisions.some((division) => division.id === mapping.class_division_id)) {
        column.divisions.push({
          id: mapping.class_division_id,
          name: mapping.division_name?.trim() || `Division ${mapping.class_division_id}`,
        });
      }
    }
  }

  return Array.from(map.values())
    .map((column) => ({
      ...column,
      divisions: [...column.divisions].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function resolveSubjectAssignmentTargets(
  subjects: SubjectOption[],
  subjectName: string,
  academicYearId: number,
  selectedDivisionIds: number[]
): Array<{ class_id: number; division_id: number; subject_id: number }> {
  const subjectNameKey = subjectName.trim().toLowerCase();
  const relatedSubjects = subjects.filter(
    (subject) => subject.name.trim().toLowerCase() === subjectNameKey
  );
  const selectedSet = new Set(selectedDivisionIds);
  const targets: Array<{ class_id: number; division_id: number; subject_id: number }> = [];
  const seen = new Set<string>();

  for (const subject of relatedSubjects) {
    for (const mapping of subject.classes || []) {
      if (mapping.academic_year_id && mapping.academic_year_id !== academicYearId) {
        continue;
      }
      const divisionId = mapping.class_division_id;
      if (divisionId == null || !selectedSet.has(divisionId)) {
        continue;
      }

      const key = `${mapping.class_id}-${divisionId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      targets.push({
        class_id: mapping.class_id,
        division_id: divisionId,
        subject_id: subject.id,
      });
    }
  }

  return targets;
}

export function useAssignTeacherController() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const effectiveTenantId = user?.tenant_id ?? user?.tenant?.id ?? null;
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const skipNextAcademicCascadeResetRef = useRef(false);
  const skipNextClassCascadeResetRef = useRef(false);

  const validationConfig = useMemo<FormValidationConfig<AssignTeacherFormData>>(
    () => ({
      academic_year_id: [{ type: "required", message: "Academic Year is required" }],
      teacher_id: [{ type: "required", message: "Teacher is required" }],
    }),
    []
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    resetForm,
  } = useFormManager<AssignTeacherFormData>({
    initialValues: emptyFormValues(),
    validationConfig,
    onClearError: () => setError(null),
  });

  const isEditMode = useMemo(() => {
    return (
      !!searchParams.get("assignmentId") ||
      !!searchParams.get("academicYearId") ||
      !!searchParams.get("academic_year_id") ||
      !!searchParams.get("classId") ||
      !!searchParams.get("class_id") ||
      !!searchParams.get("divisionId") ||
      !!searchParams.get("class_division_id") ||
      !!searchParams.get("class_division_ids") ||
      !!searchParams.get("teacherId") ||
      !!searchParams.get("subjectId") ||
      !!searchParams.get("subject_id")
    );
  }, [searchParams]);

  const assignmentId = useMemo(() => {
    const raw = searchParams.get("assignmentId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }, [searchParams]);

  const classNameFromQuery = useMemo(() => {
    const raw = searchParams.get("className");
    return raw ? raw.trim() : "";
  }, [searchParams]);

  const divisionNameFromQuery = useMemo(() => {
    const raw = searchParams.get("divisionName");
    return raw ? raw.trim() : "";
  }, [searchParams]);

  useEffect(() => {
    const academicYearRaw =
      searchParams.get("academicYearId") ?? searchParams.get("academic_year_id");
    const classRaw = searchParams.get("classId") ?? searchParams.get("class_id");
    const divisionRaw =
      searchParams.get("divisionId") ??
      searchParams.get("classDivisionId") ??
      searchParams.get("class_division_id");
    const divisionsRaw = searchParams.get("class_division_ids");
    const teacherRaw = searchParams.get("teacherId");
    const subjectRaw = searchParams.get("subjectId") ?? searchParams.get("subject_id");

    if (!academicYearRaw && !classRaw && !divisionRaw && !teacherRaw && !subjectRaw) {
      return;
    }

    const academicYearId = academicYearRaw ? Number(academicYearRaw) : null;
    const classId = classRaw ? Number(classRaw) : null;
    const divisionIds = divisionsRaw
      ? divisionsRaw
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((v) => !Number.isNaN(v))
      : divisionRaw
        ? [Number(divisionRaw)]
        : [];
    const teacherId = teacherRaw ? Number(teacherRaw) : null;
    const subjectId = subjectRaw ? Number(subjectRaw) : null;

    const hasAnyInvalidNumber = [academicYearId, classId, teacherId, subjectId]
      .filter((value) => value !== null)
      .some((value) => Number.isNaN(value as number));
    if (hasAnyInvalidNumber) {
      return;
    }

    skipNextAcademicCascadeResetRef.current = true;
    skipNextClassCascadeResetRef.current = true;
    setFormData((prev) => ({
      ...prev,
      academic_year_id: academicYearId,
      class_id: classId,
      class_division_ids: divisionIds,
      teacher_id: teacherId,
      subject_id: subjectId,
    }));
    setError(null);
  }, [searchParams, setFormData]);

  const hasManualPrefillIds =
    !!formData.academic_year_id &&
    !!formData.class_id &&
    (formData.class_division_ids?.length || 0) > 0 &&
    !!formData.teacher_id;

  const { data: assignmentDetail } = useQuery({
    queryKey: ["assign-teacher", "assignment-detail", assignmentId],
    queryFn: () => teacherAssignmentApi.getTeacherAssignmentById(assignmentId as number),
    enabled: !!assignmentId && !hasManualPrefillIds,
  });

  useEffect(() => {
    if (!assignmentDetail) return;
    skipNextAcademicCascadeResetRef.current = true;
    skipNextClassCascadeResetRef.current = true;
    setFormData((prev) => ({
      ...prev,
      academic_year_id: assignmentDetail.academic_year_id,
      class_id: assignmentDetail.class_id,
      class_division_ids:
        assignmentDetail.class_division_ids && assignmentDetail.class_division_ids.length > 0
          ? assignmentDetail.class_division_ids
          : assignmentDetail.class_division_id
            ? [assignmentDetail.class_division_id]
            : [],
      teacher_id: assignmentDetail.teacher_id,
      subject_id: assignmentDetail.subject_id ?? null,
    }));
    setError(null);
  }, [assignmentDetail, setFormData]);

  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ["assign-teacher", "academic-years"],
    queryFn: teacherAssignmentApi.getAcademicYears,
  });

  const hasQueryPrefill = useMemo(() => {
    return (
      !!searchParams.get("academicYearId") ||
      !!searchParams.get("academic_year_id") ||
      !!searchParams.get("assignmentId")
    );
  }, [searchParams]);

  useEffect(() => {
    if (isEditMode && hasQueryPrefill) return;
    if (assignmentId) return;
    if (academicYearsLoading || academicYears.length === 0) return;
    if (formData.academic_year_id != null) return;

    const currentYearId = resolveCurrentAcademicYearId(academicYears);
    if (currentYearId == null) return;

    skipNextAcademicCascadeResetRef.current = true;
    setFormData((prev) => ({
      ...prev,
      academic_year_id: currentYearId,
    }));
  }, [
    academicYears,
    academicYearsLoading,
    assignmentId,
    formData.academic_year_id,
    hasQueryPrefill,
    isEditMode,
    setFormData,
  ]);

  useEffect(() => {
    const resolveMissingIdsByName = async () => {
      if (!isEditMode) return;
      if (!classNameFromQuery || !divisionNameFromQuery) return;
      if (formData.academic_year_id && formData.class_id && (formData.class_division_ids?.length || 0) > 0) return;
      if (academicYearsLoading || academicYears.length === 0) return;

      for (const ay of academicYears) {
        try {
          const classesForYear = await teacherAssignmentApi.getClasses(ay.id);
          const matchedClass = classesForYear.find(
            (c) => c.name.trim().toLowerCase() === classNameFromQuery.toLowerCase()
          );
          if (!matchedClass) continue;

          const divisionsForClass = await teacherAssignmentApi.getDivisions(matchedClass.id);
          const matchedDivision = divisionsForClass.find(
            (d) =>
              d.division_name.trim().toLowerCase() === divisionNameFromQuery.toLowerCase()
          );
          if (!matchedDivision) continue;

          skipNextAcademicCascadeResetRef.current = true;
          skipNextClassCascadeResetRef.current = true;
          setFormData((prev) => ({
            ...prev,
            academic_year_id: prev.academic_year_id ?? ay.id,
            class_id: prev.class_id ?? matchedClass.id,
            class_division_ids:
              prev.class_division_ids && prev.class_division_ids.length > 0
                ? prev.class_division_ids
                : [matchedDivision.id],
          }));
          return;
        } catch {
          // Continue trying next academic year.
        }
      }
    };

    void resolveMissingIdsByName();
  }, [
    isEditMode,
    classNameFromQuery,
    divisionNameFromQuery,
    formData.academic_year_id,
    formData.class_id,
    formData.class_division_ids,
    academicYearsLoading,
    academicYears,
    setFormData,
  ]);

  useEffect(() => {
    const resolveAcademicYearFromClassId = async () => {
      if (!isEditMode) return;
      if (formData.academic_year_id || !formData.class_id) return;
      if (academicYearsLoading || academicYears.length === 0) return;

      for (const ay of academicYears) {
        try {
          const classesForYear = await teacherAssignmentApi.getClasses(ay.id);
          const found = classesForYear.some((c) => c.id === formData.class_id);
          if (!found) continue;

          skipNextAcademicCascadeResetRef.current = true;
          setFormData((prev) => ({
            ...prev,
            academic_year_id: ay.id,
          }));
          return;
        } catch {
          // Continue trying next academic year.
        }
      }
    };

    void resolveAcademicYearFromClassId();
  }, [
    isEditMode,
    formData.academic_year_id,
    formData.class_id,
    academicYearsLoading,
    academicYears,
    setFormData,
  ]);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["assign-teacher", "classes", formData.academic_year_id],
    queryFn: () => teacherAssignmentApi.getClasses(formData.academic_year_id as number),
    enabled: !!formData.academic_year_id,
  });

  const { data: assignedMap } = useQuery({
    queryKey: ["assign-teacher", "assigned-map", formData.academic_year_id],
    queryFn: () => teacherAssignmentApi.getAssignedMap(formData.academic_year_id as number),
    enabled: !!formData.academic_year_id,
  });

  const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
    queryKey: ["assign-teacher", "divisions", formData.class_id],
    queryFn: () => teacherAssignmentApi.getDivisions(formData.class_id as number),
    enabled: !!formData.class_id,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ["assign-teacher", "teachers", effectiveTenantId],
    queryFn: teacherAssignmentApi.getTeachers,
    enabled: effectiveTenantId != null,
  });

  const isClassTeacherMode = formData.subject_id == null;
  const useSubjectMultiClassSelector =
    !isClassTeacherMode && !(isEditMode && assignmentId);

  const { data: subjectsWithMappings = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["assign-teacher", "subjects", formData.academic_year_id],
    queryFn: () => teacherAssignmentApi.getSubjects(formData.academic_year_id as number),
    enabled: !!formData.academic_year_id,
  });

  const { data: subjects = [], isLoading: legacySubjectsLoading } = useQuery({
    queryKey: ["assign-teacher", "subjects", formData.academic_year_id, formData.class_id],
    queryFn: () =>
      teacherAssignmentApi.getSubjects(
        formData.academic_year_id as number,
        formData.class_id as number
      ),
    enabled:
      !!formData.academic_year_id &&
      !!formData.class_id &&
      !useSubjectMultiClassSelector,
  });

  const { data: assignmentCheck, isFetching: assignmentChecking } = useQuery({
    queryKey: [
      "assign-teacher",
      "check-assignment",
      formData.class_id,
      formData.class_division_ids,
      formData.academic_year_id,
      formData.subject_id,
    ],
    queryFn: () =>
      teacherAssignmentApi.checkAssignment({
        class_id: formData.class_id as number,
        division_id: formData.class_division_ids[0] as number,
        academic_year_id: formData.academic_year_id as number,
        ...(formData.subject_id != null ? { subject_id: formData.subject_id } : {}),
      }),
    enabled:
      !!formData.class_id &&
      (formData.class_division_ids?.length || 0) === 1 &&
      !!formData.academic_year_id,
  });

  const selectedSubject = useMemo(
    () => subjectsWithMappings.find((subject) => subject.id === formData.subject_id) ?? null,
    [subjectsWithMappings, formData.subject_id]
  );

  const subjectClassDivisionMap = useMemo(() => {
    if (!useSubjectMultiClassSelector || !selectedSubject || !formData.academic_year_id) {
      return [];
    }
    return buildSubjectClassDivisionMap(
      subjectsWithMappings,
      selectedSubject.name,
      formData.academic_year_id
    );
  }, [
    useSubjectMultiClassSelector,
    selectedSubject,
    subjectsWithMappings,
    formData.academic_year_id,
  ]);

  useEffect(() => {
    if (!useSubjectMultiClassSelector || formData.subject_id == null) {
      return;
    }
    setFormData((prev) => {
      if (prev.class_id === null && (prev.class_division_ids?.length || 0) === 0) {
        return prev;
      }
      return {
        ...prev,
        class_id: null,
        class_division_ids: [],
      };
    });
  }, [formData.subject_id, useSubjectMultiClassSelector, setFormData]);

  useEffect(() => {
    if (skipNextAcademicCascadeResetRef.current) {
      skipNextAcademicCascadeResetRef.current = false;
      return;
    }
    setFormData((prev) => {
      if (
        prev.class_id === null &&
        (prev.class_division_ids?.length || 0) === 0 &&
        prev.teacher_id === null
      ) {
        return prev;
      }
      return {
        ...prev,
        class_id: null,
        class_division_ids: [],
        teacher_id: null,
        subject_id: null,
      };
    });
  }, [formData.academic_year_id, setFormData]);

  useEffect(() => {
    if (skipNextClassCascadeResetRef.current) {
      skipNextClassCascadeResetRef.current = false;
      return;
    }
    setFormData((prev) => {
      if (
        (prev.class_division_ids?.length || 0) === 0 &&
        prev.teacher_id === null &&
        prev.subject_id === null
      ) {
        return prev;
      }
      return {
        ...prev,
        class_division_ids: [],
        teacher_id: null,
        subject_id: null,
      };
    });
  }, [formData.class_id, setFormData]);

  const assignTeacherMutation = useMutation({
    mutationFn: teacherAssignmentApi.assignTeacher,
  });

  const academicYearOptions = useMemo<SelectItemOption[]>(
    () =>
      academicYears.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label: item.name,
      })),
    [academicYears]
  );

  const classOptions = useMemo<SelectItemOption[]>(
    () =>
      classes.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label:
          isClassTeacherMode && assignedMap?.class_ids?.includes(item.id)
            ? `${item.name} (Already assigned)`
            : item.name,
        textColor: undefined,
        fontWeight: undefined,
        backgroundColor:
          isClassTeacherMode && assignedMap?.class_ids?.includes(item.id) ? "#d6f0ff" : undefined,
      })),
    [classes, assignedMap?.class_ids, isClassTeacherMode]
  );

  const divisionOptions = useMemo<SelectItemOption[]>(
    () =>
      divisions.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label:
          isClassTeacherMode && assignedMap?.class_division_ids?.includes(item.id)
            ? `${item.division_name} (Already assigned)`
            : item.division_name,
        textColor: undefined,
        fontWeight: undefined,
        backgroundColor:
          isClassTeacherMode && assignedMap?.class_division_ids?.includes(item.id)
            ? "#d6f0ff"
            : undefined,
      })),
    [divisions, assignedMap?.class_division_ids, isClassTeacherMode]
  );

  const teacherOptions = useMemo<SelectItemOption[]>(
    () =>
      teachers.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label: item.full_name,
      })),
    [teachers]
  );

  const subjectOptions = useMemo<SelectItemOption[]>(() => {
    if (useSubjectMultiClassSelector) {
      const byName = new Map<string, SubjectOption>();
      for (const subject of subjectsWithMappings) {
        const key = subject.name.trim().toLowerCase();
        if (!key || byName.has(key)) {
          continue;
        }
        byName.set(key, subject);
      }
      return Array.from(byName.values()).map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label: item.name,
      }));
    }

    return subjects.map((item) => ({
      id: String(item.id),
      value: String(item.id),
      label: item.name,
    }));
  }, [subjects, subjectsWithMappings, useSubjectMultiClassSelector]);

  const formConfig = useMemo(() => {
    const config = assignTeacherFormConfig({
      academicYearOptions,
      classOptions,
      divisionOptions,
      teacherOptions,
      subjectOptions,
      academicYearsLoading,
      classesLoading,
      divisionsLoading,
      teachersLoading,
      subjectsLoading: useSubjectMultiClassSelector ? subjectsLoading : legacySubjectsLoading,
      disableClass: !formData.academic_year_id,
      disableDivision: !formData.class_id,
      disableTeacher: !formData.academic_year_id || effectiveTenantId == null,
      disableSubject: !formData.academic_year_id,
      hideClassFields: useSubjectMultiClassSelector,
    });

    return config;
  }, [
      academicYearOptions,
      classOptions,
      divisionOptions,
      teacherOptions,
      subjectOptions,
      academicYearsLoading,
      classesLoading,
      divisionsLoading,
      teachersLoading,
      subjectsLoading,
      legacySubjectsLoading,
      useSubjectMultiClassSelector,
      subjectClassDivisionMap,
      formData.academic_year_id,
      formData.class_id,
      formData.class_division_ids,
      formData.subject_id,
      effectiveTenantId,
      isClassTeacherMode,
    ]
  );

  const handleSubjectScopeClassToggle = useCallback(
    (classId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds =
          subjectClassDivisionMap
            .find((column) => column.id === classId)
            ?.divisions.map((division) => division.id) ?? [];
        const nextDivisionIds = checked
          ? Array.from(new Set([...(prev.class_division_ids || []), ...classDivisionIds]))
          : (prev.class_division_ids || []).filter((id) => !classDivisionIds.includes(id));
        return {
          ...prev,
          class_division_ids: nextDivisionIds,
        };
      });
    },
    [setFormData, subjectClassDivisionMap]
  );

  const handleSubjectScopeDivisionToggle = useCallback(
    (_classId: number, divisionId: number, checked: boolean) => {
      setFormData((prev) => ({
        ...prev,
        class_division_ids: checked
          ? Array.from(new Set([...(prev.class_division_ids || []), divisionId]))
          : (prev.class_division_ids || []).filter((id) => id !== divisionId),
      }));
    },
    [setFormData]
  );

  const handleSubjectScopeClassSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setFormData((prev) => ({ ...prev, class_division_ids: [] }));
        return;
      }
      const allDivisionIds = subjectClassDivisionMap.flatMap((column) =>
        column.divisions.map((division) => division.id)
      );
      setFormData((prev) => ({
        ...prev,
        class_division_ids: allDivisionIds,
      }));
    },
    [setFormData, subjectClassDivisionMap]
  );

  const selectedSubjectClassIds = useMemo(
    () =>
      subjectClassDivisionMap
        .filter((column) =>
          column.divisions.some((division) => formData.class_division_ids.includes(division.id))
        )
        .map((column) => column.id),
    [subjectClassDivisionMap, formData.class_division_ids]
  );

  const isSubjectScopeClassSelectAll = useMemo(
    () =>
      subjectClassDivisionMap.length > 0 &&
      subjectClassDivisionMap.every((column) =>
        column.divisions.every((division) => formData.class_division_ids.includes(division.id))
      ),
    [subjectClassDivisionMap, formData.class_division_ids]
  );

  const handleConfirmSubmit = async () => {
    if (!formData.academic_year_id || !formData.teacher_id) {
      return;
    }

    if (useSubjectMultiClassSelector) {
      if (!formData.subject_id || (formData.class_division_ids?.length || 0) === 0) {
        setError("Select a subject and at least one class division.");
        setSnackbar("Select a subject and at least one class division.");
        return;
      }

      const subjectName = selectedSubject?.name;
      if (!subjectName) {
        setError("Selected subject is invalid.");
        return;
      }

      const targets = resolveSubjectAssignmentTargets(
        subjectsWithMappings,
        subjectName,
        formData.academic_year_id,
        formData.class_division_ids
      );
      if (targets.length === 0) {
        setError("Selected divisions are not mapped to this subject.");
        setSnackbar("Selected divisions are not mapped to this subject.");
        return;
      }

      setError(null);
      try {
        const grouped = new Map<number, { divisionIds: number[]; subjectId: number }>();
        for (const target of targets) {
          const existing = grouped.get(target.class_id);
          if (existing) {
            existing.divisionIds.push(target.division_id);
          } else {
            grouped.set(target.class_id, {
              divisionIds: [target.division_id],
              subjectId: target.subject_id,
            });
          }
        }

        for (const [classId, group] of grouped.entries()) {
          await assignTeacherMutation.mutateAsync({
            academic_year_id: formData.academic_year_id,
            class_id: classId,
            class_division_ids: group.divisionIds,
            teacher_id: formData.teacher_id,
            subject_id: group.subjectId,
          });
        }

        setSnackbar("Teacher assigned successfully!");
        setTimeout(() => {
          resetForm(emptyFormValues());
          navigate("/teacher-assignments");
        }, 1000);
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage =
          (apiError?.response?.data?.detail as string | undefined) ||
          (apiError?.response?.data?.message as string | undefined) ||
          (err instanceof Error ? err.message : "Failed to assign teacher.");
        setError(errorMessage);
        setSnackbar(errorMessage);
      }
      return;
    }

    if (
      !formData.class_id ||
      (formData.class_division_ids?.length || 0) === 0
    ) {
      setError("Class and at least one division are required.");
      setSnackbar("Class and at least one division are required.");
      return;
    }

    setError(null);
    try {
      const payload = {
        academic_year_id: formData.academic_year_id,
        class_id: formData.class_id,
        class_division_ids: formData.class_division_ids,
        teacher_id: formData.teacher_id,
        ...(formData.subject_id != null ? { subject_id: formData.subject_id } : {}),
      };
      if (isEditMode && assignmentId) {
        await teacherAssignmentApi.updateTeacherAssignment(assignmentId, payload);
      } else {
        await assignTeacherMutation.mutateAsync(payload);
      }
      setSnackbar(isEditMode ? "Teacher assignment updated successfully!" : "Teacher assigned successfully!");
      setTimeout(() => {
        resetForm(emptyFormValues());
        navigate("/teacher-assignments");
      }, 1000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        (apiError?.response?.data?.detail as string | undefined) ||
        (apiError?.response?.data?.message as string | undefined) ||
        (err instanceof Error ? err.message : "Failed to assign teacher.");
      setError(errorMessage);
      setSnackbar(errorMessage);
    }
  };

  const canShowAssignmentHint =
    !useSubjectMultiClassSelector &&
    !!formData.academic_year_id &&
    !!formData.class_id &&
    (formData.class_division_ids?.length || 0) === 1;

  const assignmentHintLabel = isClassTeacherMode
    ? "Already assigned class teacher"
    : "Already assigned subject teacher";

  return {
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    resetForm,
    formConfig,
    assignmentCheck,
    assignmentChecking,
    canShowAssignmentHint,
    assignmentHintLabel,
    isClassTeacherMode,
    useSubjectMultiClassSelector,
    subjectClassDivisionMap,
    selectedSubjectClassIds,
    isSubjectScopeClassSelectAll,
    handleSubjectScopeClassToggle,
    handleSubjectScopeDivisionToggle,
    handleSubjectScopeClassSelectAll,
    handleConfirmSubmit,
    assignTeacherPending: assignTeacherMutation.isPending,
    hasAssignedLegend:
      (assignedMap?.class_ids?.length || 0) > 0 ||
      (assignedMap?.class_division_ids?.length || 0) > 0,
    isEditMode,
    error,
    setError,
    snackbar,
    setSnackbar,
    clearForm: () => {
      resetForm(emptyFormValues());
      setError(null);
      setSnackbar(null);
    },
  };
}

