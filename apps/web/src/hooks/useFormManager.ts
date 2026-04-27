import { useCallback, useState } from "react";
import {
  validateField,
  validateForm,
  type FormValidationConfig,
} from "../utils/formValidation";

export type DependentFieldPair<T extends Record<string, unknown>> = readonly [
  keyof T & string,
  keyof T & string,
];

export type UseFormManagerOptions<T extends Record<string, unknown>> = {
  initialValues: T;
  validationConfig: FormValidationConfig<T>;
  /** When either field in a pair changes, re-validate both (e.g. password + confirm). */
  dependentFieldPairs?: readonly DependentFieldPair<T>[];
  onClearError?: () => void;
};

export type UseFormManagerResult<T extends Record<string, unknown>> = {
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  fieldErrors: Partial<Record<keyof T & string, string>>;
  setFieldErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof T & string, string>>>
  >;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFieldValueChange: (name: keyof T & string, value: unknown) => void;
  handleSubmit: (e: React.FormEvent, onValid?: () => void) => void;
  resetForm: (next?: T) => void;
};

const EMPTY_DEPENDENT_FIELD_PAIRS: readonly DependentFieldPair<Record<string, unknown>>[] = [];

function applyDependentPairValidation<T extends Record<string, unknown>>(
  config: FormValidationConfig<T>,
  next: T,
  updated: Partial<Record<keyof T & string, string>>,
  changedName: keyof T & string,
  pairs: readonly DependentFieldPair<T>[]
): void {
  for (const [a, b] of pairs) {
    if (changedName === a || changedName === b) {
      updated[a] = validateField(config, a, next);
      updated[b] = validateField(config, b, next);
    }
  }
}

export function useFormManager<T extends Record<string, unknown>>(
  options: UseFormManagerOptions<T>
): UseFormManagerResult<T> {
  const { validationConfig, onClearError } = options;
  const dependentFieldPairs =
    (options.dependentFieldPairs as readonly DependentFieldPair<T>[] | undefined) ??
    (EMPTY_DEPENDENT_FIELD_PAIRS as readonly DependentFieldPair<T>[]);

  const [formData, setFormData] = useState<T>(() => options.initialValues);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof T & string, string>>
  >({});

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      const n = name as keyof T & string;
      const v = type === "checkbox" ? checked : value;
      setFormData((prev) => {
        const next = { ...prev, [n]: v } as T;
        setFieldErrors((fe) => {
          const updated = { ...fe, [n]: validateField(validationConfig, n, next) };
          applyDependentPairValidation(
            validationConfig,
            next,
            updated,
            n,
            dependentFieldPairs
          );
          return updated;
        });
        return next;
      });
      onClearError?.();
    },
    [validationConfig, dependentFieldPairs, onClearError]
  );

  const handleFieldValueChange = useCallback(
    (name: keyof T & string, value: unknown) => {
      setFormData((prev) => {
        const next = { ...prev, [name]: value } as T;
        setFieldErrors((fe) => {
          const updated = { ...fe, [name]: validateField(validationConfig, name, next) };
          applyDependentPairValidation(
            validationConfig,
            next,
            updated,
            name,
            dependentFieldPairs
          );
          return updated;
        });
        return next;
      });
      onClearError?.();
    },
    [validationConfig, dependentFieldPairs, onClearError]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent, onValid?: () => void) => {
      e.preventDefault();
      const errors = validateForm(validationConfig, formData);
      setFieldErrors(errors);
      if (Object.keys(errors).length === 0) onValid?.();
    },
    [validationConfig, formData]
  );

  const resetForm = useCallback((next?: T) => {
    setFormData(next ?? options.initialValues);
    setFieldErrors({});
  }, [options.initialValues]);

  return {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleChange,
    handleFieldValueChange,
    handleSubmit,
    resetForm,
  };
}
