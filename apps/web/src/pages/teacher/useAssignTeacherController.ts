import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useFormManager } from "../../hooks/useFormManager";
import type { FormValidationConfig } from "../../utils/formValidation";
import type { SelectItemOption } from "../../components/semantic";
import teacherAssignmentApi from "../../api/teacherAssignmentApi";
import type { ApiError } from "../../api/client";
import {
  assignTeacherFormConfig,
  type AssignTeacherFormData,
} from "../../formConfig/assignTeacherFormConfig";

const emptyFormValues = (): AssignTeacherFormData => ({
  academic_year_id: null,
  class_id: null,
  class_division_ids: [],
  teacher_id: null,
  subject_id: null,
});

export function useAssignTeacherController() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const skipNextAcademicCascadeResetRef = useRef(false);
  const skipNextClassCascadeResetRef = useRef(false);

  const validationConfig = useMemo<FormValidationConfig<AssignTeacherFormData>>(
    () => ({
      academic_year_id: [{ type: "required", message: "Academic Year is required" }],
      class_id: [{ type: "required", message: "Class is required" }],
      class_division_ids: [{ type: "required", message: "At least one division is required" }],
      teacher_id: [{ type: "required", message: "Teacher is required" }],
      subject_id: [{ type: "required", message: "Subject is required" }],
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
    !!formData.teacher_id &&
    !!formData.subject_id;

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
    queryKey: ["assign-teacher", "teachers"],
    queryFn: teacherAssignmentApi.getTeachers,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["assign-teacher", "subjects", formData.academic_year_id, formData.class_id],
    queryFn: () =>
      teacherAssignmentApi.getSubjects(formData.academic_year_id as number, formData.class_id as number),
    enabled: !!formData.academic_year_id && !!formData.class_id,
  });

  const { data: assignmentCheck, isFetching: assignmentChecking } = useQuery({
    queryKey: [
      "assign-teacher",
      "check-assignment",
      formData.class_id,
      formData.class_division_ids,
      formData.academic_year_id,
    ],
    queryFn: () =>
      teacherAssignmentApi.checkAssignment({
        class_id: formData.class_id as number,
        division_id: formData.class_division_ids[0] as number,
        academic_year_id: formData.academic_year_id as number,
      }),
    enabled:
      !!formData.class_id &&
      (formData.class_division_ids?.length || 0) === 1 &&
      !!formData.academic_year_id,
  });

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
          assignedMap?.class_ids?.includes(item.id)
            ? `${item.name} (Already assigned)`
            : item.name,
        textColor: undefined,
        fontWeight: undefined,
        backgroundColor: assignedMap?.class_ids?.includes(item.id) ? "#d6f0ff" : undefined,
      })),
    [classes, assignedMap?.class_ids]
  );

  const divisionOptions = useMemo<SelectItemOption[]>(
    () =>
      divisions.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label:
          assignedMap?.class_division_ids?.includes(item.id)
            ? `${item.division_name} (Already assigned)`
            : item.division_name,
        textColor: undefined,
        fontWeight: undefined,
        backgroundColor: assignedMap?.class_division_ids?.includes(item.id) ? "#d6f0ff" : undefined,
      })),
    [divisions, assignedMap?.class_division_ids]
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

  const subjectOptions = useMemo<SelectItemOption[]>(
    () =>
      subjects.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label: item.name,
      })),
    [subjects]
  );

  const formConfig = useMemo(
    () =>
      assignTeacherFormConfig({
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
        disableClass: !formData.academic_year_id,
        disableDivision: !formData.class_id,
        disableTeacher: !formData.academic_year_id,
        disableSubject: !formData.academic_year_id || !formData.class_id,
      }),
    [
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
      formData.academic_year_id,
      formData.class_id,
      formData.class_division_ids,
    ]
  );

  const handleConfirmSubmit = async () => {
    if (
      !formData.academic_year_id ||
      !formData.class_id ||
      (formData.class_division_ids?.length || 0) === 0 ||
      !formData.teacher_id ||
      !formData.subject_id
    ) {
      return;
    }

    setError(null);
    try {
      const payload = {
        academic_year_id: formData.academic_year_id,
        class_id: formData.class_id,
        class_division_ids: formData.class_division_ids,
        teacher_id: formData.teacher_id,
        subject_id: formData.subject_id,
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
    !!formData.academic_year_id &&
    !!formData.class_id &&
    (formData.class_division_ids?.length || 0) === 1;

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

