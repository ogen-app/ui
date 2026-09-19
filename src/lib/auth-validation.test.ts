import { describe, expect, it } from 'vitest'
import {
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from './auth-validation.ts'
// The real, initialised instance — English is bundled, so `t` resolves
// synchronously. That makes these assertions a check on the catalogue too: a
// key renamed in `en.ts` without updating the schema fails here.
import { i18next } from '@/i18n'

const t = i18next.t

/** First message for a field, or undefined when the field passed. */
function errorFor(
  result: {
    success: boolean
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> }
  },
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error?.issues.find((i) => i.path[0] === field)?.message
}

describe('resetPasswordSchema', () => {
  const schema = resetPasswordSchema(t)
  const good = 'Sunlit7Harbour'

  it('accepts a strong password typed twice', () => {
    const result = schema.safeParse({
      password: good,
      confirmPassword: good,
    })
    expect(result.success).toBe(true)
  })

  // The reason the second field exists: nothing else can catch a typo in a
  // credential the user can't see and won't use again until their next login.
  it('rejects a mismatch, and blames the confirmation field', () => {
    const result = schema.safeParse({
      password: good,
      confirmPassword: `${good}x`,
    })
    expect(result.success).toBe(false)
    expect(errorFor(result, 'confirmPassword')).toBe('Passwords do not match')
  })

  it('applies the full strength rules, not just a length check', () => {
    for (const weak of [
      'short1A',
      'alllowercase1',
      'ALLUPPERCASE1',
      'NoDigitsHere',
    ]) {
      const result = schema.safeParse({
        password: weak,
        confirmPassword: weak,
      })
      expect(result.success, `expected "${weak}" to be rejected`).toBe(false)
      expect(errorFor(result, 'password')).toBeDefined()
    }
  })

  it('asks for the confirmation when it is left empty', () => {
    const result = schema.safeParse({ password: good, confirmPassword: '' })
    expect(errorFor(result, 'confirmPassword')).toBe('Confirm your password')
  })
})

describe('loginSchema', () => {
  const schema = loginSchema(t)

  // Logging in checks a password that already exists; re-running the signup
  // strength rules here would lock out anyone whose password predates them.
  it('takes any non-empty password', () => {
    const result = schema.safeParse({ email: 'a@b.co', password: 'x' })
    expect(result.success).toBe(true)
  })

  it('still requires a well-formed email', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'x' })
    expect(errorFor(result, 'email')).toBe('Invalid email format')
  })
})

describe('profileSchema', () => {
  const schema = profileSchema(t)
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  }

  it('accepts a filled-in profile', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it('rejects a whitespace-only name', () => {
    // The field is trimmed before it is sent, so " " would reach the server as
    // an empty name and be rejected there.
    const result = schema.safeParse({ ...valid, firstName: '   ' })
    expect(errorFor(result, 'firstName')).toBeDefined()
  })

  it('rejects a malformed email', () => {
    const result = schema.safeParse({ ...valid, email: 'ada@' })
    expect(errorFor(result, 'email')).toBe('Invalid email format')
  })
})

/**
 * The whole point of the factories: the same schema built after a language
 * change carries the new language's messages. A module-level constant would
 * have frozen English at import time.
 */
describe('schemas follow the active language', () => {
  it('rebuilds its messages from the catalogue in force when it is built', async () => {
    const { es } = await import('@/i18n/resources/es')
    i18next.addResourceBundle('es', 'translation', es)
    await i18next.changeLanguage('es')
    try {
      const result = loginSchema(i18next.t).safeParse({
        email: 'nope',
        password: 'x',
      })
      expect(errorFor(result, 'email')).toBe(
        'El formato del correo electrónico no es válido',
      )
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
