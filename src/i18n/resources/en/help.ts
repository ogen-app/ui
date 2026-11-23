/**
 * The help drawer's own chrome (CON-173) — and only that.
 *
 * Article titles and prose are **content**, not catalogue entries: they live
 * in the CMS, are translated there, and arrive already in the reader's
 * language. Putting them here would mean a deploy to fix a typo and a
 * catalogue the size of a manual.
 */
export const help = {
  title: 'Help',
  back: 'Back',
  related: 'Related',
  trigger: {
    label: 'What is this?',
  },
  /**
   * The panel with no article to show. `failed` is help that could not be
   * fetched — said as such, so a network fault never reads as a screen
   * nobody wrote for. The other two are nothing to show, though nothing
   * went wrong, and send the reader on to the assistant.
   */
  empty: {
    failed: {
      title: 'Couldn’t load help',
      body: 'Check your connection and try again.',
      retry: 'TRY AGAIN',
    },
    none: {
      title: 'No help for this page yet',
      body: 'We’re still writing it. In the meantime, Ogen can explain anything on this screen.',
    },
    notFound: {
      title: 'This article isn’t here',
      body: 'It may have been renamed or taken down. Ogen can answer the question instead.',
    },
    askOgen: 'ASK OGEN',
  },
  /** A concept placed inside a page article, and the way to read it alone. */
  embed: {
    open: 'Open',
    openLabel: 'Open “{{title}}” on its own',
  },
  /** Under the summary when the article has no translation yet. */
  untranslated: 'This article isn’t available in your language yet.',
}
