import type { ChangeEvent } from "react";

export function sanitizeDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function withDigitsOnlyChange(
  onChange: ((event: ChangeEvent<HTMLInputElement>) => void) | undefined,
  event: ChangeEvent<HTMLInputElement>,
): void {
  if (!onChange) return;

  const sanitized = sanitizeDigitsOnly(event.target.value);
  if (sanitized === event.target.value) {
    onChange(event);
    return;
  }

  onChange({
    ...event,
    target: { ...event.target, value: sanitized },
    currentTarget: { ...event.currentTarget, value: sanitized },
  });
}
