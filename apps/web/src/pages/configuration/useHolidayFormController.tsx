import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertTitle, Button as MuiButton, Stack } from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";

import { academicYearService } from "../../api/services/academicYearService";
import schoolClassService from "../../api/services/schoolClassService";
import holidayApi, { type HolidayCreatePayload, type HolidayUpdatePayload } from "../../services/holidayApi";
import ApplicableToClassSelector from "../../components/reusable/ApplicableToClassSelector";
import { Box, Typography } from "../../components/primitives";
import type { SelectOption } from "../Communication/CreateNotice.formConfig";
import { useFormManager, type DependentFieldPair } from "../../hooks/useFormManager";
import { mapApiErrorsToFields, type FormValidationConfig } from "../../utils/formValidation";
import type { NoticeAudienceType } from "../../types/notice";
import {
  buildHolidayCreatePayload,
  compareIsoDateStrings,
  EMPTY_FORM,
  isDateWithinAcademicYear,
  isValidHolidayType,
  normalizeHolidayTypeForForm,
  normalizeIsoDatePart,
  serializeHolidayFormSnapshot,
  type HolidayFormData,
} from "./holidayForm.config";
import { createHolidayFormConfig } from "./HolidayForm.formConfig";

const HOLIDAY_DATE_FIELD_PAIR: readonly DependentFieldPair<HolidayFormData>[] = [
  ["start_date", "end_date"],
];

