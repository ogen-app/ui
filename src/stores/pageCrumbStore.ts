import { create } from 'zustand'

/**
 * A document page's title, for the bar over the page once the page's own
 * header has scrolled away. Written by `PageHeader` with `scrollAway`, read by
 * `TopBar`.
 *
 * Token-guarded like the assistant's page: a page unmounting late must not
 * clear its successor's crumb, so only the page that showed a crumb can hide
 * it.
 */
export type PageCrumb = {
  title: string
  /** Scrolls the page back to its header. */
  toTop: () => void
}

type PageCrumbState = {
  crumb: PageCrumb | null
  owner: symbol | null
  show: (owner: symbol, crumb: PageCrumb) => void
  hide: (owner: symbol) => void
}

export const usePageCrumbStore = create<PageCrumbState>((set) => ({
  crumb: null,
  owner: null,
  show: (owner, crumb) =>
    set((state) =>
      state.owner === owner && state.crumb?.title === crumb.title
        ? {}
        : { owner, crumb },
    ),
  hide: (owner) =>
    set((state) => (state.owner === owner ? { owner: null, crumb: null } : {})),
}))
