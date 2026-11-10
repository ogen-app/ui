import { describe, expect, it } from 'vitest'
import { workspaceResults } from './assistantWorkspace'

describe('workspaceResults', () => {
  it('is absent when the pack recorded nothing', () => {
    expect(workspaceResults({})).toBeUndefined()
    expect(workspaceResults({ workspace: {} })).toBeUndefined()
  })

  it('reads a range of activity with its days', () => {
    const r = workspaceResults({
      workspace: {
        activityReport: {
          from: '2026-04-14',
          to: '2026-04-20',
          tz: 'Europe/Lisbon',
          published: { total: 9, by_channel: [] },
          failed: {
            total: 1,
            by_channel: [],
            posts: [
              {
                post_id: 'p1',
                platform_id: 'x',
                status: 'failed',
                failure_reason: 'token expired',
              },
            ],
          },
          created: { posts_total: 5, scheduled_total: 4, by_author: [] },
          campaigns_created: { total: 0, campaign_ids: [] },
          days: [
            {
              date: '2026-04-14',
              published_total: 3,
              failed_total: 0,
              created_total: 1,
              campaigns_created_total: 0,
            },
          ],
        },
      },
    })
    expect(r?.activity).toMatchObject({
      from: '2026-04-14',
      published: 9,
      failed: 1,
      created: 5,
      scheduled: 4,
      failedPosts: [{ postId: 'p1', reason: 'token expired' }],
      days: [{ date: '2026-04-14', published: 3 }],
    })
  })

  it('reads the setup, telling an unread allowlist from an empty one', () => {
    const read = (autoPublish: unknown) =>
      workspaceResults({
        workspace: {
          workspaceSetup: {
            timezone: 'Europe/Lisbon',
            autoPublish,
            accounts: [
              {
                id: 'a1',
                platform: 'instagram',
                username: 'villa',
                needsReconnect: true,
                autoPublish: true,
              },
            ],
          },
        },
      })?.setup
    expect(read(null)?.autoPublish).toBeUndefined()
    expect(read([])?.autoPublish).toEqual([])
    expect(read(['instagram'])?.accounts[0]).toMatchObject({
      id: 'a1',
      needsReconnect: true,
      autoPublish: true,
    })
  })

  it('reads the weekly report’s sections', () => {
    const r = workspaceResults({
      workspace: {
        weeklyDigest: {
          from: '2026-04-14',
          to: '2026-04-20',
          empty: false,
          report: {
            headline: 'A steady week',
            lede: 'Nine posts went out.',
            attention: [{ text: 'Instagram needs reconnecting', url: '/x' }],
            publishing: {
              published: { value: '9', delta: '+2', good: true },
              failed: '1',
              failures: [
                {
                  title: 'Easter brunch',
                  meta: 'Instagram',
                  reason: 'Token expired',
                },
              ],
            },
            campaigns: {
              rows: [{ name: 'Spring', goal: '11 of 18', status: 'on track' }],
            },
            team: { summary: 'Marta did most of it.' },
          },
        },
      },
    })
    expect(r?.digest).toMatchObject({
      headline: 'A steady week',
      attention: [{ text: 'Instagram needs reconnecting' }],
      publishing: {
        published: { value: '9', delta: '+2', good: true },
        failed: '1',
        failures: [{ title: 'Easter brunch' }],
      },
      campaigns: { rows: [{ name: 'Spring', met: false }] },
      team: 'Marta did most of it.',
    })
    expect(r?.digest?.performance).toBeUndefined()
  })

  it('reads a post’s history and an auto-publish change', () => {
    const r = workspaceResults({
      workspace: {
        postHistory: {
          postId: 'p1',
          title: 'Easter brunch',
          note: 'Versions saved before people were recorded…',
          entries: [
            {
              at: '2026-04-15T15:42:00Z',
              kind: 'event',
              what: 'scheduled',
              by: 'Marta',
              byId: 'u1',
            },
            {
              at: '2026-04-14T09:00:00Z',
              kind: 'version',
              what: 'saved a version',
              version: 2,
              by: 'the assistant',
              source: 'assistant',
            },
          ],
        },
        setAutoPublish: {
          done: '…',
          autoPublish: ['instagram', 'linkedin'],
          undoId: 'u9',
        },
      },
    })
    expect(r?.history?.unrecorded).toBe(true)
    expect(r?.history?.entries.map((e) => e.kind)).toEqual(['event', 'version'])
    expect(r?.history?.entries[1].version).toBe(2)
    expect(r?.autoPublish).toEqual({
      platforms: ['instagram', 'linkedin'],
      undoId: 'u9',
    })
  })
})
