import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useBlocker } from '@tanstack/react-router'
import {
  AlertCircleIcon,
  Copy01Icon,
  Delete02Icon,
  RefreshIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ModalContainer } from '@/components/ui/modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  PAGE_ACTION_BAR_INSET,
  PageActionBar,
} from '@/components/page-primitives/PageActionBar'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { SaveStatus } from '@/components/page-primitives/SaveStatus'
import { brandSection, type BrandSectionId } from '@/lib/brandSections'
import { cn } from '@/lib'
import { readByStatus } from './shell'

/**
 * What every Brand editor is made of.
 *
 * The voice editor was the first, and for one screen the furniture living
 * inside it was right. The audience editor is the second, and the same
 * arrangement copied into a second file is the arrangement that drifts: two
 * screens one click apart, whose headers fade differently and whose cards are
 * spaced differently, read as two people's work — which is exactly what the
 * sections avoided by sharing `shell.tsx`.
 *
 * So the frame, the cards, the labels, the fork note and the danger zone are
 * here, and an editor is the fields it puts in them. What is *not* here is
 * anything about one kind of entry: `SamplesCard` and the rules controls stay
 * in `VoiceEditor`, because a shared component with a `kind` prop and two
 * branches in every function is worse than two components.
 */

/**
 * How long an entry sits unchanged before it is written — the post editor's
 * figure, so the two kinds of screen that save themselves keep one rhythm.
 */
const AUTOSAVE_MS = 600

/** What `useEditorSave` reports, and what `BrandEditorFrame` draws from it. */
export type EditorSave = {
  /**
   * A write is waiting out the debounce or in flight. Tracks the debounce as
   * well as the request, like the post editor's `saving`: an edit nobody has
   * sent yet is exactly as unsaved as one on the wire.
   */
  saving: boolean
  /** The screen holds something that differs from what it opened with or last wrote. */
  unsaved: boolean
  /**
   * Stop writing. Called before a delete: the unmount that follows it would
   * otherwise flush a pending edit into a `PUT` on a row that no longer
   * exists. Returns the release, for a delete that fails — the row is still
   * there, and every edit after it would otherwise be dropped while the cloud
   * went on saying it was saving.
   */
  hold: () => () => void
  /** Whether a hold is in place — a delete is on its way, so leaving is expected. */
  held: () => boolean
}

/**
 * **An entry that exists saves itself.** Every edit is written 600ms after the
 * last keystroke, the way a post and a campaign are, and the header's cloud is
 * the only thing that says so — no toast, no button, no bar.
 *
 * It used to be a `SAVE VOICE` at the foot of the screen, and people missed it:
 * the bar is pinned, but the screen treated every edit as unsaved from the
 * first frame, so the bar never changed and nobody read it. Worse, the caret,
 * the sidebar and closing the tab all threw the draft away without asking. An
 * editor whose commit is easy to miss and whose exits are silent loses work in
 * the ordinary course of using it.
 *
 * **A new entry is still created on purpose** (`stored: false`): it has no row
 * to write into until a name exists, and a half-typed name should not become a
 * library entry on its own. So this reports `unsaved` for the frame's leave
 * guard and writes nothing; the frame's `create` does the first write, and the
 * route moves to the stored entry's own address, where this takes over.
 *
 * `blocked` is a write the server would refuse or that would lose something —
 * a nameless entry, guardrails cleared to nothing. The edit is kept on screen
 * and simply not sent, and the frame says why.
 *
 * Writes compare a signature of the **draft** — the fields the screen owns —
 * rather than of the entity it assembles, which carries server fields
 * (`usage`, `summary`) and a fresh `updatedAt` on every render, and would
 * never compare equal twice. So opening a screen never writes it, a save
 * landing never triggers another, and typing a letter and deleting it again
 * inside the debounce sends nothing.
 *
 * Leaving flushes. A pending edit is sent on unmount rather than dropped, so
 * the caret and the sidebar need no guard on a stored entry — except one whose
 * edit is blocked, which cannot be sent, so the frame asks about that instead.
 */
