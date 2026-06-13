export type ValidationRule<T extends Record<string, unknown> = Record<string, unknown>> =
  | { type: "required"; message?: string }
  | { type: "minLength"; value: number; message?: string }
  | { type: "maxLength"; value: number; message?: string }
  | { type: "pattern"; regex: RegExp; message?: string }
  | { type: "matchField"; field: keyof T & string; message?: string }
  | { type: "custom"; validate: (formData: T, fieldName: keyof T & string) => string };

export type FormValidationConfig<T extends Record<string, unknown>> = Partial<
  Record<keyof T & string, ValidationRule<T>[]>
>;

function isEmptyValue(val: unknown): boolean {
  return (
    val === undefined ||
    val === null ||
    (typeof val === "string" && val.trim() === "") ||
    (typeof val === "number" && Number.isNaN(val))
  );
}

export function validateField<T extends Record<string, unknown>>(
  config: FormValidationConfig<T>,
  name: keyof T & string,
  formData: T
): string {
  const rules = config[name];
  if (!rules?.length) return "";
  const val = formData[name];

  for (const rule of rules) {
    switch (rule.type) {
      case "required": {
        if (isEmptyValue(val)) return rule.message ?? "Required.";
        break;
      }
      case "minLength": {
        const s = typeof val === "string" ? val : String(val ?? "");
        if (s.length < rule.value) return rule.message ?? `Min ${rule.value} characters.`;
        break;
      }
      case "maxLength": {
        const s = typeof val === "string" ? val : String(val ?? "");
        if (s.length > rule.value) return rule.message ?? `Max ${rule.value} characters.`;
        break;
      }
      case "pattern": {
        const s = typeof val === "string" ? val : String(val ?? "");
        if (s && !rule.regex.test(s)) return rule.message ?? "Invalid value.";
        break;
      }
      case "matchField": {
        const a = val;
        const b = formData[rule.field as keyof T];
        if (a !== b) return rule.message ?? "Values don't match.";
        break;
      }
      case "custom": {
        const msg = rule.validate(formData, name);
        if (msg) return msg;
        break;
      }
      default:
        break;
    }
  }
  return "";
}

export function validateForm<T extends Record<string, unknown>>(
  config: FormValidationConfig<T>,
  formData: T
): Partial<Record<keyof T & string, string>> {
  const next: Partial<Record<keyof T & string, string>> = {};
  const keys = Object.keys(config) as (keyof T & string)[];
  for (const k of keys) {
    const err = validateField(config, k, formData);
    if (err) next[k] = err;
  }
  return next;
}

export function mapApiErrorsToFields(err: unknown): {
  fieldErrors: Record<string, string>;
  message: string;
} {
  const e = err as {
    message?: string;
    response?: { data?: { detail?: unknown; errors?: unknown } };
  };
  const fieldErrors: Record<string, string> = {};
  let msg = e?.message || "";
  const errorData = e?.response?.data;
  const detail = errorData?.detail;
  const validationIssues = Array.isArray(detail)
    ? detail
    : Array.isArray(errorData?.errors)
      ? errorData.errors
      : null;

  if (validationIssues) {
    validationIssues.forEach((issue: { loc?: unknown[]; msg?: string }) => {
      const field = issue.loc?.[issue.loc.length - 1];
      const issueMsg = issue.msg ?? "";
      if (field && typeof field === "string") {
        if (field === "file" || field === "files" || field === "body") {
          if (issueMsg) msg = issueMsg;
          return;
        }
        fieldErrors[field] = issueMsg;
      }
    });
    if (Object.keys(fieldErrors).length > 0) {
      msg = "Please fix the highlighted errors.";
    } else {
      const first = validationIssues[0] as { msg?: string } | undefined;
      msg = first?.msg || msg;
    }
  } else if (typeof detail === "string") {
    msg = detail;
  }

  if (
    (!msg || msg === "Validation error" || msg.includes("Request failed with status code")) &&
    typeof e?.message === "string" &&
    e.message &&
    !e.message.includes("Request failed with status code")
  ) {
    msg = e.message;
  }

  if (msg.toLowerCase().includes("email already exists")) {
    fieldErrors.email = "Email already exists.";
  }

  return { fieldErrors, message: msg };
}
