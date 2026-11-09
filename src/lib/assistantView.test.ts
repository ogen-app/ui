import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { chipText, markerText } from './assistantView'
import type { ViewContext } from './viewContext'

const t = i18next.t
const workspace = { kind: 'workspace' } as const

function view(changes: Partial<ViewContext>): ViewContext {
  return {
    version: 1,
    screen: 'ideas',
    scope: { kind: 'workspace' },
    ...changes,
  }
}

describe('chipText', () => {
  it('says what is selected, and where', () => {
    expect(
      chipText(
        t,
        workspace,
        { screen: 'ideas' },
        {
          selection: { kind: 'idea', ids: ['a', 'b', 'c'], count: 3 },
        },
      ),
    ).toBe('3 selected · Ideas')
    expect(
      chipText(
        t,
        workspace,
        { screen: 'ideas' },
        {
          selection: { kind: 'idea', allMatching: true, count: 128 },
        },
      ),
    ).toBe('All 128 matching · Ideas')
  })

  it('says when only the first of a large selection goes', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `i${i}`)
    expect(
      chipText(
        t,
        workspace,
        { screen: 'ideas' },
        {
          selection: { kind: 'idea', ids },
        },
      ),
    ).toBe('First 200 of 250 selected · Ideas')
  })

  it('names an open detail screen', () => {
    expect(
      chipText(
        t,
        workspace,
        { screen: 'asset', focus: { kind: 'asset', id: 'a1' } },
        null,
      ),
    ).toBe('This asset is open')
  })

  it('says nothing about the post its own thread is on', () => {
    expect(
      chipText(
        t,
        { kind: 'post', postId: 'p1', campaignId: 'c1' },
        { screen: 'post', focus: { kind: 'post', id: 'p1' } },
        null,
      ),
    ).toBeNull()
  })

  it('says nothing when there is nothing selected or open', () => {
    expect(
      chipText(t, workspace, { screen: 'ideas' }, { filter: 'pile=yes' }),
    ).toBeNull()
  })
})

describe('markerText', () => {
  it('says where a thread began', () => {
    expect(
      markerText(
        t,
        view({ selection: { kind: 'idea', ids: ['a', 'b', 'c'] } }),
        undefined,
      ),
    ).toBe('On Ideas · 3 selected')
  })

  it('says where it moved, and nothing when it didn’t', () => {
    const ideas = view({})
    expect(markerText(t, view({}), ideas)).toBeNull()
    expect(markerText(t, view({ screen: 'assets' }), ideas)).toBe(
      'Now on Assets',
    )
  })

  it('draws nothing for a turn with no stored view', () => {
    expect(markerText(t, undefined, undefined)).toBeNull()
  })
})
