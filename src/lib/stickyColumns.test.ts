import { describe, expect, it } from 'vitest'
import { stickyColumns } from './stickyColumns'

const screen = { viewport: 900, top: 16, bottom: 96 }

describe('stickyColumns', () => {
  it('leaves a left column that fits pinned, and nothing else', () => {
    expect(stickyColumns({ ...screen, left: 600, right: 2500 })).toEqual({
      rightTop: null,
      rowMinHeight: null,
    })
  })

  it('holds a longer reading by its foot while a tall left column shows its own', () => {
    // 1200 against 788 of room: 412 more to show once the reading has ended.
    expect(stickyColumns({ ...screen, left: 1200, right: 2500 })).toEqual({
      rightTop: 900 - 96 - 2500,
      rowMinHeight: 2500 + 412,
    })
  })

  it('scrolls as one when the reading is the shorter', () => {
    expect(stickyColumns({ ...screen, left: 1200, right: 800 })).toEqual({
      rightTop: null,
      rowMinHeight: null,
    })
  })

  it('scrolls as one when the columns are as tall as each other', () => {
    expect(stickyColumns({ ...screen, left: 1200, right: 1200 })).toEqual({
      rightTop: null,
      rowMinHeight: null,
    })
  })

  it('takes a left column exactly the room as fitting', () => {
    expect(
      stickyColumns({ ...screen, left: 900 - 16 - 96, right: 2500 }),
    ).toEqual({ rightTop: null, rowMinHeight: null })
  })
})
