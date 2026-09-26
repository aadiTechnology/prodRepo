import { useState, useEffect, useCallback, useMemo } from "react";
import { Autocomplete, TextField } from "../components/primitives";
import { useParams, useLocation } from "react-router-dom";
import feeDiscountService from "../api/services/feeDiscountService";
import academicYearService from "../api/services/academicYearService";
import schoolClassService from "../api/services/schoolClassService";
import { resolveCurrentAcademicYearId } from "../utils/academicYear";
import { useFormManager } from "../hooks/useFormManager";
import { useConfigHubNavigation } from "../hooks/useConfigHubNavigation";
import BaseForm from "../components/reusable/BaseForm";
import { createAddFeeDiscountFormConfig, type AddFeeDiscountFormData } from "./AddFeeDiscount.formConfig";

const emptyForm = (): AddFeeDiscountFormData => ({
  academic_year_id: "",
  discountName: "",
  discountType: "PERCENTAGE",
  discountAmount: "",
  feeCategory: "",
  applicableClass: "",
  description: "",
  is_active: true,
});

export default function AddFeeDiscount() {
  const location = useLocation();
  const academicYearFromList = (
    location.state as { academic_year_id?: string } | null
  )?.academic_year_id;
  const { buildFormBreadcrumbs, navigateWithConfigHub } = useConfigHubNavigation();
  const listPath = "/fees/discounts";
  const { id: routeDiscountId } = useParams<{ id?: string }>();
  const discountId = routeDiscountId ?? null;
  const isEditMode = Boolean(discountId);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [allCategories, setAllCategories] = useState<
    {
      name: string;
      academic_year_id?: number | null;
      class_id?: number | null;
      class_name?: string | null;
    }[]
  >([]);
  const [allClasses, setAllClasses] = useState<
    { id: number; name: string; academic_year_id?: number | null }[]
  >([]);
  const [discountNameOptions, setDiscountNameOptions] = useState<string[]>([]);
  const [discountNamesLoading, setDiscountNamesLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { feeCategoryService } = await import("../api/services/classFeeCategoryService");
      const [years, cats, classes] = await Promise.all([
        academicYearService.listActive(),
        feeCategoryService.list(),
        schoolClassService.getAll(),
      ]);
      setAcademicYears(years.map((y) => ({ id: y.id, name: y.name })));
      setAllCategories(
        (cats || []).map(
          (cat: {
            name: string;
            academic_year_id?: number | null;
            class_id?: number | null;
            class_name?: string | null;
          }) => ({
            name: cat.name,
            academic_year_id: cat.academic_year_id,
            class_id: cat.class_id,
            class_name: cat.class_name,
          })
        )
      );
      setAllClasses(
        (classes || []).map(
          (cls: { id: number; name: string; academic_year_id?: number | null }) => ({
            id: cls.id,
            name: cls.name,
            academic_year_id: cls.academic_year_id,
          })
        )
      );
    };
    void load();
  }, [isEditMode]);

  const initialValues = useMemo(() => emptyForm(), []);

  const validationConfig = useMemo(() => ({
    academic_year_id: [
      { type: "required" as const, message: "Academic Year is required." },
    ],
    discountName: [
      { type: "required" as const, message: "Discount Name is required." },
      { type: "minLength" as const, value: 2, message: "Min 2 characters." },
    ],
    discountAmount: [
      { type: "required" as const, message: "Discount Amount is required." },
      // No "min" in ValidationRule, so skip or use custom if needed
    ],
    feeCategory: [
      { type: "required" as const, message: "Fee Category is required." },
    ],
  }), []);

  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
  } = useFormManager<AddFeeDiscountFormData>({
    initialValues,
    validationConfig,
    onClearError: () => setError(null),
  });

  useEffect(() => {
    if (isEditMode || academicYears.length === 0) return;
    const defaultId = academicYearFromList || resolveCurrentAcademicYearId(academicYears);
    if (!defaultId) return;
    setFormData((prev) =>
      prev.academic_year_id ? prev : { ...prev, academic_year_id: Number(defaultId) }
    );
  }, [isEditMode, academicYearFromList, academicYears, setFormData]);

  const selectedAcademicYearId =
    formData.academic_year_id !== "" ? String(formData.academic_year_id) : "";

  useEffect(() => {
    if (!selectedAcademicYearId) {
      setDiscountNameOptions([]);
      setDiscountNamesLoading(false);
      return;
    }
    setDiscountNamesLoading(true);
    feeDiscountService
      .listAllNames(Number(selectedAcademicYearId))
      .then((names) => setDiscountNameOptions(names))
      .catch(() => setDiscountNameOptions([]))
      .finally(() => setDiscountNamesLoading(false));
  }, [selectedAcademicYearId]);

  const feeCategoryOptions = useMemo(() => {
    let pool = !selectedAcademicYearId
      ? allCategories
      : allCategories.filter(
          (c) =>
            c.academic_year_id != null &&
            String(c.academic_year_id) === selectedAcademicYearId
        );
    const selectedClass = formData.applicableClass?.trim();
    if (selectedClass) {
      const classRow = allClasses.find((c) => c.name === selectedClass);
      pool = pool.filter((cat) => {
        if (cat.class_name && cat.class_name === selectedClass) return true;
        if (classRow?.id != null && cat.class_id != null) {
          return Number(cat.class_id) === Number(classRow.id);
        }
        return false;
      });
    }
    return pool.map((c) => c.name);
  }, [allCategories, allClasses, selectedAcademicYearId, formData.applicableClass]);

  const classOptions = useMemo(() => {
    const pool = !selectedAcademicYearId
      ? allClasses
      : allClasses.filter(
          (c) =>
            c.academic_year_id != null &&
            String(c.academic_year_id) === selectedAcademicYearId
        );
    return pool.map((c) => c.name);
  }, [allClasses, selectedAcademicYearId]);

  useEffect(() => {
    if (formData.feeCategory && !feeCategoryOptions.includes(formData.feeCategory)) {
      setFormData((prev) => ({ ...prev, feeCategory: "" }));
    }
    if (formData.applicableClass && !classOptions.includes(formData.applicableClass)) {
      setFormData((prev) => ({ ...prev, applicableClass: "" }));
    }
  }, [
    selectedAcademicYearId,
    feeCategoryOptions,
    classOptions,
    formData.feeCategory,
    formData.applicableClass,
    setFormData,
  ]);

  // Fetch entity for edit mode
  const fetchDiscount = useCallback(async () => {
    if (!discountId) return;
    try {
      setFetchLoading(true);
      const data = await feeDiscountService.getById(Number(discountId));
      const matchedCat = allCategories.find((c) => c.name === data.fee_category);
      const matchedClass = allClasses.find((c) => c.name === data.applicable_class);
      const yearId =
        matchedCat?.academic_year_id ?? matchedClass?.academic_year_id ?? "";
      setFormData({
        academic_year_id: yearId !== "" ? Number(yearId) : "",
        discountName: data.discount_name || "",
        discountType: data.discount_type || "PERCENTAGE",
        discountAmount: data.discount_value ?? "",
        feeCategory: data.fee_category || "",
        applicableClass: data.applicable_class || "",
        description: data.description || "",
        is_active: data.status ?? true,
      });
    } catch (err: unknown) {
      setError("Failed to load discount.");
    } finally {
      setFetchLoading(false);
    }
  }, [discountId, setFormData, allCategories, allClasses]);

  useEffect(() => {
    if (isEditMode) fetchDiscount();
  }, [fetchDiscount, isEditMode]);

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure discountAmount is a valid number
      const discountValue =
        formData.discountAmount !== "" && !isNaN(Number(formData.discountAmount))
          ? Number(formData.discountAmount)
          : null;

      if (discountValue === null) {
        setError("Discount Amount is required and must be a number.");
        setLoading(false);
        return;
      }

      const feeCategory = String(formData.feeCategory ?? "").trim();
      if (!feeCategory) {
        setError("Fee Category is required.");
        setLoading(false);
        return;
      }

      const payload = {
        discount_name: String(formData.discountName).trim(),
        discount_type: formData.discountType,
        discount_value: discountValue,
        fee_category: feeCategory,
        applicable_class: String(formData.applicableClass ?? "").trim(),
        description: formData.description,
        status: formData.is_active,
      };
      if (isEditMode && discountId) {
        await feeDiscountService.update(Number(discountId), payload);
        setSnackbar("Discount updated successfully.");
      } else {
        await feeDiscountService.create(payload);
        setSnackbar("Discount created successfully.");
      }
      setTimeout(
        () =>
          navigateWithConfigHub(listPath, {
            state: {
              academic_year_id:
                formData.academic_year_id !== ""
                  ? String(formData.academic_year_id)
                  : undefined,
            },
          }),
        1000
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        (isEditMode ? "Failed to update discount." : "Failed to create discount.")
      );
    } finally {
      setLoading(false);
    }
  };

  const formConfig = useMemo(() => {
    const config = createAddFeeDiscountFormConfig({
      isEditMode,
      academicYears,
      feeCategoryOptions,
      classOptions,
    });
    const nameField = config.fields.discountName;
    if (nameField) {
      nameField.type = "custom";
      nameField.render = (ctx) => {
        const name = String(ctx.formData.discountName ?? "").trim();
        const nameError = ctx.fieldErrors.discountName;

        return (
          <Autocomplete<string, false, false, true>
            freeSolo
            forcePopupIcon
            openOnFocus
            fullWidth
            loading={discountNamesLoading}
            options={discountNameOptions}
            getOptionLabel={(option) => option}
            isOptionEqualToValue={(option, value) => option === value}
            filterOptions={(options, state) => {
              const q = state.inputValue.trim().toLowerCase();
              if (!q) return options;
              return options.filter((o) => o.toLowerCase().includes(q));
            }}
            noOptionsText={
              discountNamesLoading
                ? "Loading…"
                : !selectedAcademicYearId
                  ? "Select academic year first"
                  : "No existing discounts for this year"
            }
            value={name || null}
            onChange={(_event, newValue) => {
              const val =
                typeof newValue === "string" ? newValue : newValue ?? "";
              ctx.handleFieldValueChange("discountName", val);
            }}
            onInputChange={(_event, newInputValue, reason) => {
              if (reason === "input" || reason === "clear") {
                ctx.handleFieldValueChange("discountName", newInputValue);
              }
            }}
            slotProps={{
              popper: {
                placement: "bottom-start",
                sx: { zIndex: (theme) => theme.zIndex.modal + 2 },
                modifiers: [{ name: "flip", enabled: false }],
              },
              paper: {
                sx: { mt: 0.5, maxHeight: 280 },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                name="discountName"
                label="Discount Name"
                required
                error={Boolean(nameError)}
                helperText={
                  nameError ?? "Open the list or type a new discount name"
                }
                placeholder="Select or type discount name"
                inputProps={{
                  ...params.inputProps,
                  minLength: 2,
                  autoComplete: "off",
                }}
              />
            )}
          />
        );
      };
    }
    return config;
  }, [
    isEditMode,
    academicYears,
    feeCategoryOptions,
    classOptions,
    discountNameOptions,
    discountNamesLoading,
    selectedAcademicYearId,
  ]);

  return (
    <BaseForm<AddFeeDiscountFormData>
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
      loading={loading}
      fetchLoading={fetchLoading}
      error={error}
      onErrorDismiss={() => setError(null)}
      snackbar={snackbar}
      onSnackbarClose={() => setSnackbar(null)}
      headerConfig={{
        links: buildFormBreadcrumbs(
          { title: "Fee Discounts", path: listPath },
          isEditMode ? "Edit Fee Discount" : "Add Fee Discount"
        ),
        homePath: "/",
        cancelTooltip: "Cancel",
        saveTooltipCreate: "Save",
        saveTooltipEdit: "Update",
      }}
      gridSpacing={3}
      onCancelNavigate={() =>
        navigateWithConfigHub(listPath, {
          state: {
            academic_year_id:
              formData.academic_year_id !== ""
                ? String(formData.academic_year_id)
                : academicYearFromList,
          },
        })
      }
      confirmMessage={(ctx) =>
        ctx.isEditMode
          ? "Are you sure you want to update this discount?"
          : "Are you sure you want to save this discount?"
      }
      hideFieldValidationDialog
    />
  );
}