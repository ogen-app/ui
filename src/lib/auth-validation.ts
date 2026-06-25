import { z } from 'zod'

/**
 * Auth validation schemas for login and self-service signup.
 *
 * Signup posts to `POST /api/tenants`, whose backend validator only requires
 * a non-empty tenant/user name, a valid email, and a password of at least 8
 * characters. The extra password-strength rules below are a deliberately
 * stricter client-side gate (better UX, never rejects a password the backend
 * would have accepted for the wrong reason).
 */

const nameField = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(50, `${label} must be at most 50 characters`)
    .refine((v) => v.trim().length > 0, `${label} cannot be only whitespace`)

const organizationField = z
  .string()
  .min(1, 'Organization name is required')
  .max(100, 'Organization name must be at most 100 characters')
  .refine((v) => v.trim().length > 0, 'Organization name cannot be only whitespace')

const emailField = z.email('Invalid email format').min(1, 'Email is required')

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/\d/, 'Must contain a digit')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  firstName: nameField('First name'),
  lastName: nameField('Last name'),
  email: emailField,
  password: passwordField,
})

/**
 * Self-service signup (CON-97): the register fields plus the organization name
 * that bootstraps the new tenant.
 */
export const signupSchema = z.object({
  organizationName: organizationField,
  firstName: nameField('First name'),
  lastName: nameField('Last name'),
  email: emailField,
  password: passwordField,
})

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 8, label: 'Min. 8 chars' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'an uppercase' },
  { test: (v: string) => /[a-z]/.test(v), label: 'a lowercase' },
  { test: (v: string) => /\d/.test(v), label: 'a digit' },
] as const

export type FieldErrors<T> = Partial<Record<keyof T, string>>

export function validateField<T extends z.ZodObject<Record<string, z.ZodType>>>(
  schema: T,
  field: keyof z.infer<T>,
  value: string
): string | undefined {
  const fieldSchema = schema.shape[field as string]
  if (!fieldSchema) return undefined
  const result = fieldSchema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}
