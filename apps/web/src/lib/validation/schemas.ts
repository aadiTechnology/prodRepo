/**
 * Zod validation schemas — Shared schemas for forms
 * Integrate with React Hook Form via @hookform/resolvers/zod.
 * Keep validation rules separate from UI components.
 */

import { z } from "zod";

/** Email with basic format validation */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

/** Password: min length; extend with complexity rules as needed */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

/** Optional password (e.g. edit forms where password can be left blank) */
export const optionalPasswordSchema = z
  .string()
  .optional()
  .refine((val) => !val || val.length >= 8, "Password must be at least 8 characters");

/** Full name: min 2 chars */
export const fullNameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters");

/** Confirm password: must match password field (use with .refine on object schema) */
export function createConfirmPasswordRefine(passwordField: string) {
  return (data: { password?: string; confirm_password?: string }) =>
    !data.confirm_password || data.password === data.confirm_password;
}

/** User create/edit form schema (example) */
export const userFormSchema = z
  .object({
    email: emailSchema,
    full_name: fullNameSchema,
    password: passwordSchema.optional(),
    confirm_password: z.string().optional(),
    role_code: z.string().min(1, "Role is required"),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => !data.password || data.password === data.confirm_password,
    { message: "Passwords must match", path: ["confirm_password"] }
  );

/** Login form schema */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Change password form schema */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: passwordSchema,
    confirm_password: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
  });

export type UserFormValues = z.infer<typeof userFormSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
