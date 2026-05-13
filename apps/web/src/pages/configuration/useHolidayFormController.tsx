import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertTitle, Button as MuiButton, Stack } from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";

import { academicYearService } from "../../api/services/academicYearService";
import holidayApi, { type HolidayCreatePayload, type HolidayUpdatePayload } from "../../services/holidayApi";
import { useFormManager, type DependentFieldPair } from "../../hooks/useFormManager";
import {
  mapApiErrorsToFields,
  type FormValidationConfig,
} from "../../utils/formValidation";
import {
  buildHolidayCreatePayload,
  compareIsoDateStrings,
  EMPTY_FORM,
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

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [error, setError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const baselineSerialized = useRef<string | null>(null);

  const academicYearsQuery = useQuery({
    queryKey: ["holidays", "academic-years", "form"],
    queryFn: academicYearService.getAll,
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

  const initialValues = useMemo(
    () => ({ ...EMPTY_FORM }),
    []
  );

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
      holiday_type: [{ type: "required", message: "Holiday type is required." }],
      start_date: [
        { type: "required", message: "Start date is required." },
        {
          type: "pattern",
          regex: /^\d{4}-\d{2}-\d{2}$/,
          message: "Use a valid calendar date (YYYY-MM-DD).",
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
    if (isEditMode) return;
    if (academicYears.length === 0) return;
    setFormData((prev) => {
      if (prev.academic_year_id != null) return prev;
      const next = { ...prev, academic_year_id: academicYears[0].id };
      if (baselineSerialized.current === null) {
        baselineSerialized.current = serializeHolidayFormSnapshot(next);
      }
      return next;
    });
  }, [isEditMode, academicYears, setFormData]);

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
      holiday_type: holiday.holiday_type,
      start_date: holiday.start_date,
      end_date: holiday.end_date ?? holiday.start_date,
      applicable_for: holiday.applicable_for,
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

  const handleConfirmSubmit = useCallback(async () => {
    setError(null);
    try {
      const payload = buildHolidayCreatePayload(formData);
      if (isEditMode && holidayId) {
        await updateMutation.mutateAsync({ editId: holidayId, payload });
        enqueueSnackbar("Holiday updated successfully", { variant: "success" });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar("Holiday created successfully", { variant: "success" });
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
      }),
    [academicYears, academicYearsQuery.isLoading]
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
