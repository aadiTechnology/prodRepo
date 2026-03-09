/**
 * Validation — Zod schemas and RHF resolver
 * Use zodResolver(schema) with useForm for schema-based validation.
 */

export {
  emailSchema,
  passwordSchema,
  optionalPasswordSchema,
  fullNameSchema,
  createConfirmPasswordRefine,
  userFormSchema,
  loginSchema,
  changePasswordSchema,
} from "./schemas";
export type {
  UserFormValues,
  LoginFormValues,
  ChangePasswordFormValues,
} from "./schemas";

export { zodResolver } from "@hookform/resolvers/zod";
