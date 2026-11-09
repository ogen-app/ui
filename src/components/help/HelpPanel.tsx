import { useEffect } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useHelpArticle, useHelpIndex } from '@/hooks/useHelp'
import { Spinner } from '@/components/ui/spinner'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { HelpArticleBody } from '@/components/help/HelpArticleBody'
import {
  selectCurrentArticle,
  selectPreviousArticle,
  useHelpStore,
} from '@/stores/helpStore'
import type { HelpIndexEntry } from '@/types/help'
import { awaiting } from '@/lib/fetched'

/**
 * The help centre (CON-173), as a right-rail panel.
 *
 * It was a drawer floating over the app; it is now the floor the top bar's
 * **Support** shares with the assistant, so the two replace each other in one
 * column rather than one covering the other. Three decisions carried over:
 *
 * - **The app stays live beside it.** Contextual help you cannot work
 *   alongside is not contextual — which the rail gives for free, since it sits
 *   *beside* the page rather than over it.
 * - **Its own history.** Following a cross-link is not navigating the app, so
 *   the panel keeps its own trail and the browser's Back button never lands
 *   the reader somewhere unrelated.
 * - **Deep-linked through the hash.** Every route declares a strict
 *   `validateSearch`, so a global `?help=` would have to be added to all of
 *   them; the hash belongs to no route and is ignored by the router.
 *
 * With nothing in the trail it is the help home: every article, by category.
 * That is what Support opens onto, since the button has no topic of its own.
 */

/** `#help/<key>` — shareable, and free of the router's search validation. */
const HASH_PREFIX = '#help/'

const readHash = (): string | null => {
  const hash = window.location.hash
  return hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(hash.slice(HASH_PREFIX.length))
    : null
}

/**
 * Mounted only while the `help-center` flag is on — `RightSidebar` decides —
 * and kept mounted while hidden, like every rail layer, so a pasted help link
 * still opens it.
 */
