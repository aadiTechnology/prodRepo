import type { ValidationRule } from "./formValidation";
import { EMAIL_PATTERN, NUMERIC_PATTERN, PHONE_PATTERN } from "./validationPatterns";

export function emailRequiredPatternRules<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): ValidationRule<T>[] {
  return [
    { type: "required", message: "Required." },
    { type: "pattern", regex: EMAIL_PATTERN, message: "Invalid email." },
  ];
}

export function optionalPhonePatternRules<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): ValidationRule<T>[] {
  return [{ type: "pattern", regex: PHONE_PATTERN, message: "Invalid phone." }];
}

export function optionalNumericPatternRules<
  T extends Record<string, unknown> = Record<string, unknown>,
>(message = "Only numeric values are allowed."): ValidationRule<T>[] {
  return [{ type: "pattern", regex: NUMERIC_PATTERN, message }];
}

export function newPasswordRules<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): ValidationRule<T>[] {
  return [
    { type: "required", message: "Required." },
    { type: "minLength", value: 8, message: "Min 8 characters." },
  ];
}

export function confirmPasswordMatchRules<T extends Record<string, unknown>>(
  matchField: keyof T & string
): ValidationRule<T>[] {
  return [
    { type: "required", message: "Required." },
    { type: "matchField", field: matchField, message: "Passwords don't match." },
  ];
}