export function useEditorSave<D>({
  draft,
  stored,
  blocked = false,
  save,
}: {
  /** The fields the screen owns, as they stand. Plain data — it is compared as JSON. */
  draft: D
  /** Whether there is a row to write into — see above. */
  stored: boolean
  blocked?: boolean
  /** One write. Its rejection is reported by the mutation; this only retries on the next edit. */
  save: (draft: D) => Promise<unknown>
}): EditorSave {
  const signature = JSON.stringify(draft)
  const [baseline, setBaseline] = useState(signature)
  const [inFlight, setInFlight] = useState(0)
  // Bumped by a release, so a held edit is armed again without another one.
  const [released, setReleased] = useState(0)

  // Against the last *confirmed* write. A write still in flight for this very
  // signature may re-arm the timer, and `write` drops it as already sent.
  const armed = stored && !blocked && signature !== baseline

  // The timer and the unmount flush outlive renders, so they read the current
  // value and writer through refs rather than closing over the first ones.
  const latest = useRef({ draft, signature, save, armed })
  useLayoutEffect(() => {
    latest.current = { draft, signature, save, armed }
  })
  const written = useRef(baseline)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const held = useRef(false)

  const write = useCallback(() => {
    timer.current = null
    const { draft, signature, save } = latest.current
    if (held.current || signature === written.current) return
    const previous = written.current
    written.current = signature
    setInFlight((n) => n + 1)
    save(draft)
      .then(
        () => setBaseline(signature),
        // Put the mark back so the next edit sends this one's content too;
        // the mutation has already said what went wrong.
        () => {
          if (written.current === signature) written.current = previous
        },
      )
      .finally(() => setInFlight((n) => n - 1))
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = armed ? setTimeout(write, AUTOSAVE_MS) : null
  }, [armed, signature, write, released])

  // Sends whatever is armed, not only what is waiting on the timer: a write
  // that was refused leaves no timer behind, and leaving is its last chance.
  // `write` drops a signature already on the wire, and a blocked draft is
  // never armed, so neither goes out twice or goes out invalid.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      if (latest.current.armed) write()
    },
    [write],
  )

  const saving = inFlight > 0 || armed

  // Closing the tab is the one exit a flush cannot cover — so it asks about
  // anything not yet confirmed, including an edit held back as blocked.
  const unconfirmed = inFlight > 0 || (stored && signature !== baseline)
  useEffect(() => {
    if (!unconfirmed) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unconfirmed])

  const hold = useCallback(() => {
    held.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    return () => {
      held.current = false
      setReleased((n) => n + 1)
    }
  }, [])

  const isHeld = useCallback(() => held.current, [])

  return { saving, unsaved: signature !== baseline, hold, held: isHeld }
}

/**
 * The screen an editor sits in: the header, the scroller, the column — and,
 * only when there is something to say, the bar.
 *
 * ## The header is a child, not a sibling
 *
 * It is rendered *inside* the `ScrollArea`: a sticky gradient can only dissolve
 * content that passes underneath it, and content that scrolls in a different
 * box never passes underneath anything. The route still says where back goes
 * — it hands down `back` — and the frame puts `SaveStatus` in the header's
 * centre, which is where every autosaving screen in the app reports.
 *
 * ## The bar is for creating, and for refusing
 *
 * A stored entry saves itself (`useEditorSave`), so it has nothing to commit
 * and no bar — except while a save is refused, when the bar carries the
 * sentence saying why and nothing else. An edit being quietly not written is
 * the one state of an autosaving screen that must be impossible to miss.
 *
 * A new entry keeps `CANCEL` and `CREATE …`: the first write is a decision.
 * Leaving one with something typed in it asks first, because until it is
 * created the draft exists nowhere but this screen. `CANCEL` does not ask — it
 * *is* the answer.
 *
 * One blocker, one disabled button: `blocker` both explains and enforces, so
 * a screen can never say why it cannot save and then let you save.
 */
