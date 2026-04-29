import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";

import BaseForm from "../../components/reusable/BaseForm";
import { EntityTableSection } from "../../components/reusable";
import type { SelectItemOption } from "../../components/semantic";
import { useFormManager } from "../../hooks/useFormManager";
import type { ApiError } from "../../api/client";
import invoiceApi from "../../api/invoiceApi";
import {
  generateInvoiceFormConfig,
  type GenerateInvoiceFormData,
} from "../../formConfig/generateInvoiceFormConfig";
import type { FormValidationConfig } from "../../utils/formValidation";
import { colorTokens } from "../../tokens/colors";

const defaultFormData = (): GenerateInvoiceFormData => ({
  academic_year_id: null,
  class_id: null,
  division_id: null,
  installment_name: "",
  payable_amount: null,
  invoice_date: "",
  due_date: "",
});

export default function GenerateInvoice() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsPage, setStudentsPage] = useState(0);
  const [studentsRowsPerPage, setStudentsRowsPerPage] = useState(10);

  const validationConfig = useMemo<FormValidationConfig<GenerateInvoiceFormData>>(
    () => ({
      academic_year_id: [{ type: "required", message: "Academic Year is required" }],
      class_id: [{ type: "required", message: "Please select a class to continue" }],
      division_id: [{ type: "required", message: "Please select a division" }],
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
      formData.installment_name,
    ],
    queryFn: () =>
      invoiceApi.getStudents({
        class_id: formData.class_id as number,
        division_id: formData.division_id as number,
        academic_year_id: formData.academic_year_id as number,
        installment_name: formData.installment_name || undefined,
      }),
    enabled: filtersReady,
  });

  const { data: installmentNameOptions = [], isLoading: installmentsLoading } = useQuery({
    queryKey: [
      "generate-invoice",
      "installments",
      formData.class_id,
      formData.division_id,
      formData.academic_year_id,
    ],
    queryFn: () =>
      invoiceApi.getInstallmentOptions({
        class_id: formData.class_id as number,
        division_id: formData.division_id as number,
        academic_year_id: formData.academic_year_id as number,
      }),
    enabled: filtersReady,
  });



  const generateMutation = useMutation({
    mutationFn: invoiceApi.generateInvoices,
  });

  useEffect(() => {
    setFormData((prev) => {
      if (prev.class_id === null && prev.division_id === null) return prev;
      return {
        ...prev,
        class_id: null,
        division_id: null,
      };
    });
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.academic_year_id, setFormData]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.division_id === null) return prev;
      return {
        ...prev,
        division_id: null,
      };
    });
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.class_id, setFormData]);

  useEffect(() => {
    setSelectedStudentIds([]);
    setStudentsPage(0);
  }, [formData.division_id]);

  useEffect(() => {
    if (!formData.installment_name) return;
    const isValid = installmentNameOptions.some(
      (option) => option.value === formData.installment_name
    );
    if (!isValid) {
      setFormData((prev) => ({ ...prev, installment_name: "" }));
    }
  }, [formData.installment_name, installmentNameOptions, setFormData]);

  useEffect(() => {
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
  }, [formData.installment_name, installmentNameOptions, setFormData]);

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



  const selectableStudents = useMemo(
    () => students.filter((student) => !student.is_invoice_generated),
    [students]
  );

  const isAllSelected =
    selectableStudents.length > 0 &&
    selectableStudents.every((student) => selectedStudentIds.includes(student.id));

  const handleToggleStudent = useCallback((studentId: number, checked: boolean) => {
    setSelectedStudentIds((prev) => {
      if (checked) return Array.from(new Set([...prev, studentId]));
      return prev.filter((id) => id !== studentId);
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (!checked) {
      setSelectedStudentIds([]);
      return;
    }
    setSelectedStudentIds(selectableStudents.map((student) => student.id));
  }, [selectableStudents]);

  const handleConfirmSubmit = async () => {
    if (!filtersReady) {
      setError("Please select filters before generating invoices");
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
        renderHeader: () => (
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
    [selectedStudentIds, handleToggleStudent, isAllSelected, handleSelectAll]
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

  const installmentOptions = useMemo<SelectItemOption[]>(
    () =>
      installmentNameOptions.map((option) => ({
        id: option.value,
        value: option.value,
        label: option.label,
      })),
    [installmentNameOptions]
  );



  const formConfig = useMemo(
    () =>
      generateInvoiceFormConfig({
        academicYearOptions,
        classOptions,
        divisionOptions,
        installmentOptions,
        academicYearsLoading,
        classesLoading,
        divisionsLoading,
        disableClass: !formData.academic_year_id || classesLoading,
        disableDivision: !formData.class_id || divisionsLoading,
        disableInstallment: !filtersReady || installmentsLoading || installmentOptions.length === 0,
        disablePayableAmount: true,
        disableDates: false,
        studentSelectionSlot: studentsSection,
      }),
    [
      academicYearOptions,
      classOptions,
      divisionOptions,
      academicYearsLoading,
      classesLoading,
      divisionsLoading,
      installmentsLoading,
      formData.academic_year_id,
      formData.class_id,
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
      isEditMode={false}
      loading={generateMutation.isPending}
      fetchLoading={academicYearsLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: [
          { title: "Invoice List", path: "/fees/invoices" },
          { title: "Generate Invoice", path: "#" },
        ],
        homePath: "/",
        cancelTooltip: "Reset",
        saveTooltipCreate: "Save",
      }}
      onCancelNavigate={() => {
        resetForm(defaultFormData());
        setSelectedStudentIds([]);
        setStudentsPage(0);
        setError(null);
        setSnackbar(null);
      }}
      confirmMessage="Are you sure you want to generate invoices?"
      submitLabelCreate="Save"
      footerActionOrder="cancel-first"
      canSubmit={true}
    />
  );
}
