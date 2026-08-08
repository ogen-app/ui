import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { z } from 'zod'
import { useFormValidation } from './useFormValidation'

/** Shaped like the real auth schemas: per-field rules plus a cross-field one. */
const schema = z
  .object({
    email: z.email('Enter a valid email'),
    password: z.string().min(8, 'Min. 8 chars').regex(/\d/, 'Needs a digit'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

const EMPTY = { email: '', password: '', confirm: '' }

function setup(defaults = EMPTY) {
  return renderHook(() => useFormValidation(schema, defaults))
}

describe('useFormValidation', () => {
  it('says nothing until the form has been submitted once', () => {
    // Marking a field invalid while it is being typed for the first time
    // means every field is red before anyone has finished — "not an email
    // yet" is not the same as "wrong".
    const { result } = setup()

    act(() => result.current.setField('email', 'a'))

    expect(result.current.fieldErrors).toEqual({})
  })

  it('reports every bad field at once on submit, and returns nothing', () => {
    const { result } = setup()

    let parsed: unknown = 'unset'
    act(() => {
      parsed = result.current.validate()
    })

    expect(parsed).toBeUndefined()
    expect(result.current.fieldErrors.email).toBe('Enter a valid email')
    expect(result.current.fieldErrors.password).toBe('Min. 8 chars')
  })

  it('clears a field error as the user fixes that field', () => {
    // The point of latching on submit: from then on the form is answering,
    // not judging.
    const { result } = setup()
    act(() => {
      result.current.validate()
    })

    act(() => result.current.setField('email', 'ada@example.com'))

    expect(result.current.fieldErrors.email).toBeUndefined()
    // The field they haven't reached yet keeps its error rather than the
    // whole form going quiet on one correction.
    expect(result.current.fieldErrors.password).toBe('Min. 8 chars')
  })

  it('returns the parsed values when everything passes', () => {
    const { result } = setup()

    act(() => {
      result.current.setField('email', 'ada@example.com')
      result.current.setField('password', 'Password1')
      result.current.setField('confirm', 'Password1')
    })
    let parsed: unknown
    act(() => {
      parsed = result.current.validate()
    })

    expect(parsed).toEqual({
      email: 'ada@example.com',
      password: 'Password1',
      confirm: 'Password1',
    })
    expect(result.current.fieldErrors).toEqual({})
  })

  it('shows one message per field when a field fails several ways', () => {
    // "short" is both too short and digit-less. Stacking both under one input
    // reads as two separate problems with one box the user has half-filled.
    const { result } = setup()
    act(() => {
      result.current.setField('email', 'ada@example.com')
      result.current.setField('password', 'short')
      result.current.setField('confirm', 'short')
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.fieldErrors.password).toBe('Min. 8 chars')
    expect(Object.values(result.current.fieldErrors)).toHaveLength(1)
  })

  it('carries a cross-field error to the field it belongs to', () => {
    // `refine` issues have a `path` for a reason: "passwords do not match"
    // under the confirmation field, not floating above the form.
    const { result } = setup()
    act(() => {
      result.current.setField('email', 'ada@example.com')
      result.current.setField('password', 'Password1')
      result.current.setField('confirm', 'Password2')
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.fieldErrors.confirm).toBe('Passwords do not match')
    expect(result.current.fieldErrors.password).toBeUndefined()
  })

  it('goes quiet again after a reset, not just empty', () => {
    // The reset form resets on success and stays on screen (the forgot page's
    // resend works the same way). If the submitted flag survived, the freshly
    // emptied fields would come back red the moment the user touched one.
    const { result } = setup()
    act(() => {
      result.current.setField('email', 'ada@example.com')
    })
    act(() => {
      result.current.validate()
    })

    act(() => result.current.reset())

    expect(result.current.values).toEqual(EMPTY)
    expect(result.current.fieldErrors).toEqual({})

    act(() => result.current.setField('email', 'a'))
    expect(result.current.fieldErrors).toEqual({})
  })
})
