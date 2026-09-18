import { beforeEach, describe, expect, it } from 'vitest'
import {
  stubCaptureIdea,
  stubDeleteIdea,
  stubEditIdea,
  stubListIdeas,
  stubSetVerdict,
} from './ideas.stub'

/**
 * The stub, tested for the two rules it is standing in for.
 *
 * Most of what is in `ideas.stub.ts` is scaffolding not worth a test — it will
 * be deleted the day `/api/ideas` answers. These two are different: they are
 * the behaviours the *contract* requires, written down here so the day the
 * real endpoints land there is an executable statement of what they have to do
 * rather than a paragraph in a doc comment. `emailPreferences.test.ts` exists
 * for the same reason.
 */

beforeEach(() => localStorage.clear())

async function capture(title: string) {
  return stubCaptureIdea({ title, note: '', campaign_id: null })
}

describe('capture', () => {
  it('files an idea as a question, with nothing decided about it', async () => {
    const idea = await capture('A teardown of our own onboarding')
    expect(idea.verdict).toBeNull()
    expect(idea.decided_at).toBeNull()
    expect(idea.remind_at).toBeNull()
    expect(await stubListIdeas(null)).toHaveLength(1)
  })

  it('narrows the list to one campaign when asked', async () => {
    await capture('Workspace-wide')
    await stubCaptureIdea({
      title: 'For the launch',
      note: '',
      campaign_id: 'camp_1',
    })
    expect(await stubListIdeas('camp_1')).toHaveLength(1)
    expect(await stubListIdeas(null)).toHaveLength(2)
  })
})

describe('editing', () => {
  /*
   * Presence-aware, as the contract says: `undefined` leaves a field alone and
   * `''` replaces it. A blanket `edit.note ?? stored.note` makes the two the
   * same thing, which is how clearing a note silently stops working.
   */
  it('leaves out what the payload leaves out, and clears what it sends empty', async () => {
    const created = await capture('Original')
    const withNote = await stubEditIdea(created.id, { note: 'Some detail' })
    expect(withNote.title).toBe('Original')
    expect(withNote.note).toBe('Some detail')

    const renamed = await stubEditIdea(created.id, { title: 'Renamed' })
    expect(renamed.note).toBe('Some detail')

    const cleared = await stubEditIdea(created.id, { note: '' })
    expect(cleared.note).toBe('')
    expect(cleared.title).toBe('Renamed')
  })

  it('refuses an id it does not hold, the way a 404 would', async () => {
    await expect(stubEditIdea('nope', { title: 'x' })).rejects.toThrow()
  })
})

describe('verdicts', () => {
  it('keeps the wake-up on a postponement', async () => {
    const created = await capture('Not yet')
    const postponed = await stubSetVerdict(created.id, {
      verdict: 'later',
      remind_at: '2026-10-17T09:00:00.000Z',
    })
    expect(postponed.remind_at).toBe('2026-10-17T09:00:00.000Z')
    expect(postponed.decided_at).not.toBeNull()
  })

  /*
   * The server-side half of the rule in `lib/ideas.decideIdea`, and the reason
   * it is asserted twice: a wake-up that outlives its postponement pulls the
   * idea back out of the archive on a day nobody chose, and the client agreeing
   * about that is not the same as the store agreeing.
   */
  it('clears the wake-up when the verdict is no longer a postponement', async () => {
    const created = await capture('Not yet')
    await stubSetVerdict(created.id, {
      verdict: 'later',
      remind_at: '2026-10-17T09:00:00.000Z',
    })
    const archived = await stubSetVerdict(created.id, {
      verdict: 'no',
      remind_at: '2026-10-17T09:00:00.000Z',
    })
    expect(archived.remind_at).toBeNull()
  })

  it('sends an idea back to the inbox on a null verdict', async () => {
    const created = await capture('Reconsidered')
    await stubSetVerdict(created.id, { verdict: 'yes', remind_at: null })
    const back = await stubSetVerdict(created.id, {
      verdict: null,
      remind_at: null,
    })
    expect(back.verdict).toBeNull()
    expect(back.decided_at).toBeNull()
  })
})

describe('deleting', () => {
  it('takes the row out for good', async () => {
    const created = await capture('Gone')
    await stubDeleteIdea(created.id)
    expect(await stubListIdeas(null)).toEqual([])
  })
})

describe('the store', () => {
  // No tab pin in a test, which is the `unpinned` bucket — see `storageKey`.
  const KEY = 'stub-ideas:unpinned'

  it('reads back what it wrote, and skips a row it cannot read', async () => {
    const good = await capture('Readable')
    const rows = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
    expect(rows).toHaveLength(1)

    // A row from an older shape of this feature. Losing one idea is better than
    // a screen that will not render — the same contract `parseTasks` has.
    localStorage.setItem(KEY, JSON.stringify([...rows, { id: 'broken' }]))
    const listed = await stubListIdeas(null)
    expect(listed.map((idea) => idea.id)).toEqual([good.id])
  })

  it('has nothing to list when the row holds something else entirely', async () => {
    localStorage.setItem(KEY, 'not json')
    expect(await stubListIdeas(null)).toEqual([])
  })
})
