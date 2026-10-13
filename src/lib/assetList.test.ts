import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import {
  formatDuration,
  listDate,
  listTitle,
  verdictSentence,
} from './assetList'

// Echoes the key and its count, so the rules can be read without a catalogue.
const t = ((key: string, opts?: { count?: number }) =>
  opts?.count === undefined ? key : `${key}:${opts.count}`) as TFunction

const file = (name: string, mime = 'application/octet-stream') => ({
  id: 'f',
  original_name: name,
  mime_type: mime,
  size_bytes: 1,
  width: 0,
  height: 0,
  is_animated: false,
})

describe('listTitle', () => {
  it('decodes, drops the extension and reads underscores as spaces', () => {
    expect(
      listTitle(
        {
          title: 'riverside_olena_kyianovska_da%20talks_0070.m4a',
          type: 'AUDIO',
          file: file('x.m4a'),
        },
        'Untitled',
      ),
    ).toBe('riverside olena kyianovska da talks 0070')
  })

  it('reads a hyphenated file name as words', () => {
    expect(
      listTitle(
        {
          title: 'Databricks-Big-Book-Of-GenAI.pdf',
          type: 'PDF',
          file: file('a.pdf'),
        },
        'Untitled',
      ),
    ).toBe('Databricks Big Book Of GenAI')
  })

  it('drops a publisher suffix when the row shows the domain', () => {
    expect(
      listTitle(
        {
          title: 'Design Patterns for Serverless Systems - InfoQ',
          type: 'URL',
          source_url: 'https://www.infoq.com/articles/serverless',
        },
        'Untitled',
      ),
    ).toBe('Design Patterns for Serverless Systems')
  })

  it('keeps a dash that is part of a sentence', () => {
    expect(
      listTitle(
        {
          title: 'Spring launch - what we learned about pricing and timing',
          type: 'URL',
          source_url: 'https://acme.com/blog',
        },
        'Untitled',
      ),
    ).toBe('Spring launch - what we learned about pricing and timing')
  })

  it('reads a page still titled by its address as the address', () => {
    expect(
      listTitle(
        {
          title: 'https://acme.com/blog',
          type: 'URL',
          source_url: 'https://acme.com/blog',
        },
        'Untitled',
      ),
    ).toBe('acme.com/blog')
  })

  it('falls back for a blank title, and leaves a written one alone', () => {
    expect(listTitle({ title: '  ', type: 'MD' }, 'Untitled')).toBe('Untitled')
    expect(listTitle({ title: 'GPT-4 notes', type: 'MD' }, 'Untitled')).toBe(
      'GPT-4 notes',
    )
  })
})

describe('listDate', () => {
  const now = new Date('2026-10-13T12:00:00Z')

  it('says a distance within the week', () => {
    const d = listDate(t, '2026-10-13T00:00:00Z', now, 'en')
    expect(d?.label).toBe('12 hours ago')
  })

  it('says a dated day with a four-digit year after a week', () => {
    const d = listDate(t, '2026-10-04T09:00:00Z', now, 'en-GB')
    expect(d?.label).toBe('4 Oct 2026')
    expect(d?.exact).toMatch(/2026/)
  })

  it('says just now inside a minute, and nothing for a bad date', () => {
    expect(listDate(t, '2026-10-13T11:59:40Z', now)?.label).toBe(
      'content.list.justNow',
    )
    expect(listDate(t, 'nope', now)).toBeNull()
  })
})

describe('formatDuration', () => {
  it('counts minutes, and seconds under one', () => {
    expect(formatDuration(t, 18 * 60_000 + 10_000)).toBe(
      'content.list.minutes:18',
    )
    expect(formatDuration(t, 21_000)).toBe('0:21')
  })
})

describe('verdictSentence', () => {
  it('names each verdict with ideas, in the fixed order', () => {
    expect(verdictSentence(t, { waiting: 4, yes: 0, later: 1, no: 1 })).toBe(
      'content.list.verdict.waiting:4 · content.list.verdict.later:1 · content.list.verdict.no:1',
    )
  })
})
