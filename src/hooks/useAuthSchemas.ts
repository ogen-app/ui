import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import {
  forgotPasswordSchema,
  loginSchema,
  passwordRules,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib'

/**
 * The auth schemas, built for the language currently on screen.
 *
 * The memo is not an optimisation — `useFormValidation` keeps the schema in
 * `useCallback` dependencies, so a fresh object every render would rebuild
 * `setField` and `validate` on every keystroke. Keying it on `t` also does the
 * right thing on a language switch: react-i18next hands back a new `t` when
 * the language changes, so the schema and every message in it are rebuilt
 * exactly once, and an error already on screen re-renders translated.
 */
function useSchema<S>(build: (t: TFunction) => S): S {
  const { t } = useTranslation()
  return useMemo(() => build(t), [build, t])
}

export const useLoginSchema = () => useSchema(loginSchema)
export const useSignupSchema = () => useSchema(signupSchema)
export const useForgotPasswordSchema = () => useSchema(forgotPasswordSchema)
export const useResetPasswordSchema = () => useSchema(resetPasswordSchema)
export const useProfileSchema = () => useSchema(profileSchema)

/** The live checklist under a new-password field. See `PasswordRules`. */
export const usePasswordRules = () => useSchema(passwordRules)
