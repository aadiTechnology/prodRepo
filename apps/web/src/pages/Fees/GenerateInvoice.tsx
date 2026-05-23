import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSnackbar } from "notistack";

import BaseForm from "../../components/reusable/BaseForm";
import { EntityTableSection } from "../../components/reusable";
import type { SelectItemOption } from "../../components/semantic";
import { useFormManager } from "../../hooks/useFormManager";
import type { ApiError } from "../../api/client";
import invoiceApi from "../../api/invoiceApi";
import invoiceService from "../../api/services/invoiceService";
import studentService from "../../api/services/studentService";
import {
  generateInvoiceFormConfig,
  type GenerateInvoiceFormData,
} from "../../formConfig/generateInvoiceFormConfig";
import type { FormValidationConfig } from "../../utils/formValidation";
import { colorTokens } from "../../tokens/colors";

const toDateInputValue = (raw: unknown): string => {
  if (!raw) return "";
  const text = String(raw).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
};

const resolveCurrentAcademicYearId = (
  years: { id: number; is_current?: boolean | number }[]
): number | null => {
  const current =
    years.find((y) => y.is_current === true || y.is_current === 1) ?? years[0];
  return current?.id ?? null;
};

const defaultFormData = (): GenerateInvoiceFormData => ({
  academic_year_id: null,
  class_id: null,
  division_id: null,
  fee_structure_id: null,
  installment_name: "",
  payable_amount: null,
  invoice_date: "",
  due_date: "",
  invoice_no: "",
});

