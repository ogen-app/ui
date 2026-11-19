import { useEffect, useRef } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useHelpArticle, usePageHelpArticle } from '@/hooks/useHelp'
import { useLocale } from '@/hooks/useLocale'
import { Spinner } from '@/components/ui/spinner'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { HelpArticleBody } from '@/components/help/HelpArticleBody'
import {
  selectCurrentArticle,
  selectPreviousArticle,
  useHelpStore,
} from '@/stores/helpStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { awaiting } from '@/lib/fetched'
import type { HelpBlock, HelpEmbeddedArticle } from '@/types/help'

/**
 * The help centre (CON-173): a right-rail panel, opened from Help in the bar
 * over the page (`TopBar`), which takes the assistant's place while it shows
 * and gives it back when closed (`lib/rightPanel`).
 *
 * - **It reads the screen you are on.** Each route names its page article
 *   (`staticData: { help }`), and the panel follows the page for as long as
 *   the reader has not gone anywhere of their own — reading "Posts" over the
 *   calendar would be help for a place you have left. A screen with nothing
 *   written for it says so rather than keeping the last screen's article.
 * - **Its own history.** Following a cross-link is not navigating the app, so
 *   the panel keeps its own trail and the browser's Back button never lands
 *   the reader somewhere unrelated.
 * - **Deep-linked through the hash.** Every route declares a strict
 *   `validateSearch`, so a global `?help=` would have to be added to all of
 *   them; the hash belongs to no route and is ignored by the router.
 *
 * Mounted only while the `help-center` flag is on (`RightSidebar`).
 */

/** `#help/<key>` — shareable, and free of the router's search validation. */
const HASH_PREFIX = '#help/'

const readHash = (): string | null => {
  const hash = window.location.hash
  return hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(hash.slice(HASH_PREFIX.length))
    : null
}

export function HelpPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  const showing = useSettingsStore(selectActivePanel) === 'help'
  const articleKey = useHelpStore(selectCurrentArticle)
  const previousKey = useHelpStore(selectPreviousArticle)
  const { open, back } = useHelpStore.getState()

  const locale = useLocale()
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

  // Page help follows the page — while the trail is still the one the page
  // gave it (nothing, or the last screen's article), never once the reader
  // has followed a link. It also catches up with an index that lands after
  // Help was pressed: the trail was empty, and now this screen has an answer.
  const pageArticle = usePageHelpArticle({ enabled: true })
  const lastPageArticle = useRef(pageArticle)
  useEffect(() => {
    const previous = lastPageArticle.current
    lastPageArticle.current = pageArticle
    if (pageArticle === previous) return
    const { history, follow } = useHelpStore.getState()
    const untouched =
      history.length === 0 || (history.length === 1 && history[0] === previous)
    if (untouched) follow(pageArticle)
  }, [pageArticle])

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
    if (!next && !current.startsWith(HASH_PREFIX)) return
    const url = `${window.location.pathname}${window.location.search}${next}`
    window.history.replaceState(window.history.state, '', url)
  }, [showing, articleKey])

  return (
    <RailPanel
      title={article?.title ?? t('help.title')}
      onClose={onClose}
      className="h-full"
    >
      <Trail
        previousKey={previousKey}
        // A page article is the screen's own, and its category is usually
        // its own title ("Campaigns" over "Campaigns"), so it gets no line.
        category={
          article?.kind === 'page' ? undefined : article?.category.title
        }
        onBack={back}
      />
      {loadingArticle ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : article ? (
        <>
          {/* The article's one-line answer, set apart by its surface
              rather than by fading it: a reader who opened "What is
              this?" often needs only this line, and the thing they came
              for should not be the palest text on the panel. `tertiary`
              is the app's own canvas colour, so the block reads as
              recessed into the white panel rather than stuck onto it. */}
          <p className="bg-tertiary text-foreground rounded-md p-3 text-sm">
            {article.summary}
          </p>
          {/* Per-article fallback: an untranslated article arrives in
              English, and says so rather than leaving the reader to
              wonder why the app changed language. */}
          {article.language !== locale && (
            <p className="text-tertiary-foreground text-xs">
              {t('help.untranslated')}
            </p>
          )}
          <HelpArticleBody body={article.body} />
          <RelatedArticles
            keys={article.related.filter(
              (key) => !embeddedKeys(article.body).includes(key),
            )}
          />
        </>
      ) : (
        <p className="text-tertiary-foreground py-8 text-center text-sm">
          {articleKey ? t('help.notFound') : t('help.page.none')}
        </p>
      )}
    </RailPanel>
  )
}

/**
 * The line above the article: where you came from, or which category a
 * concept is filed under. Nothing for the screen's own article.
 *
 * Back names the article it returns to instead of showing a bare arrow — in a
 * panel with no page transition, an unlabelled arrow gives the reader nothing
 * to predict.
 */
function Trail({
  previousKey,
  category,
  onBack,
}: {
  previousKey: string | null
  category?: string
  onBack: () => void
}) {
  const { t } = useTranslation()
  if (previousKey) {
    return (
      <button
        type="button"
        onClick={onBack}
        className="text-tertiary-foreground hover:text-foreground -ml-1 flex min-w-0 cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs"
      >
        <ArrowLeftIcon className="size-3.5 shrink-0" />
        <span className="truncate">
          <ArticleTitle articleKey={previousKey} fallback={t('help.back')} />
        </span>
      </button>
    )
  }
  if (!category) return null
  return (
    <span className="text-tertiary-foreground truncate text-xs">
      {category}
    </span>
  )
}

/**
 * The concepts an article already shows in full. Offering one again under
 * Related would send the reader to text they have just scrolled past.
 */
const embeddedKeys = (body: HelpBlock[]): string[] =>
  body.flatMap((block) => {
    const key = (block.article as HelpEmbeddedArticle | null | undefined)?.key
    return block._type === 'helpEmbed' && key ? [key] : []
  })

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