export function useHolidayFormController() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const holidayId = id ? Number(id) : null;
  const [searchParams] = useSearchParams();
  const academicYearFromUrl = useMemo(() => {
    const raw = searchParams.get("academic_year_id");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const startDateFromUrl = useMemo(() => {
    const raw = searchParams.get("start_date");
    if (!raw) return null;
    const d = normalizeIsoDatePart(raw);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }, [searchParams]);

  const endDateFromUrl = useMemo(() => {
    const raw = searchParams.get("end_date");
    if (!raw) return null;
    const d = normalizeIsoDatePart(raw);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }, [searchParams]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const baselineSerialized = useRef<string | null>(null);

  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<
    { id: string; label: string; value: string; classId: number }[]
  >([]);

  const academicYearsQuery = useQuery({
    queryKey: ["holidays", "academic-years", "form"],
    queryFn: academicYearService.listActive,
  });
  const academicYears = academicYearsQuery.data ?? [];

  const holidayQuery = useQuery({
    queryKey: ["holidays", "detail", holidayId, academicYearFromUrl, academicYears[0]?.id],
    queryFn: () => {
      const yearId = academicYearFromUrl ?? academicYears[0]?.id;
      if (!yearId) {
        throw new Error("Academic year is required to load this holiday.");
      }
      return holidayApi.getById(Number(holidayId), { academic_year_id: yearId });
    },
    enabled: isEditMode && !!holidayId && (!!academicYearFromUrl || academicYears.length > 0),
  });

  useEffect(() => {
    schoolClassService
      .getAll()
      .then((classes) => {
        setClassOptions(
          classes.map((cls) => ({
            id: String(cls.id),
            value: String(cls.id),
            label: cls.name,
          }))
        );
        const flatDivisions = classes.flatMap((cls) =>
          (cls.divisions || []).map((division) => ({
            id: String(division.id),
            value: String(division.id),
            label: `${cls.name} - ${division.division_name}`,
            classId: cls.id,
          }))
        );
        setDivisionOptions(flatDivisions);
      })
      .catch(() => {
        setClassOptions([]);
        setDivisionOptions([]);
      });
  }, []);

  const initialValues = useMemo(() => ({ ...EMPTY_FORM }), []);

  const validationConfig = useMemo<FormValidationConfig<HolidayFormData>>(() => {
    const validIds = new Set(academicYears.map((y) => y.id));
    return {
      academic_year_id: [
        { type: "required", message: "Academic year is required." },
        {
          type: "custom",
          validate: (fd) => {
            const yid = fd.academic_year_id;
            if (yid == null) return "";
            if (validIds.size > 0 && !validIds.has(yid)) return "Choose a valid academic year.";
            return "";
          },
        },
      ],
      holiday_name: [
        { type: "required", message: "Holiday name is required." },
        {
          type: "custom",
          validate: (fd) => (fd.holiday_name.trim() ? "" : "Holiday name is required."),
        },
      ],
      holiday_type: [
        { type: "required", message: "Holiday type is required." },
        {
          type: "custom",
          validate: (fd) => {
            const t = fd.holiday_type.trim();
            if (!t) return "Holiday type is required.";
            if (!isValidHolidayType(t)) return "Select a valid holiday type.";
            return "";
          },
        },
      ],
      class_ids: [
        {
          type: "custom",
          validate: (fd) => {
            if (fd.audience_type !== "STUDENT" && fd.audience_type !== "ALL") return "";
            if (fd.class_ids.length === 0 && fd.division_ids.length === 0) {
              return "Please select at least one class or division.";
            }
            return "";
          },
        },
      ],
      start_date: [
        { type: "required", message: "Start date is required." },
        {
          type: "pattern",
          regex: /^\d{4}-\d{2}-\d{2}$/,
          message: "Use a valid calendar date (YYYY-MM-DD).",
        },
        {
          type: "custom",
          validate: (fd) => {
            const start = normalizeIsoDatePart(String(fd.start_date ?? ""));
            if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return "";
            const yid = fd.academic_year_id;
            const ay = academicYears.find((y) => y.id === yid);
            if (!ay) return "";
            if (!isDateWithinAcademicYear(start, ay.start_date, ay.end_date)) {
              return "Start date must fall within the selected academic year.";
            }
            return "";
          },
        },
      ],
      end_date: [
        {
          type: "custom",
          validate: (fd) => {
            const endTrim = String(fd.end_date ?? "").trim();
            if (!endTrim) return "";
            const end = normalizeIsoDatePart(endTrim);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
              return "Use a valid calendar date (YYYY-MM-DD).";
            }
            const start = normalizeIsoDatePart(String(fd.start_date ?? ""));
            const cmp = compareIsoDateStrings(end, start);
            if (Number.isNaN(cmp)) return "Enter a valid start date first.";
            if (cmp < 0) return "End date cannot be before start date.";
            const yid = fd.academic_year_id;
            const ay = academicYears.find((y) => y.id === yid);
            if (ay && !isDateWithinAcademicYear(end, ay.start_date, ay.end_date)) {
              return "End date must fall within the selected academic year.";
            }
            return "";
          },
        },
      ],
    };
  }, [academicYears]);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<HolidayFormData>({
    initialValues,
    validationConfig,
    dependentFieldPairs: HOLIDAY_DATE_FIELD_PAIR,
    onClearError: () => setError(null),
  });

  useEffect(() => {
    if (formData.audience_type !== "STUDENT" && formData.audience_type !== "ALL") {
      setFormData((prev) =>
        prev.class_ids.length === 0 && prev.division_ids.length === 0
          ? prev
          : { ...prev, class_ids: [], division_ids: [] }
      );
    }
  }, [formData.audience_type, setFormData]);

  useEffect(() => {
    if (isEditMode) return;
    if (academicYears.length === 0) return;
    setFormData((prev) => {
      const yearId =
        academicYearFromUrl != null && academicYears.some((y) => y.id === academicYearFromUrl)
          ? academicYearFromUrl
          : prev.academic_year_id ?? academicYears[0].id;
      const ay = academicYears.find((y) => y.id === yearId);
      let start = prev.start_date;
      let end = prev.end_date;
      if (startDateFromUrl && ay && isDateWithinAcademicYear(startDateFromUrl, ay.start_date, ay.end_date)) {
        start = startDateFromUrl;
        const endCandidate = endDateFromUrl ?? startDateFromUrl;
        end =
          endCandidate && isDateWithinAcademicYear(endCandidate, ay.start_date, ay.end_date)
            ? endCandidate
            : startDateFromUrl;
      }
      if (prev.academic_year_id === yearId && prev.start_date === start && prev.end_date === end) {
        return prev;
      }
      const next = { ...prev, academic_year_id: yearId, start_date: start, end_date: end };
      if (baselineSerialized.current === null) {
        baselineSerialized.current = serializeHolidayFormSnapshot(next);
      }
      return next;
    });
  }, [isEditMode, academicYears, academicYearFromUrl, startDateFromUrl, endDateFromUrl, setFormData]);

  useEffect(() => {
    if (academicYears.length === 0) return;
    const validIds = new Set(academicYears.map((y) => y.id));
    setFormData((prev) => {
      if (prev.academic_year_id == null) return prev;
      if (validIds.has(prev.academic_year_id)) return prev;
      const next = { ...prev, academic_year_id: academicYears[0].id };
      baselineSerialized.current = serializeHolidayFormSnapshot(next);
      return next;
    });
  }, [academicYears, setFormData]);

  useEffect(() => {
    if (!holidayQuery.data) return;
    const holiday = holidayQuery.data;
    const next: HolidayFormData = {
      academic_year_id: holiday.academic_year_id,
      holiday_name: holiday.holiday_name,
      holiday_type: normalizeHolidayTypeForForm(holiday.holiday_type),
      start_date: holiday.start_date,
      end_date: holiday.end_date ?? holiday.start_date,
      audience_type: (holiday.audience_type as NoticeAudienceType) || "STUDENT",
      class_ids: Array.isArray(holiday.class_ids) ? holiday.class_ids : [],
      division_ids: Array.isArray(holiday.division_ids) ? holiday.division_ids : [],
      description: holiday.description ?? "",
    };
    setFormData(next);
    setFieldErrors({});
    baselineSerialized.current = serializeHolidayFormSnapshot(next);
  }, [holidayQuery.data, setFormData, setFieldErrors]);

  const createMutation = useMutation({
    mutationFn: (payload: HolidayCreatePayload) => holidayApi.create(payload),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ["holidays"] });
      } catch {
        /* best-effort cache refresh */
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ editId, payload }: { editId: number; payload: HolidayUpdatePayload }) =>
      holidayApi.update(editId, payload),
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ["holidays"] });
      } catch {
        /* best-effort cache refresh */
      }
    },
  });

  const dismissAcademicYearsError = () => {
    void queryClient.resetQueries({ queryKey: ["holidays", "academic-years", "form"], exact: true });
  };

  const dismissHolidayDetailError = () => {
    if (holidayId == null) return;
    void queryClient.resetQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "holidays" &&
        q.queryKey[1] === "detail" &&
        q.queryKey[2] === holidayId,
    });
  };

  const classDivisionMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; divisions: { id: number; name: string }[] }>();
    classOptions.forEach((cls) => {
      map.set(Number(cls.id), { id: Number(cls.id), name: cls.label, divisions: [] });
    });
    divisionOptions.forEach((div) => {
      const classId = Number(div.classId);
      if (!map.has(classId)) return;
      map.get(classId)?.divisions.push({ id: Number(div.id), name: div.label.split(" - ")[1] || div.label });
    });
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [classOptions, divisionOptions]);

  const usesClassAudience = formData.audience_type === "STUDENT" || formData.audience_type === "ALL";

  const isApplicableSelectAll = useMemo(
    () =>
      usesClassAudience &&
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id))
      ),
    [classDivisionMap, formData.audience_type, formData.class_ids, formData.division_ids, usesClassAudience]
  );

  const isClassSelectAll = useMemo(
    () =>
      usesClassAudience &&
      classDivisionMap.length > 0 &&
      classDivisionMap.every(
        (cls) =>
          formData.class_ids.includes(cls.id) &&
          cls.divisions.every((d) => formData.division_ids.includes(d.id))
      ),
    [classDivisionMap, formData.audience_type, formData.class_ids, formData.division_ids, usesClassAudience]
  );

  const handleApplicableRoleToggle = useCallback(() => undefined, []);

  const handleApplicableSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setFormData((curr) => ({ ...curr, class_ids: [], division_ids: [] }));
        return;
      }
      const allClassIds = classDivisionMap.map((cls) => cls.id);
      const allDivisionIds = classDivisionMap.flatMap((cls) => cls.divisions.map((d) => d.id));
      setFormData((prev) => ({
        ...prev,
        class_ids: allClassIds,
        division_ids: allDivisionIds,
      }));
    },
    [classDivisionMap, setFormData]
  );

  const handleClassToggle = useCallback(
    (classId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds = classDivisionMap
          .find((cls) => cls.id === classId)
          ?.divisions.map((d) => d.id) ?? [];
        const nextClasses = checked
          ? Array.from(new Set([...prev.class_ids, classId]))
          : prev.class_ids.filter((id) => id !== classId);
        const nextDivisions = checked
          ? Array.from(new Set([...prev.division_ids, ...classDivisionIds]))
          : prev.division_ids.filter((divId) => !classDivisionIds.includes(divId));
        return {
          ...prev,
          class_ids: nextClasses,
          division_ids: nextDivisions,
        };
      });
    },
    [classDivisionMap, setFormData]
  );

  const handleDivisionToggle = useCallback(
    (classId: number, divisionId: number, checked: boolean) => {
      setFormData((prev) => {
        const classDivisionIds = classDivisionMap
          .find((cls) => cls.id === classId)
          ?.divisions.map((d) => d.id) ?? [];
        const nextDivisions = checked
          ? Array.from(new Set([...prev.division_ids, divisionId]))
          : prev.division_ids.filter((id) => id !== divisionId);
        const hasAnyDivisionForClass = classDivisionIds.some((id) => nextDivisions.includes(id));
        const nextClasses = hasAnyDivisionForClass
          ? Array.from(new Set([...prev.class_ids, classId]))
          : prev.class_ids.filter((id) => id !== classId);
        return {
          ...prev,
          class_ids: nextClasses,
          division_ids: nextDivisions,
        };
      });
    },
    [classDivisionMap, setFormData]
  );

  const handleClassSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setFormData((prev) => ({ ...prev, class_ids: [], division_ids: [] }));
        return;
      }
      const allClassIds = classDivisionMap.map((cls) => cls.id);
      const allDivisionIds = classDivisionMap.flatMap((cls) => cls.divisions.map((d) => d.id));
      setFormData((prev) => ({
        ...prev,
        class_ids: allClassIds,
        division_ids: allDivisionIds,
      }));
    },
    [classDivisionMap, setFormData]
  );

  const applicableTo = useMemo(
    () => ({
      student: formData.audience_type === "STUDENT" || formData.audience_type === "ALL",
      teacher: formData.audience_type === "TEACHER",
      admin: formData.audience_type === "ADMIN",
    }),
    [formData.audience_type]
  );

  const associatedClassesSlot = useMemo(
    () => (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Associated classes
        </Typography>
        {usesClassAudience ? (
          <ApplicableToClassSelector
            applicableTo={applicableTo}
            isApplicableSelectAll={isApplicableSelectAll}
            isClassSelectAll={isClassSelectAll}
            classDivisionMap={classDivisionMap}
            selectedClassIds={formData.class_ids}
            selectedDivisionIds={formData.division_ids}
            error={fieldErrors.class_ids ?? null}
            onApplicableSelectAll={handleApplicableSelectAll}
            onApplicableRoleToggle={handleApplicableRoleToggle}
            onClassSelectAll={handleClassSelectAll}
            onClassToggle={handleClassToggle}
            onDivisionToggle={handleDivisionToggle}
            hideApplicableRoleControls
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            This holiday is not scoped to classes (e.g. teachers or admin only).
          </Typography>
        )}
      </Box>
    ),
    [
      applicableTo,
      classDivisionMap,
      fieldErrors.class_ids,
      formData.audience_type,
      formData.class_ids,
      formData.division_ids,
      handleApplicableRoleToggle,
      handleApplicableSelectAll,
      handleClassSelectAll,
      handleClassToggle,
      handleDivisionToggle,
      isApplicableSelectAll,
      isClassSelectAll,
      usesClassAudience,
    ]
  );

  const handleConfirmSubmit = useCallback(async () => {
    setError(null);
    try {
      const payload = buildHolidayCreatePayload(formData);
      if (isEditMode && holidayId) {
        await updateMutation.mutateAsync({ editId: holidayId, payload });
        enqueueSnackbar("Holiday updated successfully", {
          variant: "success",
          autoHideDuration: 3000,
          anchorOrigin: { vertical: "top", horizontal: "center" },
        });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar("Holiday created successfully", {
          variant: "success",
          autoHideDuration: 3000,
          anchorOrigin: { vertical: "top", horizontal: "center" },
        });
      }
      setTimeout(() => {
        navigate("/academics/configuration/holidays");
      }, 1000);
    } catch (err: unknown) {
      console.error("Holiday save error:", err);
      const { fieldErrors: apiFieldErrors, message } = mapApiErrorsToFields(err);
      setFieldErrors((p) => ({ ...p, ...apiFieldErrors }));
      setError(message || (isEditMode ? "Failed to update holiday." : "Failed to create holiday."));
    }
  }, [formData, isEditMode, holidayId, createMutation, updateMutation, setFieldErrors, navigate, enqueueSnackbar]);

  const goToList = useCallback(() => {
    navigate("/academics/configuration/holidays");
  }, [navigate]);

  const isDirty = useMemo(() => {
    if (baselineSerialized.current === null) return false;
    return serializeHolidayFormSnapshot(formData) !== baselineSerialized.current;
  }, [formData]);

  const requestCancel = useCallback(() => {
    if (isDirty) {
      setCancelConfirmOpen(true);
      return;
    }
    goToList();
  }, [isDirty, goToList]);

  const confirmDiscardAndLeave = useCallback(() => {
    setCancelConfirmOpen(false);
    goToList();
  }, [goToList]);

  const loading = createMutation.isPending || updateMutation.isPending;
  const fetchLoading = academicYearsQuery.isLoading || (isEditMode && holidayQuery.isLoading && !holidayQuery.isError);
  const pageTitle = useMemo(() => (isEditMode ? "Edit Holiday" : "Add Holiday"), [isEditMode]);

  const formConfig = useMemo(
    () =>
      createHolidayFormConfig({
        academicYears,
        yearsLoading: academicYearsQuery.isLoading,
        associatedClassesSlot,
      }),
    [academicYears, academicYearsQuery.isLoading, associatedClassesSlot]
  );

  const canSubmit =
    academicYears.length > 0 &&
    !academicYearsQuery.isError &&
    (!isEditMode || (holidayQuery.isSuccess && holidayQuery.data != null));

  const formTopSlot =
    academicYearsQuery.isError || holidayQuery.isError ? (
      <Stack spacing={2}>
        {academicYearsQuery.isError && (
          <Alert
            severity="error"
            action={
              <>
                <MuiButton size="small" aria-label="Retry loading academic years" onClick={() => void academicYearsQuery.refetch()}>
                  Retry
                </MuiButton>
                <MuiButton size="small" aria-label="Dismiss academic years error" onClick={dismissAcademicYearsError}>
                  Dismiss
                </MuiButton>
              </>
            }
          >
            <AlertTitle>Failed to load academic years</AlertTitle>
            You need academic years to choose a year for this holiday.
          </Alert>
        )}
        {holidayQuery.isError && (
          <Alert
            severity="error"
            action={
              <>
                <MuiButton size="small" aria-label="Retry loading holiday" onClick={() => void holidayQuery.refetch()}>
                  Retry
                </MuiButton>
                <MuiButton size="small" aria-label="Dismiss holiday load error" onClick={dismissHolidayDetailError}>
                  Dismiss
                </MuiButton>
              </>
            }
          >
            <AlertTitle>Failed to load holiday details</AlertTitle>
            Check your connection or try again.
          </Alert>
        )}
      </Stack>
    ) : null;

  return {
    isEditMode,
    holidayId,
    formConfig,
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    handleConfirmSubmit,
    loading,
    fetchLoading,
    error,
    setError,
    formTopSlot,
    canSubmit,
    pageTitle,
    requestCancel,
    cancelConfirmOpen,
    setCancelConfirmOpen,
    confirmDiscardAndLeave,
  };
}
