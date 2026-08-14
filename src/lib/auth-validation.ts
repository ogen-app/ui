import { z } from 'zod'
import type { TFunction } from 'i18next'

/**
 * Auth validation schemas for login and self-service signup.
 *
 * Signup posts to `POST /api/tenants`, whose backend validator only requires
 * a non-empty tenant/user name, a valid email, and a password of at least 8
 * characters. The extra password-strength rules below are a deliberately
 * stricter client-side gate (better UX, never rejects a password the backend
 * would have accepted for the wrong reason).
 *
 * Every schema here is a **factory taking `t`**, not a module-level constant.
 * A zod schema bakes its messages in at construction, so a constant would
 * freeze whichever language happened to be loaded when this module first
 * evaluated — English, always, since it is the bundled one. Building the
 * schema inside the component (via the hooks in `hooks/useAuthSchemas.ts`,
 * which memoise on `t`) means the messages are rebuilt when the language
 * changes, and an error already on screen re-renders in the new one.
 */

type T = TFunction

/**
 * The three free-text name fields. They share a shape but not their copy —
 * "El nombre es obligatorio" and "Los apellidos son obligatorios" disagree in
 * number, so a generic "{{field}} is required" would be wrong in Spanish
 * before it was wrong anywhere else. The key prefix picks the whole sentence.
 */
const nameField = (t: T, field: 'firstName' | 'lastName' | 'organizationName', max: number) =>
  z
    .string()
    .min(1, t(`validation.${field}.required`))
    .max(max, t(`validation.${field}.tooLong`))
    .refine((v) => v.trim().length > 0, t(`validation.${field}.whitespace`))

const emailField = (t: T) =>
  z.email(t('validation.email.invalid')).min(1, t('validation.email.required'))

const passwordField = (t: T) =>
  z
    .string()
    .min(8, t('validation.password.tooShort'))
    .regex(/[A-Z]/, t('validation.password.needsUppercase'))
    .regex(/[a-z]/, t('validation.password.needsLowercase'))
    .regex(/\d/, t('validation.password.needsDigit'))

export const loginSchema = (t: T) =>
  z.object({
    email: emailField(t),
    password: z.string().min(1, t('validation.password.required')),
  })

/**
 * Self-service signup (CON-97): name, email and password plus the
 * organization name that bootstraps the new tenant.
 */
export const signupSchema = (t: T) =>
  z.object({
    organizationName: nameField(t, 'organizationName', 100),
    firstName: nameField(t, 'firstName', 50),
    lastName: nameField(t, 'lastName', 50),
    email: emailField(t),
    password: passwordField(t),
  })

/** Step one of the reset: the address the one-time link is sent to. */
export const forgotPasswordSchema = (t: T) =>
  z.object({
    email: emailField(t),
  })

/**
 * Step two: the new password, typed twice.
 *
 * The confirmation field is not ceremony here. Every other password entry in
 * the app is either a login (wrong password just fails) or a signup the user
 * can repeat; this one silently sets a credential the user cannot see and will
 * not use again until their next login, possibly on another device. Typing it
 * twice is the only check there is.
 */
export const resetPasswordSchema = (t: T) =>
  z
    .object({
      password: passwordField(t),
      confirmPassword: z.string().min(1, t('validation.confirmPassword.required')),
    })
    .refine((v) => v.password === v.confirmPassword, {
      message: t('validation.confirmPassword.mismatch'),
      path: ['confirmPassword'],
    })

/**
 * Accepting an invitation: the name to be known by, and the password for the
 * account being created.
 *
 * No email field — the invitation is addressed to one, and the account is
 * created with it whatever the form says. No confirmation field either: unlike
 * a reset, this password is typed by someone who is about to use it
 * immediately (accepting signs them straight in), so a typo announces itself
 * at the next login rather than locking a stranger out of their own account.
 */
export const acceptInviteSchema = (t: T) =>
  z.object({
    firstName: nameField(t, 'firstName', 50),
    lastName: nameField(t, 'lastName', 50),
    password: passwordField(t),
  })

/** The identity half of `/profile` — what `PUT /api/users/:id` calls name + email. */
export const profileSchema = (t: T) =>
  z.object({
    firstName: nameField(t, 'firstName', 50),
    lastName: nameField(t, 'lastName', 50),
    email: emailField(t),
  })

/*
 * There is no in-app change-password schema. `PasswordSection` on /profile
 * sends the emailed reset instead of collecting a new credential, so the only
 * screen that sets a password from typed input is `/auth/reset` above. See
 * that component for why the form went away (CON-193).
 */

/**
 * The live checklist under a new-password field, in display order.
 *
 * `separator` / `lastSeparator` are translated alongside the rules because the
 * joins differ by language: English writes "a, b, c, and d" and Spanish writes
 * "a, b, c y d". The list is still assembled from parts rather than being one
 * sentence, because each rule is coloured on its own as the user types.
 */
export const passwordRules = (t: T) =>
  [
    { test: (v: string) => v.length >= 8, label: t('validation.passwordRules.minChars') },
    { test: (v: string) => /[A-Z]/.test(v), label: t('validation.passwordRules.uppercase') },
    { test: (v: string) => /[a-z]/.test(v), label: t('validation.passwordRules.lowercase') },
    { test: (v: string) => /\d/.test(v), label: t('validation.passwordRules.digit') },
  ] as const

export type FieldErrors<T> = Partial<Record<keyof T, string>>