export default function GenerateInvoice() {
  const navigate = useNavigate();
  const { invoiceId: routeInvoiceId } = useParams<{ invoiceId?: string }>();
  const numericInvoiceId = Number(routeInvoiceId);
  const isEditMode =
    Boolean(routeInvoiceId) && Number.isFinite(numericInvoiceId) && numericInvoiceId > 0;

  const { enqueueSnackbar } = useSnackbar();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [editHydrated, setEditHydrated] = useState(!isEditMode);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editInvoiceStudentId, setEditInvoiceStudentId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsPage, setStudentsPage] = useState(0);
  const [studentsRowsPerPage, setStudentsRowsPerPage] = useState(10);
  const prevAcademicYearRef = useRef<number | null | undefined>(undefined);
  const prevClassIdRef = useRef<number | null | undefined>(undefined);
  const prevDivisionIdRef = useRef<number | null | undefined>(undefined);

  const validationConfig = useMemo<FormValidationConfig<GenerateInvoiceFormData>>(
    () => ({
      academic_year_id: [{ type: "required", message: "Academic Year is required" }],
      class_id: [{ type: "required", message: "Please select a class to continue" }],
      division_id: [{ type: "required", message: "Please select a division" }],
      fee_structure_id: [{ type: "required", message: "Please select a fee structure" }],
      installment_name: [{ type: "required", message: "Installment is required" }],
      payable_amount: [],
      invoice_date: [{ type: "required", message: "Invoice date is required" }],
      due_date: [
        { type: "required", message: "Due date is required" },
        {
          type: "custom",
          validate: (values) => {
            if (!values.invoice_date || !values.due_date) return "";
            if (values.due_date <= values.invoice_date) {
              return "Due date must be after invoice date";
            }
            return "";
          },
        },
      ],
      ...(isEditMode
        ? {
            payable_amount: [
              {
                type: "custom" as const,
                validate: (values) => {
                  const total = Number(values.payable_amount);
                  if (!Number.isFinite(total) || total < 0) {
                    return "Enter a valid invoice amount";
                  }
                  if (total < editPaidAmount) {
                    return `Amount cannot be less than paid amount (₹${editPaidAmount.toLocaleString()})`;
                  }
                  return "";
                },
              },
            ],
          }
        : {}),
    }),
    [isEditMode, editPaidAmount]
  );

  const {
    formData,
    setFormData,
    fieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    resetForm,
  } = useFormManager<GenerateInvoiceFormData>({
    initialValues: defaultFormData(),
    validationConfig,
    dependentFieldPairs: [["invoice_date", "due_date"]],
    onClearError: () => setError(null),
  });

  const { data: academicYears = [], isLoading: academicYearsLoading } = useQuery({
    queryKey: ["generate-invoice", "academic-years"],
    queryFn: invoiceApi.getAcademicYears,
  });

  useEffect(() => {
    if (isEditMode) return;
    if (academicYearsLoading || academicYears.length === 0) return;
    if (formData.academic_year_id != null) return;

    const currentId = resolveCurrentAcademicYearId(academicYears);
    if (currentId == null) return;

    prevAcademicYearRef.current = currentId;
    handleFieldValueChange("academic_year_id", currentId);
  }, [
    isEditMode,
    academicYears,
    academicYearsLoading,
    formData.academic_year_id,
    handleFieldValueChange,
  ]);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["generate-invoice", "classes", formData.academic_year_id],
    queryFn: () => invoiceApi.getClasses(formData.academic_year_id as number),
    enabled: !!formData.academic_year_id,
  });

  const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
    queryKey: ["generate-invoice", "divisions", formData.class_id],
    queryFn: () => invoiceApi.getDivisions(formData.class_id as number),
    enabled: !!formData.class_id,
  });

  const filtersReady = !!formData.academic_year_id && !!formData.class_id && !!formData.division_id;

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: [
      "generate-invoice",
      "students",
      formData.class_id,
      formData.division_id,
      formData.academic_year_id,
      formData.fee_structure_id,
      formData.installment_name,
    ],
    queryFn: () =>
      invoiceApi.getStudents({
        class_id: formData.class_id as number,
        division_id: formData.division_id as number,
        academic_year_id: formData.academic_year_id as number,
        fee_structure_id: formData.fee_structure_id || undefined,
        installment_name: formData.installment_name || undefined,
      }),
    enabled: filtersReady,
  });

  const { data: feeStructures = [], isLoading: feeStructuresLoading } = useQuery({
    queryKey: [
      "generate-invoice",
      "fee-structures",
      formData.class_id,
      formData.division_id,
      formData.academic_year_id,
    ],
    queryFn: () =>
      invoiceApi.getFeeStructureOptions({
        class_id: formData.class_id as number,
        division_id: formData.division_id as number,
        academic_year_id: formData.academic_year_id as number,
      }),
    enabled: filtersReady,
  });

  const { data: installmentNameOptions = [], isLoading: installmentsLoading } = useQuery({
    queryKey: [
      "generate-invoice",
      "installments",
      formData.fee_structure_id,
    ],
    queryFn: () =>
      invoiceApi.getInstallmentOptionsByFeeStructureId(formData.fee_structure_id as number),
    enabled: !!formData.fee_structure_id,
  });



  const generateMutation = useMutation({
    mutationFn: invoiceApi.generateInvoices,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof invoiceService.updateInvoice>[1]) =>
      invoiceService.updateInvoice(numericInvoiceId, payload),
  });

  useEffect(() => {
    if (!isEditMode) return;
    let mounted = true;
    const loadInvoice = async () => {
      try {
        setFetchLoading(true);
        setError(null);
        const detail = await invoiceService.getInvoiceDetailById(numericInvoiceId);
        if (!mounted) return;
        const inv = detail.invoice;
        const paid = Number(inv.paid_amount || 0);
        let divisionId = detail.student_info.division_id ?? null;
        if (!divisionId && inv.student_id) {
          try {
            const student = await studentService.getStudentById(String(inv.student_id));
            divisionId = student.class_division_id ?? null;
          } catch {
            // Division remains optional for display; user can re-select if missing.
          }
        }
        setEditPaidAmount(paid);
        setEditInvoiceStudentId(inv.student_id);
        setSelectedStudentIds([inv.student_id]);
        setFormData({
          academic_year_id: inv.academic_year_id,
          class_id: inv.class_id,
          division_id: divisionId,
          fee_structure_id: inv.fee_structure_id,
          installment_name: inv.installment ?? inv.installment_name ?? "",
          payable_amount: Number(inv.total_amount || 0),
          invoice_date: toDateInputValue(inv.created_at),
          due_date: toDateInputValue(inv.due_date),
          invoice_no: inv.invoice_no ?? "",
        });
        setEditHydrated(true);
        prevAcademicYearRef.current = inv.academic_year_id;
        prevClassIdRef.current = inv.class_id;
        prevDivisionIdRef.current = divisionId;
      } catch (err: unknown) {
        if (!mounted) return;
        const apiError = err as ApiError;
        setError(
          (apiError?.response?.data?.detail as string | undefined) ||
            (apiError?.response?.data?.message as string | undefined) ||
            "Unable to load invoice for editing"
        );
      } finally {
        if (mounted) setFetchLoading(false);
      }
    };
    void loadInvoice();
    return () => {
      mounted = false;
    };
  }, [isEditMode, numericInvoiceId, setFormData]);

  useEffect(() => {
    if (!isEditMode || !editHydrated || !editInvoiceStudentId) return;
    if (students.length === 0) return;
    setSelectedStudentIds((prev) =>
      prev.length === 1 && prev[0] === editInvoiceStudentId ? prev : [editInvoiceStudentId]
    );
  }, [isEditMode, editHydrated, editInvoiceStudentId, students]);

  useEffect(() => {
    if (isEditMode && !editHydrated) return;
    const yearId = formData.academic_year_id;
    if (prevAcademicYearRef.current === undefined) {
      prevAcademicYearRef.current = yearId;
      return;
    }
    if (prevAcademicYearRef.current === yearId) return;
    prevAcademicYearRef.current = yearId;
    prevClassIdRef.current = null;
    prevDivisionIdRef.current = null;
    setFormData((prev) => ({
      ...prev,
      class_id: null,
      division_id: null,
      fee_structure_id: null,
      installment_name: "",
      payable_amount: null,
    }));
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.academic_year_id, setFormData, isEditMode, editHydrated]);

  useEffect(() => {
    if (isEditMode && !editHydrated) return;
    const classId = formData.class_id;
    if (prevClassIdRef.current === undefined) {
      prevClassIdRef.current = classId;
      return;
    }
    if (prevClassIdRef.current === classId) return;
    prevClassIdRef.current = classId;
    prevDivisionIdRef.current = null;
    setFormData((prev) => ({
      ...prev,
      division_id: null,
      fee_structure_id: null,
      installment_name: "",
      payable_amount: null,
    }));
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.class_id, setFormData, isEditMode, editHydrated]);

  useEffect(() => {
    if (isEditMode && !editHydrated) return;
    const divisionId = formData.division_id;
    if (prevDivisionIdRef.current === undefined) {
      prevDivisionIdRef.current = divisionId;
      return;
    }
    if (prevDivisionIdRef.current === divisionId) return;
    prevDivisionIdRef.current = divisionId;
    setFormData((prev) => ({
      ...prev,
      fee_structure_id: null,
      installment_name: "",
      payable_amount: null,
    }));
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.division_id, setFormData, isEditMode, editHydrated]);

  useEffect(() => {
    if (!formData.fee_structure_id) return;
    if (isEditMode && (feeStructuresLoading || feeStructures.length === 0)) return;
    const isValid = feeStructures.some((item) => item.id === formData.fee_structure_id);
    if (!isValid) {
      setFormData((prev) => ({
        ...prev,
        fee_structure_id: null,
        installment_name: "",
        payable_amount: null,
      }));
    }
  }, [formData.fee_structure_id, feeStructures, feeStructuresLoading, setFormData, isEditMode]);

  useEffect(() => {
    if (!formData.installment_name) return;
    if (isEditMode && (installmentsLoading || installmentNameOptions.length === 0)) return;
    const isValid = installmentNameOptions.some(
      (option) => option.value === formData.installment_name
    );
    if (!isValid) {
      setFormData((prev) => ({ ...prev, installment_name: "" }));
    }
  }, [
    formData.installment_name,
    installmentNameOptions,
    installmentsLoading,
    setFormData,
    isEditMode,
  ]);

  useEffect(() => {
    if (isEditMode) return;
    if (!formData.installment_name) return;
    const selectedInstallment = installmentNameOptions.find(
      (option) => option.value === formData.installment_name
    );
    if (!selectedInstallment) return;
    setFormData((prev) => {
      const updates: Partial<GenerateInvoiceFormData> = {};
      if (selectedInstallment.due_date && prev.due_date !== selectedInstallment.due_date) {
        updates.due_date = selectedInstallment.due_date;
      }
      if (selectedInstallment.amount !== undefined && prev.payable_amount !== selectedInstallment.amount) {
        updates.payable_amount = selectedInstallment.amount;
      }
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [formData.installment_name, installmentNameOptions, setFormData, isEditMode]);

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
        label: item.name,
      })),
    [classes]
  );

  const divisionOptions = useMemo<SelectItemOption[]>(
    () =>
      divisions.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label: item.division_name,
      })),
    [divisions]
  );

  const feeStructureOptions = useMemo<SelectItemOption[]>(
    () =>
      feeStructures.map((item) => ({
        id: String(item.id),
        value: String(item.id),
        label:
          item.class_division_id === formData.division_id
            ? item.name
            : `${item.name} (All Divisions)`,
      })),
    [feeStructures, formData.division_id]
  );



  const selectableStudents = useMemo(
    () => students.filter((student) => !student.is_invoice_generated),
    [students]
  );

  const isAllSelected =
    selectableStudents.length > 0 &&
    selectableStudents.every((student) => selectedStudentIds.includes(student.id));

  const handleToggleStudent = useCallback((studentId: number, checked: boolean) => {
    if (isEditMode) {
      setSelectedStudentIds(checked ? [studentId] : []);
      return;
    }
    setSelectedStudentIds((prev) => {
      if (checked) return Array.from(new Set([...prev, studentId]));
      return prev.filter((id) => id !== studentId);
    });
  }, [isEditMode]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(selectableStudents.map((student) => student.id));
  }, [selectableStudents]);

  const handleConfirmSubmit = async () => {
    if (!filtersReady) {
      setError(isEditMode ? "Please complete all required fields" : "Please select filters before generating invoices");
      return;
    }

    if (isEditMode) {
      if (!selectedStudentIds.length) {
        setError("Please select a student");
        return;
      }
      const totalAmount = Number(formData.payable_amount ?? 0);
      if (!Number.isFinite(totalAmount) || totalAmount < editPaidAmount) {
        setError(`Total amount must be at least ₹${editPaidAmount.toLocaleString()} (already paid)`);
        return;
      }
      setError(null);
      try {
        await updateMutation.mutateAsync({
          student_id: selectedStudentIds[0],
          academic_year_id: formData.academic_year_id as number,
          class_id: formData.class_id as number,
          fee_structure_id: formData.fee_structure_id as number,
          installment: formData.installment_name,
          invoice_no: formData.invoice_no.trim(),
          total_amount: totalAmount,
          paid_amount: editPaidAmount,
          due_amount: totalAmount - editPaidAmount,
          due_date: formData.due_date,
        });
        setSnackbar("Invoice updated successfully");
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = setTimeout(() => navigate("/fees/invoices"), 1000);
      } catch (err) {
        const apiError = err as ApiError;
        const errorMessage =
          (apiError?.response?.data?.detail as string | undefined) ||
          (apiError?.response?.data?.message as string | undefined) ||
          "Failed to update invoice";
        setError(errorMessage);
        enqueueSnackbar(errorMessage, { variant: "error" });
      }
      return;
    }

    if (!selectedStudentIds.length) {
      setError("Please select at least one student");
      return;
    }
    setError(null);
    try {
      const response = await generateMutation.mutateAsync({
        academic_year_id: formData.academic_year_id as number,
        class_id: formData.class_id as number,
        division_id: formData.division_id as number,
        fee_structure_id: formData.fee_structure_id as number,
        installment_name: formData.installment_name,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        student_ids: selectedStudentIds,
      });

      setSnackbar("Invoices generated successfully");
      if ((response.skipped_count || 0) > 0) {
        enqueueSnackbar("Invoices for some students already exist", { variant: "warning" });
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = setTimeout(() => navigate("/fees/invoices"), 1000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        (apiError?.response?.data?.detail as string | undefined) ||
        (apiError?.response?.data?.message as string | undefined) ||
        "Failed to generate invoices";
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: "error" });
    }
  };

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const paginatedStudents = useMemo(
    () =>
      students.slice(
        studentsPage * studentsRowsPerPage,
        studentsPage * studentsRowsPerPage + studentsRowsPerPage
      ),
    [students, studentsPage, studentsRowsPerPage]
  );

  const studentColumns = useMemo(
    () => [
      {
        id: "select",
        label: "Select",
        renderHeader: () =>
          isEditMode ? (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Select
            </Typography>
          ) : (
            <Checkbox
              checked={isAllSelected}
              indeterminate={!isAllSelected && selectedStudentIds.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              inputProps={{ "aria-label": "Select all students" }}
            />
          ),
        width: 90,
        render: (student: (typeof students)[number]) => (
          <Checkbox
            checked={selectedStudentIds.includes(student.id)}
            onChange={(e) => handleToggleStudent(student.id, e.target.checked)}
            disabled={student.is_invoice_generated}
          />
        ),
      },
      {
        id: "name",
        label: "Name",
        render: (student: (typeof students)[number]) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{student.student_name}</Typography>
            {student.is_invoice_generated ? (
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "#8a6d3b",
                  bgcolor: "#fff3cd",
                  px: 1,
                  borderRadius: "8px",
                }}
              >
                Already Generated
              </Typography>
            ) : null}
          </Box>
        ),
      },
      {
        id: "roll_no",
        label: "Roll Number",
        width: 160,
        render: (student: (typeof students)[number]) => student.roll_no || "-",
      },
    ],
    [selectedStudentIds, handleToggleStudent, isAllSelected, handleSelectAll, isEditMode]
  );

  const studentsSection = useMemo(() => (
    <Box sx={{ px: 1, mt: 1 }}>
      {!filtersReady ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderColor: colorTokens.border.subtle,
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700, color: colorTokens.text.primary }}>
            No students found
          </Typography>
          <Typography sx={{ color: colorTokens.text.secondary, mt: 0.5 }}>
            Please select a class and division above
          </Typography>
        </Paper>
      ) : studentsLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : students.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            borderColor: colorTokens.border.subtle,
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700, color: colorTokens.text.primary }}>
            No students found
          </Typography>
          <Typography sx={{ color: colorTokens.text.secondary, mt: 0.5 }}>
            Please select a class and division above
          </Typography>
        </Paper>
      ) : (
        <EntityTableSection
          label="Student Selection"
          totalRows={students.length}
          page={studentsPage}
          rowsPerPage={studentsRowsPerPage}
          onPageChange={setStudentsPage}
          onRowsPerPageChange={(rows) => {
            setStudentsRowsPerPage(rows);
            setStudentsPage(0);
          }}
          columns={studentColumns}
          data={paginatedStudents}
          loading={false}
          emptyMessage="No students found"
          getRowKey={(row) => row.id}
          showInfoBar={false}
          showPagination={students.length > 0}
        />
      )}
    </Box>
  ), [
    filtersReady,
    studentsLoading,
    students,
    isAllSelected,
    selectedStudentIds.length,
    studentsPage,
    studentsRowsPerPage,
    studentColumns,
    paginatedStudents,
  ]);

  const installmentOptions = useMemo<SelectItemOption[]>(() => {
    const options = installmentNameOptions.map((option) => ({
      id: option.value,
      value: option.value,
      label: option.label,
    }));
    const current = formData.installment_name?.trim();
    if (
      isEditMode &&
      current &&
      !options.some((option) => option.value === current)
    ) {
      options.unshift({ id: current, value: current, label: current });
    }
    return options;
  }, [installmentNameOptions, isEditMode, formData.installment_name]);

  const feeStructureSelectOptions = useMemo<SelectItemOption[]>(() => {
    const options = feeStructureOptions;
    const currentId = formData.fee_structure_id;
    if (
      isEditMode &&
      currentId &&
      !options.some((option) => Number(option.value) === currentId)
    ) {
      return [
        {
          id: String(currentId),
          value: String(currentId),
          label: `Fee Structure #${currentId}`,
        },
        ...options,
      ];
    }
    return options;
  }, [feeStructureOptions, isEditMode, formData.fee_structure_id]);



  const formConfig = useMemo(
    () =>
      generateInvoiceFormConfig({
        academicYearOptions,
        classOptions,
        divisionOptions,
        feeStructureOptions: feeStructureSelectOptions,
        installmentOptions,
        academicYearsLoading,
        classesLoading,
        divisionsLoading,
        feeStructuresLoading,
        disableClass: !formData.academic_year_id || classesLoading,
        disableDivision: !formData.class_id || divisionsLoading,
        disableFeeStructure:
          !filtersReady || feeStructuresLoading || feeStructureSelectOptions.length === 0,
        disableInstallment:
          !formData.fee_structure_id || installmentsLoading || installmentOptions.length === 0,
        disablePayableAmount: true,
        disableDates: false,
        studentSelectionSlot: studentsSection,
      }),
    [
      academicYearOptions,
      classOptions,
      divisionOptions,
      feeStructureOptions,
      feeStructureSelectOptions,
      academicYearsLoading,
      classesLoading,
      divisionsLoading,
      feeStructuresLoading,
      installmentsLoading,
      formData.academic_year_id,
      formData.class_id,
      formData.fee_structure_id,
      filtersReady,
      installmentOptions,
      studentsSection,
    ]
  );

  return (
    <BaseForm<GenerateInvoiceFormData>
      formConfig={formConfig}
      formData={formData}
      setFormData={setFormData}
      fieldErrors={fieldErrors}
      handleChange={handleChange}
      handleFieldValueChange={handleFieldValueChange}
      handleSubmit={handleSubmit}
      setFormError={setError}
      onConfirmSubmit={handleConfirmSubmit}
      isEditMode={isEditMode}
      loading={isEditMode ? updateMutation.isPending : generateMutation.isPending}
      fetchLoading={fetchLoading || academicYearsLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Invoice List", path: "/fees/invoices" },
          { title: isEditMode ? "Edit Invoice" : "Generate Invoice", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: isEditMode ? "Cancel" : "Reset",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Update",
      }}
      onCancelNavigate={() => {
        if (isEditMode) {
          navigate(`/fees/invoices/${numericInvoiceId}/detail`);
          return;
        }
        resetForm(defaultFormData());
        setSelectedStudentIds([]);
        setStudentsPage(0);
        setError(null);
        setSnackbar(null);
      }}
      confirmMessage={
        isEditMode
          ? "Are you sure you want to update this invoice?"
          : "Are you sure you want to generate invoices?"
      }
      submitLabelCreate="Save"
      submitLabelEdit="Save"
      footerActionOrder="cancel-first"
      canSubmit={true}
      gridSpacing={3}
    />
  );
}
