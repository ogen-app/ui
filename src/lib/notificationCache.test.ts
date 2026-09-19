import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  NOTIFICATION_LIST_KEY,
  NOTIFICATION_UNREAD_KEY,
  cachedNotifications,
  dropNotification,
  highestSeq,
  landChangedNotification,
  landLiveNotification,
  markCachedRead,
  mergeNotification,
} from '@/lib/notificationCache'
import type { AppNotification } from '@/types/notifications'

/**
 * The badge is the thing these rules protect. It is adjusted rather than
 * refetched on every change, so an off-by-one here is a number that stays wrong
 * on screen until something unrelated refreshes it — and a badge people learn
 * not to trust is worse than no badge.
 *
 * So the cases are the double-counting ones: a replayed row arriving twice, a
 * read toggled twice, a dismissal of something already read.
 */

function row(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    seq: 1,
    level: 'info',
    type: 'post.published',
    title: '',
    body: '',
    entity_type: 'post',
    entity_id: 'p1',
    action_url: '',
    data: null,
    read_at: null,
    created_at: '2026-09-03T09:00:00Z',
    expires_at: null,
    ...over,
  }
}

let qc: QueryClient

beforeEach(() => {
  qc = new QueryClient()
})

function seed(rows: AppNotification[], unread: number) {
  qc.setQueryData(NOTIFICATION_LIST_KEY, rows)
  qc.setQueryData(NOTIFICATION_UNREAD_KEY, unread)
}

const unread = () => qc.getQueryData<number>(NOTIFICATION_UNREAD_KEY)

describe('mergeNotification', () => {
  it('keeps the page newest first', () => {
    const rows = mergeNotification(
      [row({ id: 'a', seq: 3 }), row({ id: 'b', seq: 1 })],
      row({ id: 'c', seq: 2 }),
    )
    expect(rows.map((r) => r.id)).toEqual(['a', 'c', 'b'])
  })

  it('replaces a row rather than duplicating it', () => {
    const rows = mergeNotification(
      [row({ id: 'a', seq: 3, title: 'old' })],
      row({ id: 'a', seq: 3, title: 'new' }),
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('new')
  })
})

describe('highestSeq', () => {
  it('is the replay cursor, and nothing when the page is empty', () => {
    expect(highestSeq([])).toBeNull()
    expect(highestSeq([row({ seq: 4 }), row({ id: 'b', seq: 9 })])).toBe(9)
  })
})

describe('landLiveNotification', () => {
  it('counts a new unread row once', () => {
    seed([], 0)

    expect(landLiveNotification(qc, row({ id: 'a', seq: 5 }))).toBe(true)

    expect(unread()).toBe(1)
    expect(cachedNotifications(qc)).toHaveLength(1)
  })

  it('does not count a replayed row a second time', () => {
    // Every reconnect replays from the cursor, so this is the common path, not
    // an edge case: a badge that grew on each drop would be unusable on a train.
    seed([row({ id: 'a', seq: 5 })], 1)

    expect(landLiveNotification(qc, row({ id: 'a', seq: 5 }))).toBe(false)

    expect(unread()).toBe(1)
  })

  it('leaves the badge alone for a row that arrives already read', () => {
    seed([], 0)

    landLiveNotification(qc, row({ id: 'a', seq: 5, read_at: 'now' }))

    expect(unread()).toBe(0)
  })

  it('does not invent a count that has never been read', () => {
    // Nothing has fetched `unread-count` yet. Writing a 1 here would show a
    // badge built from one frame instead of from the inbox.
    qc.setQueryData(NOTIFICATION_LIST_KEY, [])

    landLiveNotification(qc, row({ id: 'a', seq: 5 }))

    expect(unread()).toBeUndefined()
  })
})

describe('landChangedNotification', () => {
  it('spends one off the badge when a row is read', () => {
    seed([row({ id: 'a', seq: 5 })], 3)

    landChangedNotification(qc, row({ id: 'a', seq: 5, read_at: 'now' }))

    expect(unread()).toBe(2)
  })

  it('does not spend a second when the row was already read', () => {
    seed([row({ id: 'a', seq: 5, read_at: 'then' })], 3)

    landChangedNotification(qc, row({ id: 'a', seq: 5, read_at: 'now' }))

    expect(unread()).toBe(3)
  })

  it('gives one back when a row is marked unread again', () => {
    seed([row({ id: 'a', seq: 5, read_at: 'then' })], 3)

    landChangedNotification(qc, row({ id: 'a', seq: 5, read_at: null }))

    expect(unread()).toBe(4)
  })
})

describe('dropNotification', () => {
  it('takes an unread row off the page and the badge', () => {
    seed([row({ id: 'a', seq: 5 }), row({ id: 'b', seq: 4 })], 2)

    dropNotification(qc, 'a')

    expect(cachedNotifications(qc).map((r) => r.id)).toEqual(['b'])
    expect(unread()).toBe(1)
  })

  it('leaves the badge alone when what was dismissed had been read', () => {
    seed([row({ id: 'a', seq: 5, read_at: 'then' })], 2)

    dropNotification(qc, 'a')

    expect(unread()).toBe(2)
  })
})

describe('markCachedRead', () => {
  it('stops at the bound the reader was shown', () => {
    // The row above the bound arrived between the click and the response. It
    // was never on screen, so marking it read would hide it for good.
    seed([row({ id: 'new', seq: 9 }), row({ id: 'seen', seq: 4 })], 2)

    markCachedRead(qc, 5, '2026-09-03T10:00:00Z')

    const rows = cachedNotifications(qc)
    expect(rows.find((r) => r.id === 'new')?.read_at).toBeNull()
    expect(rows.find((r) => r.id === 'seen')?.read_at).toBe(
      '2026-09-03T10:00:00Z',
    )
    expect(unread()).toBe(1)
  })

  it('marks the whole page when there is no bound', () => {
    seed([row({ id: 'a', seq: 9 }), row({ id: 'b', seq: 4 })], 2)

    markCachedRead(qc, null, '2026-09-03T10:00:00Z')

    expect(cachedNotifications(qc).every((r) => r.read_at)).toBe(true)
    expect(unread()).toBe(0)
  })

  it('never takes the badge below zero', () => {
    // The count spans the whole inbox and the page is a slice of it, so the
    // local adjustment is a floor on the truth — it must not go negative while
    // waiting for the server's own answer.
    seed([row({ id: 'a', seq: 9 }), row({ id: 'b', seq: 4 })], 1)

    markCachedRead(qc, null, '2026-09-03T10:00:00Z')

    expect(unread()).toBe(0)
  })
})
