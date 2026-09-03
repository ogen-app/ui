import { describe, expect, it } from 'vitest'
import { assetToPayload } from './assetPayload'
import type { Asset } from '@/types/content'

const asset: Asset = {
  id: 'a1',
  title: 'Clinic exterior',
  content: 'The front of the practice, shot from across the road.',
  status: 'ready',
  type: 'IMG',
  alt_text: 'A single-storey dental practice with a blue awning',
  tag_ids: ['t1', 't2'],
  tags: [],
  created_by: 'u1',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

describe('assetToPayload', () => {
  // The whole reason the helper exists: the PUT replaces the resource, so a
  // payload that names only the title is a payload that untags the asset and
  // blanks its alt text.
  it('carries the fields nobody is changing', () => {
    expect(assetToPayload(asset, { title: 'Clinic front' })).toEqual({
      title: 'Clinic front',
      content: asset.content,
      alt_text: asset.alt_text,
      tag_ids: ['t1', 't2'],
    })
  })

  it('writes back what it was given when nothing is overridden', () => {
    expect(assetToPayload(asset)).toEqual({
      title: asset.title,
      content: asset.content,
      alt_text: asset.alt_text,
      tag_ids: asset.tag_ids,
    })
  })

  // An image's description may legitimately be empty, and so may its alt text —
  // an override has to be able to clear one, not be treated as absent.
  it('lets an override empty a field', () => {
    expect(assetToPayload(asset, { alt_text: '', content: '' })).toMatchObject({
      alt_text: '',
      content: '',
    })
  })
})
