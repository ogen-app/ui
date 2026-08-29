import { describe, expect, it } from 'vitest'

import {
  MAX_SEQUENCE_ITEMS,
  assignAttachment,
  attachmentsByItem,
  contentFromItems,
  evaluateSequence,
  insertItemAfter,
  isSequencePost,
  itemsFromContent,
  moveItem,
  newThreadItem,
  ownerIndex,
  parseThreadItems,
  reconcileItems,
  removeItem,
  sequenceHasIssues,
  supportsSequence,
  type ThreadItem,
} from './threadSequence.ts'

function att(id: string, mime = 'image/jpeg') {
  return { id, mime_type: mime }
}

/** Items with predictable ids, so assertions can name them. */
function items(...contents: string[]): ThreadItem[] {
  return contents.map((content, i) => ({
    id: `item-${i}`,
    content,
    attachment_ids: [],
  }))
}

describe('supportsSequence / isSequencePost', () => {
  it('covers the two networks Zernio takes threadItems for', () => {
    expect(supportsSequence('twitter')).toBe(true)
    expect(supportsSequence('threads')).toBe(true)
    expect(supportsSequence('linkedin')).toBe(false)
    expect(supportsSequence('instagram')).toBe(false)
    expect(supportsSequence(undefined)).toBe(false)
  })

  it('is the pair, not either half', () => {
    expect(isSequencePost('twitter', 'thread')).toBe(true)
    expect(isSequencePost('twitter', 'text-post')).toBe(false)
    expect(isSequencePost('linkedin', 'thread')).toBe(false)
  })
})

describe('itemsFromContent', () => {
  it('splits at blank lines, the convention the preview already drew', () => {
    const result = itemsFromContent('First post\n\nSecond post\n\nThird')
    expect(result.map((i) => i.content)).toEqual([
      'First post',
      'Second post',
      'Third',
    ])
  })

  it('keeps single newlines inside one post', () => {
    const result = itemsFromContent('One line\nstill the same post')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('One line\nstill the same post')
  })

  it('seeds an empty body as one empty post, never as nothing', () => {
    expect(itemsFromContent('')).toHaveLength(1)
    expect(itemsFromContent('   \n\n  ')).toHaveLength(1)
    expect(itemsFromContent('')[0].content).toBe('')
  })

  it('stops at the cap', () => {
    const body = Array.from({ length: 40 }, (_, i) => `p${i}`).join('\n\n')
    expect(itemsFromContent(body)).toHaveLength(MAX_SEQUENCE_ITEMS)
  })

  it('round-trips through contentFromItems', () => {
    const body = 'First post\n\nSecond post'
    expect(contentFromItems(itemsFromContent(body))).toBe(body)
  })

  it('drops empty posts from the display copy', () => {
    const seq = items('First', '', 'Third')
    expect(contentFromItems(seq)).toBe('First\n\nThird')
  })
})

describe('parseThreadItems', () => {
  it('reads back what was written', () => {
    const seq = items('a', 'b')
    expect(parseThreadItems(JSON.stringify(seq))).toEqual(seq)
  })

  it('treats nothing, junk and an empty list alike as never-written', () => {
    expect(parseThreadItems(null)).toBeNull()
    expect(parseThreadItems('')).toBeNull()
    expect(parseThreadItems('not json')).toBeNull()
    expect(parseThreadItems('[]')).toBeNull()
    expect(parseThreadItems('{"content":"a"}')).toBeNull()
  })

  it('repairs entries rather than dropping the sequence', () => {
    const parsed = parseThreadItems('[{"content":"a"},{"id":"x"},7]')
    expect(parsed).toHaveLength(2)
    expect(parsed?.[0].id).toBeTruthy()
    expect(parsed?.[0].attachment_ids).toEqual([])
    expect(parsed?.[1].content).toBe('')
  })
})

describe('attachmentsByItem', () => {
  it('gives the root every attachment no item names', () => {
    const seq = items('a', 'b')
    const buckets = attachmentsByItem(seq, [att('1'), att('2')])
    expect(buckets[0].map((a) => a.id)).toEqual(['1', '2'])
    expect(buckets[1]).toEqual([])
  })

  it('honours a named id on a later item', () => {
    const seq = items('a', 'b')
    seq[1].attachment_ids = ['2']
    const buckets = attachmentsByItem(seq, [att('1'), att('2')])
    expect(buckets[0].map((a) => a.id)).toEqual(['1'])
    expect(buckets[1].map((a) => a.id)).toEqual(['2'])
  })

  it('keeps the item’s own order for named ids', () => {
    const seq = items('a')
    seq[0].attachment_ids = ['2', '1']
    const buckets = attachmentsByItem(seq, [att('1'), att('2')])
    expect(buckets[0].map((a) => a.id)).toEqual(['2', '1'])
  })

  it('ignores ids for attachments that are gone', () => {
    const seq = items('a', 'b')
    seq[1].attachment_ids = ['missing']
    const buckets = attachmentsByItem(seq, [att('1')])
    expect(buckets[0].map((a) => a.id)).toEqual(['1'])
    expect(buckets[1]).toEqual([])
  })
})

describe('ownerIndex / assignAttachment', () => {
  it('reports the root for an unnamed attachment', () => {
    expect(ownerIndex(items('a', 'b'), '1')).toBe(0)
  })

  it('moves an attachment between items, never leaving two owners', () => {
    let seq = items('a', 'b', 'c')
    seq = assignAttachment(seq, '1', 2)
    expect(ownerIndex(seq, '1')).toBe(2)
    seq = assignAttachment(seq, '1', 1)
    expect(seq[2].attachment_ids).toEqual([])
    expect(seq[1].attachment_ids).toEqual(['1'])
  })

  it('names an attachment on the root rather than unnaming it', () => {
    let seq = items('a', 'b')
    seq = assignAttachment(seq, '1', 1)
    seq = assignAttachment(seq, '1', 0)
    expect(seq[0].attachment_ids).toEqual(['1'])
  })

  it('ignores an index outside the chain', () => {
    const seq = items('a')
    expect(assignAttachment(seq, '1', 3)).toBe(seq)
  })
})

