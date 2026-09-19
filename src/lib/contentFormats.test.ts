import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import {
  CONTENT_FORMATS,
  contentFormat,
  contentFormatCopy,
  contentFormatLabel,
  isContentFormatId,
  normalizeContentFormat,
} from './contentFormats'

/**
 * The format vocabulary, and the one rule that matters about it: **an id this
 * build has never heard of must read as unset, never crash and never leak.**
 *
 * That is not hypothetical bookkeeping. The id becomes a column, and from then
 * on a build that predates a format somebody else's build wrote will read one
 * out of the database — the same situation an asset `type` this app does not
 * recognise is already in.
 */

describe('the vocabulary', () => {
  it('is short, and every entry has copy in the catalogue', () => {
    // The list staying short is the design, not an accident of the moment: a
    // vocabulary long enough to browse is a library, and a library needs a
    // page, an editor and somebody to maintain it.
    expect(CONTENT_FORMATS.length).toBeLessThanOrEqual(10)

    for (const format of CONTENT_FORMATS) {
      const copy = contentFormatCopy(i18next.t, format.id)
      expect(copy.label).toBeTruthy()
      expect(copy.hint).toBeTruthy()
      // A hint that is only the label again teaches nobody which of how-to and
      // explainer they meant.
      expect(copy.hint).not.toBe(copy.label)
    }
  })

  it('has no duplicate ids', () => {
    const ids = CONTENT_FORMATS.map((format) => format.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('reading a stored value', () => {
  it('recognises what it knows', () => {
    expect(isContentFormatId('how-to')).toBe(true)
    expect(contentFormat('digest')?.id).toBe('digest')
    expect(normalizeContentFormat('explainer')).toBe('explainer')
  })

  it('narrows anything else to unset', () => {
    // An older sidecar, a hand-edited localStorage entry, a future column.
    expect(normalizeContentFormat('interpretive-dance')).toBeNull()
    expect(normalizeContentFormat(undefined)).toBeNull()
    expect(normalizeContentFormat(null)).toBeNull()
    expect(normalizeContentFormat(42)).toBeNull()
    expect(contentFormat('interpretive-dance')).toBeUndefined()
  })

  it('never prints a raw slug at the user', () => {
    // The failure this guards is a database value appearing in the interface
    // because a label lookup missed.
    const label = contentFormatLabel(i18next.t, 'interpretive-dance')
    expect(label).not.toContain('interpretive-dance')
    expect(label).toBe(i18next.t('formats.none'))
    expect(contentFormatLabel(i18next.t, null)).toBe(i18next.t('formats.none'))
  })
})
