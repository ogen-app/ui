import { describe, expect, it } from 'vitest'
import { isAutoPublishAllowed, resolvePublishMethod } from './autoPublish.ts'

// Platform Sqids from platformDictionary.ts.
const LINKEDIN = 'AXqWG7U2qnpt'
const FACEBOOK = 'zBU1zqVICGfk'
const INSTAGRAM = 'rzgpTkARLH0L'

// The workspace allows LinkedIn to publish on its own; Facebook is manual only.
const ALLOWLIST = ['linkedin']

describe('isAutoPublishAllowed', () => {
  it('maps the platform Sqid onto the allowlist Zernio id', () => {
    expect(isAutoPublishAllowed(ALLOWLIST, LINKEDIN)).toBe(true)
    expect(isAutoPublishAllowed(ALLOWLIST, FACEBOOK)).toBe(false)
  })

  it('treats an unknown or missing platform as not allowed', () => {
    expect(isAutoPublishAllowed(ALLOWLIST, 'not-a-platform')).toBe(false)
    expect(isAutoPublishAllowed(ALLOWLIST, null)).toBe(false)
  })

  it('treats a not-yet-loaded allowlist as not allowed', () => {
    // The query is in flight. Offering auto here and withdrawing it a moment
    // later is worse than starting from the safe answer.
    expect(isAutoPublishAllowed(undefined, LINKEDIN)).toBe(false)
  })

  it('treats an empty allowlist as nothing allowed', () => {
    expect(isAutoPublishAllowed([], LINKEDIN)).toBe(false)
  })
})

describe('resolvePublishMethod', () => {
  it('keeps auto when the destination platform allows it', () => {
    expect(resolvePublishMethod('auto', ALLOWLIST, LINKEDIN)).toBe('auto')
  })

  it('drops to manual when switching to a platform that disallows auto', () => {
    // One channel auto-publishes, another is manual only: moving the post from
    // LinkedIn to Facebook must not carry the auto intent across.
    expect(resolvePublishMethod('auto', ALLOWLIST, LINKEDIN)).toBe('auto')
    expect(resolvePublishMethod('auto', ALLOWLIST, FACEBOOK)).toBe('manual')
    expect(resolvePublishMethod('auto', ALLOWLIST, INSTAGRAM)).toBe('manual')
  })

  it('never upgrades a manual choice to auto', () => {
    // Publishing by hand is the user's decision, not a capability gap.
    expect(resolvePublishMethod('manual', ALLOWLIST, LINKEDIN)).toBe('manual')
  })

  it('drops to manual while the allowlist is still loading', () => {
    expect(resolvePublishMethod('auto', undefined, LINKEDIN)).toBe('manual')
  })
})
