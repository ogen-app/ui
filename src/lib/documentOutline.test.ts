import { describe, expect, it } from 'vitest'
import type { AssetChunk } from '@/types/content'
import { documentOutline } from './documentOutline'

const chunk = (
  i: number,
  label: string | null,
  content: string,
  anchor?: AssetChunk['source_anchor'],
): AssetChunk => ({
  id: `c${i}`,
  asset_id: 'a1',
  chunk_index: i,
  page_start: 0,
  page_end: 0,
  source_label: label,
  source_anchor: anchor,
  content,
  token_count: 10,
})

describe('documentOutline', () => {
  it('numbers a deck by its slide titles', () => {
    expect(
      documentOutline([
        chunk(
          0,
          'Slides 1-2',
          'Slide 1\nQ3 launch\nAgenda\n\nSlide 2\nWhy now',
          {
            kind: 'slide',
            slide: 1,
          },
        ),
        chunk(1, 'Slide 3', 'Slide 3\n\nPricing'),
      ]),
    ).toEqual({
      kind: 'slides',
      items: [
        { text: 'Q3 launch', depth: 0, number: 1 },
        { text: 'Why now', depth: 0, number: 2 },
        { text: 'Pricing', depth: 0, number: 3 },
      ],
    })
  })

  it('lists headings in order, indented by depth, once each', () => {
    expect(
      documentOutline([
        chunk(0, 'Plan › Audience', 'x', {
          kind: 'section',
          heading_path: ['Plan', 'Audience'],
        }),
        chunk(1, 'Plan › Audience', 'y'),
        chunk(2, 'Plan › Channels', 'z'),
        chunk(3, 'Budget', 'w'),
      ])?.items,
    ).toEqual([
      { text: 'Plan', depth: 0 },
      { text: 'Audience', depth: 1 },
      { text: 'Channels', depth: 1 },
      { text: 'Budget', depth: 0 },
    ])
  })

  it('has nothing to say about a document with no structure', () => {
    expect(documentOutline([chunk(0, null, 'Just text.')])).toBeNull()
    expect(documentOutline([])).toBeNull()
  })

  it('stops at the cap', () => {
    const chunks = Array.from({ length: 12 }, (_, i) =>
      chunk(i, `Heading ${i}`, 'x'),
    )
    expect(documentOutline(chunks, 5)?.items).toHaveLength(5)
  })
})
