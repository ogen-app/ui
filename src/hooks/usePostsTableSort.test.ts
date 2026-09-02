import { describe, expect, it } from 'vitest'
import { DEFAULT_POSTS_SORT, parsePostsSort } from './usePostsTableSort'

/**
 * The stored value is the one input to this feature that nothing in the app
 * controls: it survives deploys, it is editable by hand through
 * `PUT /api/settings/:key`, and it is read back into the table's whole
 * ordering. So the parser is where the tests are.
 */
describe('parsePostsSort', () => {
  it('defaults to schedule date, earliest first, when nothing is stored', () => {
    expect(parsePostsSort(null)).toEqual([{ id: 'scheduled_at', desc: false }])
    expect(parsePostsSort(null)).toEqual(DEFAULT_POSTS_SORT)
  })

  it('reads back an order the user chose', () => {
    expect(parsePostsSort('[{"id":"title","desc":true}]')).toEqual([
      { id: 'title', desc: true },
    ])
  })

  it('falls back rather than sorting by a column this build does not have', () => {
    // A renamed or dropped column must not leave the table ordered by nothing
    // while its header shows no sort indicator.
    expect(parsePostsSort('[{"id":"author","desc":false}]')).toEqual(
      DEFAULT_POSTS_SORT,
    )
  })

  it('drops only the unrecognised entries from a mixed order', () => {
    expect(
      parsePostsSort(
        '[{"id":"status","desc":false},{"id":"author","desc":true}]',
      ),
    ).toEqual([{ id: 'status', desc: false }])
  })

  it('refuses entries of the wrong shape', () => {
    expect(parsePostsSort('[{"id":"title"}]')).toEqual(DEFAULT_POSTS_SORT)
    expect(parsePostsSort('[{"id":"title","desc":"yes"}]')).toEqual(
      DEFAULT_POSTS_SORT,
    )
    expect(parsePostsSort('[null]')).toEqual(DEFAULT_POSTS_SORT)
  })

  it('survives a value that is not a sorting state at all', () => {
    // Hand-edited, half-written, or left over from an older shape. None of it
    // may take the campaign's post list down.
    expect(parsePostsSort('not json')).toEqual(DEFAULT_POSTS_SORT)
    expect(parsePostsSort('{"id":"title","desc":false}')).toEqual(
      DEFAULT_POSTS_SORT,
    )
    expect(parsePostsSort('[]')).toEqual(DEFAULT_POSTS_SORT)
    expect(parsePostsSort('""')).toEqual(DEFAULT_POSTS_SORT)
  })
})
