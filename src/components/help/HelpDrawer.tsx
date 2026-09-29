import { useCallback, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'
import { useFeatureFlag } from '@/config/featureFlags'
import { useHelpArticle } from '@/hooks/useHelp'
import { Spinner } from '@/components/ui/spinner'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { HelpArticleBody } from '@/components/help/HelpArticleBody'
import {
  HELP_MAX_WIDTH,
  HELP_MIN_WIDTH,
  selectCurrentArticle,
  selectPreviousArticle,
  useHelpStore,
} from '@/stores/helpStore'
import { awaiting } from '@/lib/fetched'

/**
 * The help centre (CON-173).
 *
 * A standalone drawer over the app, mounted once at the root — not a right-rail
 * panel. Three decisions make it what it is:
 *
 * - **`modal={false}`.** No focus trap, no backdrop, the app stays live behind
 *   it. Contextual help you cannot work alongside is not contextual: the
 *   ordinary use is to read the article *while* doing the thing it describes.
 * - **Its own history.** Following a cross-link is not navigating the app, so
 *   the drawer keeps its own trail and the browser's Back button never lands
 *   the reader somewhere unrelated.
 * - **Deep-linked through the hash.** Every route declares a strict
 *   `validateSearch`, so a global `?help=` would have to be added to all of
 *   them; the hash belongs to no route and is ignored by the router.
 *
 * Its *chrome*, though, is the rail's: it draws itself with `RailPanel`, the
 * same primitive the assistant and the calendar panels use, so a surface that
 * behaves differently does not also look like it came from a different app.
 * What the drawer adds is the resize handle and the trail — the rail is a fixed
 * `w-120` and has nowhere to go back to.
 */

/** `#help/<key>` — shareable, and free of the router's search validation. */
const HASH_PREFIX = '#help/'

const readHash = (): string | null => {
  const hash = window.location.hash
  return hash.startsWith(HASH_PREFIX)
    ? decodeURIComponent(hash.slice(HASH_PREFIX.length))
    : null
}

export function HelpDrawer() {
  const { t } = useTranslation()
  const enabled = useFeatureFlag('help-center')

  const isOpen = useHelpStore((s) => s.isOpen)
  const width = useHelpStore((s) => s.width)
  const articleKey = useHelpStore(selectCurrentArticle)
  const previousKey = useHelpStore(selectPreviousArticle)
  const { open, close, back, setWidth } = useHelpStore.getState()

  const query = useHelpArticle(isOpen ? articleKey : null)
  const article = query.data
  // `awaiting`, not `isLoading` — see `lib/fetched`. It answers false for the
  // closed drawer's disabled query too, which is what `isLoading` was doing
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
    if (!enabled) return
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
  }, [enabled, open])

  // Keep the address bar in step, without adding history entries — `replace`
  // rather than `push`, so the browser's Back button still means "the previous
  // screen" and not "the previous paragraph".
  useEffect(() => {
    if (!enabled) return
    const next =
      isOpen && articleKey
        ? `${HASH_PREFIX}${encodeURIComponent(articleKey)}`
        : ''
    const current = window.location.hash
    if (current === next) return
    const url = `${window.location.pathname}${window.location.search}${next}`
    window.history.replaceState(null, '', url)
  }, [enabled, isOpen, articleKey])

  if (!enabled) return null

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(o) => !o && close()}
      modal={false}
    >
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          // Radix would otherwise pull focus into the drawer on open, taking
          // the cursor out of whatever the reader was in the middle of.
          onOpenAutoFocus={(e) => e.preventDefault()}
          // The app behind stays interactive; only Escape closes.
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            // The rail's surface and its left hairline. The shadow is the one
            // departure: the rail sits *in* the layout and needs no lift, while
            // this floats over the page it is explaining.
            'bg-primary border-border fixed inset-y-0 right-0 flex flex-col border-l shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200',
          )}
          style={{ width, zIndex: ZIndex.helpDrawer }}
        >
          {/* The dialog's accessible name stays "Help" rather than following
              the article: it names the surface, and the article already has a
              heading of its own inside it. */}
          <Dialog.Title className="sr-only">{t('help.title')}</Dialog.Title>
          <ResizeHandle width={width} onResize={setWidth} />

          <RailPanel
            title={article?.title ?? t('help.title')}
            onClose={close}
            className="min-h-0 flex-1"
            subheader={
              <Trail
                previousKey={previousKey}
                category={article?.category.title}
                onBack={back}
              />
            }
          >
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
                <HelpArticleBody body={article.body} />
                <RelatedArticles keys={article.related} />
              </>
            ) : (
              <p className="text-tertiary-foreground py-8 text-center text-sm">
                {t('help.notFound')}
              </p>
            )}
          </RailPanel>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * The one line under the title: where you came from, or where you are.
 *
 * Back names the article it returns to instead of showing a bare arrow — in a
 * drawer with no page transition, an unlabelled arrow gives the reader nothing
 * to predict. With no trail behind it the row falls back to the category, so
 * the header is the same height either way and the prose never jumps.
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
  return (
    <span className="text-tertiary-foreground truncate text-xs">
      {category ?? ' '}
    </span>
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

/**
 * The drag handle on the drawer's left edge.
 *
 * Keyboard-operable, not only draggable: it is the only control that changes
 * how much of the screen the app keeps, and a mouse-only affordance would put
 * that out of reach for anyone who cannot drag.
 */
function ResizeHandle({
  width,
  onResize,
}: {
  width: number
  onResize: (px: number) => void
}) {
  const { t } = useTranslation()
  const frame = useRef<number | null>(null)
  const latest = useRef<number | null>(null)

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = width
      latest.current = null

      const move = (e: PointerEvent) => {
        latest.current = startWidth + (startX - e.clientX)
        // One store write per frame: pointermove fires far more often than the
        // screen repaints. The pending frame is left alone rather than
        // rescheduled, so a continuous drag still updates every frame.
        if (frame.current !== null) return
        frame.current = requestAnimationFrame(() => {
          frame.current = null
          if (latest.current !== null) onResize(latest.current)
        })
      }

      const up = () => {
        window.removeEventListener('pointermove', move)
        if (frame.current !== null) {
          cancelAnimationFrame(frame.current)
          frame.current = null
        }
        // Flush, never drop. A drag released inside the same frame as its last
        // move — which is every quick flick — would otherwise end with the
        // pending width thrown away and the drawer snapping back.
        if (latest.current !== null) onResize(latest.current)
      }

      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up, { once: true })
    },
    [width, onResize],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('help.resize')}
      aria-valuenow={width}
      aria-valuemin={HELP_MIN_WIDTH}
      aria-valuemax={HELP_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onResize(width + 24)
        else if (e.key === 'ArrowRight') onResize(width - 24)
        else return
        e.preventDefault()
      }}
      // Straddles the edge and is 8px wide, though what you see is a 1px line:
      // the drawn edge and the thing you can grab are not the same size, and
      // making them the same would mean a 1px target. The line only appears on
      // hover or focus, so the drawer's edge stays quiet until you reach for it.
      className={cn(
        'absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize',
        'after:absolute after:inset-y-0 after:left-1 after:w-px after:transition-colors',
        'hover:after:bg-accent/60 focus-visible:after:bg-accent focus-visible:outline-none',
      )}
    />
  )
}