describe('reconcileItems', () => {
  it('drops ids whose attachment is gone', () => {
    const seq = items('a')
    seq[0].attachment_ids = ['1', 'gone']
    expect(reconcileItems(seq, [att('1')])[0].attachment_ids).toEqual(['1'])
  })

  it('gives a duplicated id to the first item that claims it', () => {
    const seq = items('a', 'b')
    seq[0].attachment_ids = ['1']
    seq[1].attachment_ids = ['1']
    const result = reconcileItems(seq, [att('1')])
    expect(result[0].attachment_ids).toEqual(['1'])
    expect(result[1].attachment_ids).toEqual([])
  })

  it('returns the very same array when there is nothing to fix', () => {
    const seq = items('a')
    seq[0].attachment_ids = ['1']
    // Identity, not equality: this runs on every render, and a fresh array
    // would re-run every memo downstream of it.
    expect(reconcileItems(seq, [att('1')])).toBe(seq)
  })
})

describe('moveItem / insertItemAfter / removeItem', () => {
  it('moves a post through the chain', () => {
    const seq = items('a', 'b', 'c')
    expect(moveItem(seq, 2, 0).map((i) => i.content)).toEqual(['c', 'a', 'b'])
    expect(moveItem(seq, 0, 2).map((i) => i.content)).toEqual(['b', 'c', 'a'])
  })

  it('ignores a move that goes nowhere or off the end', () => {
    const seq = items('a', 'b')
    expect(moveItem(seq, 1, 1)).toBe(seq)
    expect(moveItem(seq, 0, 5)).toBe(seq)
    expect(moveItem(seq, -1, 0)).toBe(seq)
  })

  it('inserts an empty post after the one asked for', () => {
    const seq = insertItemAfter(items('a', 'b'), 0)
    expect(seq.map((i) => i.content)).toEqual(['a', '', 'b'])
  })

  it('refuses to insert past the cap', () => {
    const seq = Array.from({ length: MAX_SEQUENCE_ITEMS }, () =>
      newThreadItem('x'),
    )
    expect(insertItemAfter(seq, 0)).toBe(seq)
  })

  it('hands a removed post’s attachments to the one that replaces it', () => {
    const seq = items('a', 'b', 'c')
    seq[1].attachment_ids = ['1']
    const result = removeItem(seq, 1)
    expect(result.map((i) => i.content)).toEqual(['a', 'c'])
    expect(result[1].attachment_ids).toEqual(['1'])
  })

  it('hands the last post’s attachments backwards', () => {
    const seq = items('a', 'b')
    seq[1].attachment_ids = ['1']
    expect(removeItem(seq, 1)[0].attachment_ids).toEqual(['1'])
  })

  it('empties the only post rather than leaving no chain', () => {
    const result = removeItem(items('a'), 0)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('')
  })
})

describe('evaluateSequence', () => {
  const limits = { charLimit: 280, imageCap: 4, videoCap: 1 }

  it('measures each post against the limit, not the whole body', () => {
    const seq = items('x'.repeat(200), 'y'.repeat(200))
    const reports = evaluateSequence({ ...limits, items: seq, attachments: [] })
    expect(sequenceHasIssues(reports)).toBe(false)
    expect(reports.map((r) => r.count)).toEqual([200, 200])
  })

  it('names the post that is over, by its position in the chain', () => {
    const seq = items('short', 'y'.repeat(300), 'also short')
    const reports = evaluateSequence({ ...limits, items: seq, attachments: [] })
    const over = reports.filter((r) => r.issues.includes('over-limit'))
    expect(over.map((r) => r.position)).toEqual([2])
  })

  it('counts code points, so an emoji is one character', () => {
    const reports = evaluateSequence({
      ...limits,
      items: items('👍👍'),
      attachments: [],
    })
    expect(reports[0].count).toBe(2)
  })

  it('applies the image cap per post', () => {
    const seq = items('a', 'b')
    seq[1].attachment_ids = ['1', '2', '3', '4', '5']
    const reports = evaluateSequence({
      ...limits,
      items: seq,
      attachments: ['1', '2', '3', '4', '5'].map((id) => att(id)),
    })
    expect(reports[0].issues).toEqual([])
    expect(reports[1].issues).toContain('too-many-images')
    expect(reports[1].images).toBe(5)
  })

  it('applies the one-video cap per post', () => {
    const seq = items('a')
    const reports = evaluateSequence({
      ...limits,
      items: seq,
      attachments: [att('1', 'video/mp4'), att('2', 'video/mp4')],
    })
    expect(reports[0].videos).toBe(2)
    expect(reports[0].issues).toContain('too-many-videos')
  })

  it('calls an empty post empty only when it carries nothing either', () => {
    const withImage = items('')
    withImage[0].attachment_ids = ['1']
    expect(
      evaluateSequence({ ...limits, items: withImage, attachments: [att('1')] })[0]
        .issues,
    ).toEqual([])
    expect(
      evaluateSequence({ ...limits, items: items(''), attachments: [] })[0].issues,
    ).toEqual(['empty'])
  })

  it('says nothing while the limits are still loading', () => {
    const reports = evaluateSequence({
      items: items('x'.repeat(5000)),
      attachments: [],
      charLimit: undefined,
      imageCap: undefined,
      videoCap: undefined,
    })
    expect(reports[0].issues).toEqual([])
  })
})
