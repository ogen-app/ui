import { create } from 'zustand'

/**
 * Where a document page is scrolled to, for the bar over the page: its title
 * once its own header has scrolled away, and the card being read
 * ("Strategy › Voice"). Written by `PageHeader` with `scrollAway`, read by
 * `TopBar`.
 *
 * Token-guarded like the assistant's page: a page unmounting late must not
 * clear its successor's crumb, so only the page that showed a crumb can hide
 * it.
 */
export type PageCrumb = {
  title: string
  /** The card at the top of the scroller, by its heading; null above the first. */
  section: string | null
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
      state.owner === owner &&
      state.crumb?.title === crumb.title &&
      state.crumb?.section === crumb.section
        ? {}
        : { owner, crumb },
    ),
  hide: (owner) =>
    set((state) => (state.owner === owner ? { owner: null, crumb: null } : {})),
}))