export function BrandEditorFrame({
  back,
  save,
  blocker,
  create,
  children,
}: {
  /** The route's way back — a `BrandBackButton`. */
  back: ReactNode
  save: EditorSave
  /** Why this cannot be written yet, if it cannot. Shown, and enforced. */
  blocker?: string
  /** Present while the entry has never been stored — see above. */
  create?: {
    /** `CREATE VOICE` — the noun is the editor's to name. */
    label: string
    /** The first write; the route navigates to the stored entry when it lands. */
    onCreate: () => Promise<unknown>
    onCancel: () => void
  }
  children: ReactNode
}) {
  const { t } = useTranslation()
  const column = cn('flex flex-col gap-3 px-3 lg:px-6', PAGE_ACTION_BAR_INSET)

  // Set on the way out through the screen's own exits, which must not be asked
  // about. Put back if the create fails, so the draft is guarded again.
  const leaving = useRef(false)
  // A blocked edit on a stored entry is the other draft that exists nowhere
  // but here: autosave holds it back, so leaving would drop it silently.
  const guarded = () =>
    (Boolean(create) || Boolean(blocker)) &&
    save.unsaved &&
    !save.held() &&
    !leaving.current
  const leave = useBlocker({
    shouldBlockFn: guarded,
    enableBeforeUnload: guarded,
    withResolver: true,
  })

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ScrollArea
        className="min-h-0 flex-1"
        type="scroll"
        scrollHideDelay={350}
      >
        <PageHeader back={back} center={<SaveStatus saving={save.saving} />} />
        <div className={column}>{children}</div>
      </ScrollArea>

      {create ? (
        <PageActionBar contentKey="create" blocker={blocker}>
          <Button
            variant="defaultInverted"
            size="sm"
            disabled={Boolean(blocker)}
            onClick={() => {
              leaving.current = true
              create.onCreate().catch(() => {
                leaving.current = false
              })
            }}
          >
            {create.label}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              leaving.current = true
              create.onCancel()
            }}
          >
            {t('brand.editor.cancel')}
          </Button>
        </PageActionBar>
      ) : blocker ? (
        <PageActionBar contentKey="blocked">
          <span className="flex items-center gap-1.5 px-2 text-xs text-secondary-foreground">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={16}
              strokeWidth={1.5}
              className="shrink-0"
            />
            {blocker}
          </span>
        </PageActionBar>
      ) : null}

      <ModalContainer
        isOpen={leave.status === 'blocked'}
        onClose={() => leave.reset?.()}
        title={t('brand.editor.leave.title')}
        size="small"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary-foreground">
            {t('brand.editor.leave.body')}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => leave.reset?.()}
            >
              {t('brand.editor.leave.stay')}
            </Button>
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={() => leave.proceed?.()}
            >
              {t('brand.editor.leave.discard')}
            </Button>
          </div>
        </div>
      </ModalContainer>
    </div>
  )
}

/**
 * What you are looking at, said before anything asks you to fill it in.
 *
 * The header above is a caret and nothing else — the entry's name is the first
 * field of the document, and a page titled by a name you are halfway through
 * typing flickers as you type it (the post editor's arrangement, and the reason
 * for it). That leaves the screen opening on a card headed "What it is", which
 * answers a question nobody has been given yet.
 *
 * So an editor opens the way a section does: a card with the section's glyph
 * in its hue. `title` is the **saved** name and the kind — `Dry British
 * Voice` — never the draft's, because reading it off the field two inches below
 * would make the heading spell itself out letter by letter.
 *
 * `readBy` is the section's own answer, so the honesty line is right whichever
 * editor is on screen and stops being right in one place when it stops being
 * true.
 */
export function EditorIntro({
  section,
  title,
  body,
  missing,
}: {
  section: BrandSectionId
  title: string
  body: string
  /**
   * What the section's emptiness costs, while it is empty.
   *
   * Only a singleton editor has anything to put here: it is the section's own
   * screen, so the line the library card would have carried has nowhere else to
   * go. An editor opened on a row of a list is never the whole section.
   */
  missing?: string
}) {
  const { t } = useTranslation()
  const { icon, tone, readBy } = brandSection(section)
  return (
    <Card
      heading="h1"
      icon={icon}
      tone={tone}
      title={title}
      status={readByStatus(t, readBy)}
      capped
    >
      <p className="text-sm text-secondary-foreground">{body}</p>
      {missing && (
        <p className="text-sm text-secondary-foreground">{missing}</p>
      )}
    </Card>
  )
}

