import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import {
  assetLink,
  formatDuration,
  ideaVerdictKey,
  listDate,
  listTitle,
  rowDates,
  rowState,
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

describe('rowState', () => {
  const row = (
    over: Partial<Parameters<typeof rowState>[0]>,
  ): Parameters<typeof rowState>[0] => ({
    status: 'ready',
    analysis_status: 'ready',
    idea_counts: { waiting: 0, yes: 0, later: 0, no: 0 },
    ...over,
  })

  it('puts a failed file first, whatever else it says', () => {
    expect(
      rowState(row({ status: 'failed', analysis_status: 'running' })),
    ).toBe('failed')
  })

  it('is reading while ingest or analysis is under way, ideas or not', () => {
    expect(rowState(row({ status: 'processing' }))).toBe('reading')
    expect(
      rowState(
        row({
          analysis_status: 'running',
          idea_counts: { waiting: 2, yes: 0, later: 0, no: 0 },
        }),
      ),
    ).toBe('reading')
  })

  it('has ideas once any verdict counts one', () => {
    expect(
      rowState(row({ idea_counts: { waiting: 0, yes: 0, later: 0, no: 3 } })),
    ).toBe('ideas')
  })

  it('found nothing only when an analysis finished', () => {
    expect(rowState(row({}))).toBe('noIdeas')
    expect(rowState(row({ analysis_status: null }))).toBe('unanalysed')
    expect(rowState(row({ analysis_status: 'failed' }))).toBe('unanalysed')
  })
})

describe('rowDates', () => {
  const now = new Date('2026-10-13T12:00:00Z')
  const echo = ((key: string, opts?: { when?: string }) =>
    `${key}(${opts?.when ?? ''})`) as TFunction

  it('says when it was added, and separately when the source was published', () => {
    const { added, published } = rowDates(
      echo,
      {
        published_at: '2026-10-10T12:00:00Z',
        created_at: '2026-10-13T11:00:00Z',
      },
      now,
      'en',
    )
    expect(added?.label).toBe('content.list.addedAgo(1 hour ago)')
    expect(published?.label).toBe('content.list.publishedAgo(3 days ago)')
  })

  it('has no publication date when the source never said, and "just now" inside a minute', () => {
    const { added, published } = rowDates(
      echo,
      { published_at: null, created_at: '2026-10-13T11:59:30Z' },
      now,
      'en',
    )
    expect(added?.label).toBe('content.list.addedAgo(content.list.justNow())')
    expect(published).toBeNull()
  })
})

describe('assetLink', () => {
  it('opens the bank’s copy, or the campaign’s, on a pile when named', () => {
    expect(assetLink({ id: 'a1' }, null, 'waiting')).toEqual({
      to: '/assets/$assetId',
      params: { assetId: 'a1' },
      search: { verdict: 'waiting' },
    })
    expect(assetLink({ id: 'a1' }, 'c1')).toEqual({
      to: '/campaigns/$campaignId/assets/$assetId',
      params: { campaignId: 'c1', assetId: 'a1' },
      search: {},
    })
  })
})

describe('ideaVerdictKey', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  const idea = (
    verdict: 'yes' | 'later' | 'no' | null,
    remind_at: string | null = null,
  ) => ({ verdict, remind_at })

  it('names the pile an idea sits in', () => {
    expect(ideaVerdictKey(idea(null), now)).toBe('waiting')
    expect(ideaVerdictKey(idea('yes'), now)).toBe('yes')
    expect(ideaVerdictKey(idea('no'), now)).toBe('no')
    expect(ideaVerdictKey(idea('later', '2026-11-03T00:00:00Z'), now)).toBe(
      'later',
    )
  })

  it('counts a postponed idea whose day has come as waiting again', () => {
    expect(ideaVerdictKey(idea('later', '2026-10-01T00:00:00Z'), now)).toBe(
      'waiting',
    )
    expect(ideaVerdictKey(idea('later'), now)).toBe('later')
  })
})