export function HelpPanel({
  showing,
  onClose,
}: {
  showing: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  const articleKey = useHelpStore(selectCurrentArticle)
  const previousKey = useHelpStore(selectPreviousArticle)
  const { open, back } = useHelpStore.getState()

  const query = useHelpArticle(showing ? articleKey : null)
  const article = query.data
  // `awaiting`, not `isLoading` — see `lib/fetched`. It answers false for the
  // hidden panel's disabled query too, which is what `isLoading` was doing
  // right and `isPending` would get wrong.
  const loadingArticle = awaiting(query)

  // Open from the address bar — on first paint, and again whenever the hash
  // changes under us. The listener is not optional: pasting a help link into
  // a tab that already has the app open changes only the fragment, so the
  // browser never reloads and a mount-only read would silently do nothing.
  //
  // Our own writes below use `replaceState`, which by definition does not fire
  // `hashchange`, so this cannot feed back into itself.
  useEffect(() => {
    const sync = () => {
      const fromHash = readHash()
      if (!fromHash) return
      // Re-opening what is already on screen would throw away the trail the
      // reader built by following links.
      if (selectCurrentArticle(useHelpStore.getState()) === fromHash) return
      open(fromHash)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [open])

  // Keep the address bar in step, without adding history entries — `replace`
  // rather than `push`, so the browser's Back button still means "the previous
  // screen" and not "the previous paragraph".
  useEffect(() => {
    const next =
      showing && articleKey
        ? `${HASH_PREFIX}${encodeURIComponent(articleKey)}`
        : ''
    const current = window.location.hash
    if (current === next) return
    // Only ever clear a hash that is ours: another feature's fragment is not
    // this panel's to wipe because help happens to be closed.
    if (!next && !current.startsWith(HASH_PREFIX)) return
    const url = `${window.location.pathname}${window.location.search}${next}`
    window.history.replaceState(null, '', url)
  }, [showing, articleKey])

  if (!articleKey) {
    return (
      <RailPanel title={t('help.title')} onClose={onClose} className="h-full">
        <HelpHome enabled={showing} />
      </RailPanel>
    )
  }

  return (
    <RailPanel
      title={article?.title ?? t('help.title')}
      onClose={onClose}
      className="h-full"
      subheader={<Trail previousKey={previousKey} onBack={back} />}
    >
      {loadingArticle ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : article ? (
        <>
          {/* The article's one-line answer, set apart by its surface rather
              than by fading it: a reader who opened "What is this?" often
              needs only this line, and the thing they came for should not be
              the palest text on the panel. `tertiary` is the app's own canvas
              colour, so the block reads as recessed into the white panel
              rather than stuck onto it. */}
          <p className="bg-tertiary text-foreground rounded-md p-3 text-sm">
            {article.summary}
          </p>
          <HelpArticleBody body={article.body} />
          <RelatedArticles keys={article.related} />
        </>
      ) : (
        <p className="text-tertiary-foreground py-8 text-center text-sm">
          {t('help.notFound')}
        </p>
      )}
    </RailPanel>
  )
}

/** Every article, grouped under its category — what Support opens onto. */
function HelpHome({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation()
  const push = useHelpStore((s) => s.push)
  const { data: entries, isPending } = useHelpIndex({ enabled })

  if (isPending && enabled) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }
  if (!entries?.length) {
    return (
      <p className="text-tertiary-foreground py-8 text-center text-sm">
        {t('help.empty')}
      </p>
    )
  }

  const groups = new Map<string, HelpIndexEntry[]>()
  for (const entry of entries) {
    const group = groups.get(entry.category.title) ?? []
    group.push(entry)
    groups.set(entry.category.title, group)
  }

  return (
    <div className="flex flex-col gap-5">
      {[...groups].map(([category, items]) => (
        <section key={category}>
          <h2 className="text-tertiary-foreground mb-1 text-xs font-medium">
            {category}
          </h2>
          <ul className="flex flex-col">
            {items.map((entry) => (
              <li key={entry.key}>
                <button
                  type="button"
                  onClick={() => push(entry.key)}
                  className="hover:bg-secondary -mx-2 flex w-[calc(100%+1rem)] cursor-pointer flex-col gap-0.5 rounded-md px-2 py-2 text-left"
                >
                  <span className="text-sm">{entry.title}</span>
                  <span className="text-tertiary-foreground line-clamp-2 text-xs">
                    {entry.summary}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/**
 * The one line under the title: the way back, named.
 *
 * Back names where it returns to instead of showing a bare arrow — in a panel
 * with no page transition, an unlabelled arrow gives the reader nothing to
 * predict. From the first article in the trail it returns to the list, which
 * is where an article opened from Support came from and the obvious next
 * place for one opened from a "?".
 */
function Trail({
  previousKey,
  onBack,
}: {
  previousKey: string | null
  onBack: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-tertiary-foreground hover:text-foreground -ml-1 flex min-w-0 cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs"
    >
      <ArrowLeftIcon className="size-3.5 shrink-0" />
      <span className="truncate">
        {previousKey ? (
          <ArticleTitle articleKey={previousKey} fallback={t('help.back')} />
        ) : (
          t('help.home')
        )}
      </span>
    </button>
  )
}

/** The cards at the foot of an article. */
function RelatedArticles({ keys }: { keys: string[] }) {
  const { t } = useTranslation()
  const push = useHelpStore((s) => s.push)
  if (!keys.length) return null
  return (
    <nav className="border-border mt-4 border-t pt-4">
      <h2 className="text-tertiary-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {t('help.related')}
      </h2>
      <ul className="flex flex-col">
        {keys.map((key) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => push(key)}
              className="hover:bg-secondary -mx-2 w-[calc(100%+1rem)] cursor-pointer px-2 py-2 text-left text-sm"
            >
              <ArticleTitle articleKey={key} fallback={key} />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * An article's own title, from its key.
 *
 * Links and related lists carry keys rather than titles — the price of an
 * identity that survives translation — so each one asks for its own article.
 * They are all cached by the time anyone clicks, which is the other half of
 * that trade.
 */
function ArticleTitle({
  articleKey,
  fallback,
}: {
  articleKey: string
  fallback: string
}) {
  const { data } = useHelpArticle(articleKey)
  return <>{data?.title ?? fallback}</>
}
