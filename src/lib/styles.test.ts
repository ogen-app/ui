import { describe, expect, it } from 'vitest'
import { cn } from './styles'

describe('cn', () => {
  it('keeps a theme font size beside a text colour', () => {
    // The page title's classes: `text-display` used to be merged away as a
    // colour losing to `text-primary-foreground`.
    expect(cn('text-display text-primary-foreground')).toBe(
      'text-display text-primary-foreground',
    )
  })

  it('still lets a later font size replace a theme one', () => {
    expect(cn('text-display', 'text-sm')).toBe('text-sm')
  })
})
