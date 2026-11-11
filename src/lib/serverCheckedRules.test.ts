import { describe, expect, it } from 'vitest'
import type { AttentionItem } from './campaignReadiness'
import { withoutServerChecked } from './serverCheckedRules'

const item = (id: string) => ({ id }) as AttentionItem

describe('withoutServerChecked', () => {
  const items = [
    item('channel-dropped'),
    item('channel-dropped-scheduled'),
    item('post-type-dropped'),
    item('brief-empty'),
  ]

  it('drops what the server checks once it has answered', () => {
    expect(withoutServerChecked(items, true).map((i) => i.id)).toEqual([
      // Scheduled posts on a dropped platform stay an alert of ours (CON-468).
      'channel-dropped-scheduled',
      'brief-empty',
    ])
  })

  it('keeps every rule until it has', () => {
    expect(withoutServerChecked(items, false)).toEqual(items)
  })
})