/**
 * A labelled field. The label takes the same small-caps treatment the
 * guardrail rails use, so a label on the index and a label in the editor are
 * the same mark.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="max-w-2xl text-xs text-tertiary-foreground">
          {hint}
        </span>
      )}
    </label>
  )
}

/**
 * Said once, at the top, when a starter was picked: what arrived, what did not,
 * and that nothing is saved yet.
 *
 * A section sells a starter as a head start, and it is one — but the part it
 * hands over is the part that matters least. Somebody who saves this screen
 * untouched has created the hollow entry the library draws as a failure, and
 * this is the only moment where saying so still changes what they do.
 *
 * The second sentence is the caller's, because what a template *cannot* give
 * you is different per section and is the only interesting half: a voice
 * arrives without samples, an audience without the three lines that make it
 * concrete.
 */
export function ForkedNote({
  name,
  children,
}: {
  /** The starter's name. */
  name: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Card
      capped
      icon={Copy01Icon}
      title={t('brand.editor.forkedTitle', { name })}
    >
      <p className="text-sm text-secondary-foreground">
        {t('brand.editor.forkedFrom')} {children}
      </p>
    </Card>
  )
}

/**
 * The one gesture on an editor with no undo behind it, so it takes two.
 *
 * Everything else on these screens is recoverable by typing it back — an edit
 * is a change to a field you can see. Deleting is the exception, and the same one the
 * document and post editors make: a list may delete a row on one click, because
 * the row is one of twenty and the mistake is visible immediately, but a thing
 * that fills the screen and may have just been written gets asked about.
 *
 * `cost` is said on the card **and** again in the confirmation, which is not a
 * duplication: the card's line is what you read while deciding whether to go
 * near the button, and the dialog's is what you read while deciding. A dialog
 * that only asked "are you sure?" would make the second reading depend on
 * remembering the first. It is a prop because what deleting costs is counted in
 * the entry's own numbers, in its own words.
 */
export function DangerCard({
  noun,
  name,
  cost,
  onDelete,
  reset,
}: {
  /**
   * `voice`, `audience` — in lower case, because it is spliced into the
   * sentence-case labels of a card's buttons (`Delete voice`).
   */
  noun: string
  name: string
  cost: string
  onDelete: () => void
  /**
   * Putting the screen back as it opened — the voice's samples. Here rather
   * than on the card it resets, because it throws away what was typed, and a
   * step that loses work sits with the others that do.
   */
  reset?: { label: string; onClick: () => void; disabled?: boolean }
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)

  // The buttons in the body, as in every Danger Zone: the header holds one
  // control, and this card can hold two.
  return (
    <Card title={t('brand.editor.danger.title')} capped>
      <p className="text-sm text-secondary-foreground">{cost}</p>
      <div className="flex flex-wrap items-center gap-2">
        {reset && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={reset.onClick}
            disabled={reset.disabled}
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={1.5} />
            <span>{reset.label}</span>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={() => setConfirming(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
          <span>{t('brand.editor.danger.delete', { noun })}</span>
        </Button>
      </div>

      <ModalContainer
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={t('brand.editor.danger.confirmTitle', { name })}
        size="small"
      >
        <div className="flex flex-col gap-4">
          {/* One key holding both sentences rather than the caller's line and
              a literal beside it: "this cannot be undone" is the second half
              of a sentence the first half sets up, and a language may want
              them the other way round. */}
          <p className="text-sm text-secondary-foreground">
            {t('brand.editor.danger.confirmBody', { cost })}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              {t('brand.editor.danger.keep', { noun })}
            </Button>
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={onDelete}
            >
              {t('brand.editor.danger.delete', { noun })}
            </Button>
          </div>
        </div>
      </ModalContainer>
    </Card>
  )
}
