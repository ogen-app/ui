import { describe, expect, it } from 'vitest'
import { comparePostOrder, postNeighbours } from './postOrder'
import type { Post } from '@/types/posts'

/** Only the two fields the order reads; the rest of a Post is irrelevant here. */
function post(id: string, scheduled_at: string | null): Post {
  return { id, scheduled_at } as Post
}

const ids = (posts: Post[]) => posts.map((p) => p.id)
const sorted = (posts: Post[]) => ids([...posts].sort(comparePostOrder))

describe('comparePostOrder', () => {
  it('runs oldest to newest', () => {
    const posts = [
      post('c', '2026-08-12T09:00:00.000Z'),
      post('a', '2026-08-10T09:00:00.000Z'),
      post('b', '2026-08-11T09:00:00.000Z'),
    ]
    expect(sorted(posts)).toEqual(['a', 'b', 'c'])
  })

  it('puts the unscheduled posts last, after everything with a date', () => {
    const posts = [
      post('none', null),
      post('far', '2099-01-01T00:00:00.000Z'),
      post('near', '2026-08-10T09:00:00.000Z'),
    ]
    expect(sorted(posts)).toEqual(['near', 'far', 'none'])
  })

  it('breaks ties on id, at the same instant and among the unscheduled', () => {
    const sameTime = [
      post('b', '2026-08-10T09:00:00.000Z'),
      post('a', '2026-08-10T09:00:00.000Z'),
    ]
    expect(sorted(sameTime)).toEqual(['a', 'b'])
    expect(sorted([post('b', null), post('a', null)])).toEqual(['a', 'b'])
  })

  it('orders the same however the list arrived', () => {
    // The order is walked one step at a time, so it has to be a total order:
    // any starting arrangement must sort to the same sequence.
    const posts = [
      post('x', '2026-08-10T09:00:00.000Z'),
      post('y', '2026-08-10T09:00:00.000Z'),
      post('z', null),
      post('w', null),
      post('v', '2026-08-09T09:00:00.000Z'),
    ]
    const forwards = sorted(posts)
    expect(sorted([...posts].reverse())).toEqual(forwards)
    expect(forwards).toEqual(['v', 'x', 'y', 'w', 'z'])
  })

  it('treats an unparseable date as no date, not as the epoch', () => {
    const posts = [
      post('bad', 'not-a-date'),
      post('real', '2026-08-10T09:00:00.000Z'),
    ]
    expect(sorted(posts)).toEqual(['real', 'bad'])
  })
})

describe('postNeighbours', () => {
  const posts = [
    post('second', '2026-08-11T09:00:00.000Z'),
    post('first', '2026-08-10T09:00:00.000Z'),
    post('third', null),
  ]

  it('finds the post either side', () => {
    const { previous, next } = postNeighbours(posts, 'second')
    expect(previous?.id).toBe('first')
    expect(next?.id).toBe('third')
  })

  it('has no previous at the start and no next at the end', () => {
    expect(postNeighbours(posts, 'first').previous).toBeNull()
    expect(postNeighbours(posts, 'third').next).toBeNull()
  })

  it('has no neighbours for a post that is not in the list', () => {
    expect(postNeighbours(posts, 'gone')).toEqual({
      previous: null,
      next: null,
    })
    expect(postNeighbours([], 'first')).toEqual({ previous: null, next: null })
  })

  it('leaves the list it was given alone', () => {
    const original = [...posts]
    postNeighbours(posts, 'second')
    expect(posts).toEqual(original)
  })
})
