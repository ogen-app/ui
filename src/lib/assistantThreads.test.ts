import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import type { ThreadSummary } from '@/services/api/assistant'
import type { AssistantThread, ThreadSubject } from '@/types/assistant'
import {
  lastActivityText,
  mergeThreadRows,
  showsSummary,
} from './assistantThreads'

const campaign = (id: string): ThreadSubject => ({
  kind: 'campaign',
  campaignId: id,
})
const post = (id: string, campaignId: string): ThreadSubject => ({
  kind: 'post',
  postId: id,
  campaignId,
})

function summary(
  subject: ThreadSubject,
  lastMessageAt: string,
  changes: Partial<ThreadSummary> = {},
): ThreadSummary {
  return {
    subject,
    title: 'Listed',
    campaignTitle: 'Listed campaign',
    lastMessageAt,
    preview: 'Last words.',
    ...changes,
  }
}

function live(
  id: string,
  subject: ThreadSubject,
  changes: Partial<AssistantThread> = {},
): AssistantThread {
  return {
    id,
    subject,
    title: '',
    campaignTitle: '',
    turns: [],
    status: 'idle',
    runStartedAt: null,
    lastActiveAt: null,
    unread: false,
    loaded: false,
    streamedPosts: [],
    ...changes,
  }
}

describe('mergeThreadRows', () => {
  it('lists the server’s threads newest first, one row per thread', () => {
    const rows = mergeThreadRows(
      {},
      [
        summary(campaign('c1'), '2026-11-01T10:00:00Z'),
        summary({ kind: 'workspace' }, '2026-11-08T10:00:00Z'),
        summary(campaign('c1'), '2026-11-02T10:00:00Z'),
      ],
      null,
    )
    expect(rows.map((r) => r.id)).toEqual(['workspace', 'campaign:c1'])
  })

  it('lets the tab’s live copy win, keeping the server’s names when it has none', () => {
    const rows = mergeThreadRows(
      {
        'campaign:c1': live('campaign:c1', campaign('c1'), {
          status: 'running',
          lastActiveAt: Date.parse('2026-11-09T10:00:00Z'),
        }),
      },
      [
        summary(campaign('c1'), '2026-11-01T10:00:00Z', { title: 'Launch' }),
        summary(campaign('c2'), '2026-11-05T10:00:00Z'),
      ],
      null,
    )
    expect(rows[0]).toMatchObject({
      id: 'campaign:c1',
      title: 'Launch',
      live: { status: 'running' },
    })
    expect(rows[1].id).toBe('campaign:c2')
  })

  it('opens on the current subject, then the rest of its campaign', () => {
    const rows = mergeThreadRows(
      { 'post:p1': live('post:p1', post('p1', 'c1')) },
      [
        summary({ kind: 'workspace' }, '2026-11-08T10:00:00Z'),
        summary(campaign('c1'), '2026-11-01T10:00:00Z'),
        summary(campaign('c2'), '2026-11-07T10:00:00Z'),
      ],
      'post:p1',
    )
    expect(rows.map((r) => r.id)).toEqual([
      'post:p1',
      'campaign:c1',
      'workspace',
      'campaign:c2',
    ])
  })
})

describe('showsSummary', () => {
  it('states the server’s last message until the tab has turns of its own', () => {
    const [row] = mergeThreadRows(
      { 'campaign:c1': live('campaign:c1', campaign('c1')) },
      [summary(campaign('c1'), '2026-11-01T10:00:00Z')],
      null,
    )
    expect(showsSummary(row)).toBe(true)
    const [opened] = mergeThreadRows(
      {
        'campaign:c1': live('campaign:c1', campaign('c1'), {
          turns: [{ id: 'u', role: 'user', content: 'Hi' }],
        }),
      },
      [summary(campaign('c1'), '2026-11-01T10:00:00Z')],
      null,
    )
    expect(showsSummary(opened)).toBe(false)
  })
})

describe('lastActivityText', () => {
  const now = new Date('2026-11-09T12:00:00Z')
  it('says "just now" under a minute, and a distance after', () => {
    expect(lastActivityText(i18next.t, '2026-11-09T11:59:30Z', now, 'en')).toBe(
      'just now',
    )
    expect(lastActivityText(i18next.t, '2026-11-09T11:55:00Z', now, 'en')).toBe(
      '5 minutes ago',
    )
    expect(lastActivityText(i18next.t, '', now, 'en')).toBeNull()
  })
})
