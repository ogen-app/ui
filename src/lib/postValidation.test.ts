import { describe, expect, it } from 'vitest'
import {
  checksSummary,
  foldChecks,
  worstStatus,
  type CheckStatus,
  type PostCheck,
} from './postValidation.ts'

function check(status: CheckStatus, id: string = status): PostCheck {
  return { id, label: id, status }
}

/** The check set a healthy LinkedIn text post actually produces. */
const HEALTHY_TEXT_POST: PostCheck[] = [
  { id: 'platform', label: 'Platform', status: 'pass', detail: 'LinkedIn' },
  { id: 'post-type', label: 'Post type', status: 'pass', detail: 'Text post' },
  { id: 'content', label: 'Copy', status: 'pass' },
  {
    id: 'char-limit',
    label: 'Length',
    status: 'pass',
    detail: '1,787 / 3,000 characters',
  },
]

describe('worstStatus', () => {
  it('ranks fail above warn above pending', () => {
    expect(worstStatus([check('pass'), check('warn'), check('fail')])).toBe('fail')
    expect(worstStatus([check('pass'), check('pending'), check('warn')])).toBe('warn')
    expect(worstStatus([check('pass'), check('pending')])).toBe('pending')
    expect(worstStatus([check('pass')])).toBe('pass')
  })

  it('calls an empty check set a pass', () => {
    expect(worstStatus([])).toBe('pass')
  })
})

describe('foldChecks', () => {
  it('reduces a healthy post to the one row that measures something', () => {
    const { heading, rows } = foldChecks(HEALTHY_TEXT_POST)
    expect(heading).toBe('LinkedIn Text post requirements')
    expect(rows.map((r) => r.id)).toEqual(['char-limit'])
  })

  it('keeps a folded check as a row the moment it stops passing', () => {
    // A failing platform carries the only thing worth reading — "Pick a
    // platform" — so folding it away would hide the instruction. With no
    // platform there is nothing to name, and the post type alone would make a
    // heading that reads as if it were the platform.
    const { heading, rows } = foldChecks([
      { id: 'platform', label: 'Platform', status: 'fail', detail: 'Pick a platform' },
      { id: 'post-type', label: 'Post type', status: 'pass', detail: 'Text post' },
    ])
    expect(heading).toBe('Platform requirements')
    expect(rows.map((r) => r.id)).toEqual(['platform'])
  })

  it('names the platform alone when the post type is unpicked', () => {
    const { heading } = foldChecks([
      { id: 'platform', label: 'Platform', status: 'pass', detail: 'LinkedIn' },
      { id: 'post-type', label: 'Post type', status: 'fail', detail: 'Pick a post type' },
    ])
    expect(heading).toBe('LinkedIn requirements')
  })

  it('keeps a detail-less check that fails or warns', () => {
    const rows = foldChecks([{ id: 'content', label: 'Copy', status: 'fail' }]).rows
    expect(rows.map((r) => r.id)).toEqual(['content'])
  })

  it('never folds or drops a warning', () => {
    const warned: PostCheck[] = [
      { id: 'media-count', label: 'Media', status: 'warn', detail: '3 attached' },
      { id: 'media-rule-0', label: 'Media rules', status: 'warn', detail: 'GIFs are static' },
    ]
    expect(foldChecks([...HEALTHY_TEXT_POST, ...warned]).rows.map((r) => r.id)).toEqual([
      'char-limit',
      'media-count',
      'media-rule-0',
    ])
  })

  it('keeps a pending check, which has a result still to report', () => {
    const rows = foldChecks([
      { id: 'platform', label: 'Platform', status: 'pass', detail: 'LinkedIn' },
      { id: 'media-count', label: 'Media', status: 'pending', detail: 'Checking…' },
    ]).rows
    expect(rows.map((r) => r.id)).toEqual(['media-count'])
  })

  it('falls back to the generic heading when neither setting is settled', () => {
    expect(foldChecks([check('fail', 'platform'), check('fail', 'post-type')]).heading).toBe(
      'Platform requirements',
    )
  })
})

describe('checksSummary', () => {
  it('states the requirements are met when everything passes', () => {
    expect(checksSummary([check('pass', 'a'), check('pass', 'b')])).toBe(
      'Post meets platform requirements',
    )
  })

  it('drops the verdict once there is work to name', () => {
    // The icon already carries "something is wrong". Repeating it in words
    // would push the count — the only part that says what to do — toward the
    // end of a line that truncates.
    expect(checksSummary([check('pass', 'a'), check('warn', 'b')])).toBe('1 issue to look at')
    expect(checksSummary([check('fail', 'a'), check('pass', 'b')])).toBe('1 issue to fix')
  })

  it('counts failures and warnings separately', () => {
    expect(checksSummary([check('fail', 'a'), check('fail', 'b'), check('warn', 'c')])).toBe(
      '2 issues to fix, 1 to look at',
    )
  })

  it('pluralises on the count, not on the status', () => {
    expect(checksSummary([check('warn', 'a'), check('warn', 'b')])).toBe(
      '2 issues to look at',
    )
  })

  it('asks for a platform instead of counting rules no platform set', () => {
    // Every other check falls back to a default when the platform is unpicked,
    // so a count here would be reporting some other platform's rules as this
    // post's — and it would change the moment one is chosen.
    expect(
      checksSummary([
        { id: 'platform', label: 'Platform', status: 'fail', detail: 'Pick a platform' },
        check('fail', 'post-type'),
        check('warn', 'char-limit'),
      ]),
    ).toBe('Select platform to see requirements')
  })

  it('withholds a verdict while a check is still loading', () => {
    expect(checksSummary([check('pass', 'a'), check('pending', 'b')])).toBe(
      'Checking this post…',
    )
  })

  it('reports a definite failure even with another check still loading', () => {
    // `worstStatus` ranks fail above pending, and the copy follows it: what is
    // already known to be broken is worth saying now, and the pending check
    // can only ever add to the count, never clear it.
    expect(checksSummary([check('fail', 'a'), check('pending', 'b')])).toBe('1 issue to fix')
  })
})
