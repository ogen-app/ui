import { useState, type ReactNode } from 'react'
import { StarIcon, TrashIcon, type Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  PAGE_ACTION_BAR_INSET,
  PageActionBar,
  type BarStatus,
} from '@/components/page-primitives/PageActionBar'
import { brandSection, type BrandSectionId } from '@/lib/brandSections'
import { cn } from '@/lib'
import { BrandIntro, COLUMN } from './shell'

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
 * The screen an editor sits in: the scroller with the header inside it, the
 * column, and the commit bar under the whole thing.
 *
 * ## The header is a child, not a sibling
 *
 * It is rendered *inside* the `ScrollArea`, which is the whole reason it takes
 * a `header` prop rather than the route drawing one above this: a sticky
 * gradient can only dissolve content that passes underneath it, and content
 * that scrolls in a different box never passes underneath anything. The route
 * still owns the header — it is the only thing that knows where back goes —
 * it just hands it down. Post details is the same arrangement for the same
 * reason.
 *
 * ## The bar is outside it
 *
 * `PageActionBar` is anchored to the content column and must not scroll away,
 * so it is a sibling of the scroller and the column below reserves its height
 * with `PAGE_ACTION_BAR_INSET`. CON-178: an editor screen commits at the
 * bottom centre, and the commit is the one thing on it that is always
 * reachable.
 *
 * ## One blocker, one disabled button
 *
 * `blocker` both explains and enforces. The first build passed the sentence to
 * the bar and a separate `disabled` to the button, which is two statements of
 * one rule and one of them was eventually going to be wrong — a screen that
 * says why you cannot save and then lets you save is worse than either half.
 *
 * ## `dirty`, for an editor you did not drill into
 *
 * Two of these screens are reached from a list, so leaving is `CANCEL` and
 * saving an untouched draft is merely pointless. Guardrails is reached from the
 * Overview and *is* the section — there is no read-only version of it to go
 * back to, so the screen sits there unchanged for most of its life, and a live
 * `SAVE` on an untouched document would stamp a new `updatedAt` on material
 * nobody edited. With `dirty: false` the bar drops the discard button and
 * disables the commit; what state the screen is in is said by `status`, so the
 * rule above still holds — one statement, one enforcement, never two.
 */
export function BrandEditorFrame({
  header,
  blocker,
  status,
  dirty = true,
  contentKey,
  commitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onSave,
  children,
}: {
  /** The route's `PageHeader`, rendered inside this component's scroller. */
  header?: ReactNode
  /** Why this cannot be committed yet, if it cannot. Shown, and enforced. */
  blocker?: string
  /** A fact about the document, beside the actions — see `BarStatus`. */
  status?: BarStatus
  /**
   * Whether there is anything to commit. Defaults to `true`: an editor opened
   * on a row of a list is left by cancelling whether or not it was touched.
   */
  dirty?: boolean
  /** What the bar animates between — `'new'` and `'edit'` in practice. */
  contentKey: string
  /** `SAVE VOICE`, `CREATE AUDIENCE` — the noun is the editor's to name. */
  commitLabel: string
  /** `CANCEL` leaves; `DISCARD CHANGES` puts a screen you stay on back. */
  cancelLabel?: string
  onCancel?: () => void
  onSave?: () => void
  children: ReactNode
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ScrollArea
        className="min-h-0 flex-1"
        type="scroll"
        scrollHideDelay={350}
      >
        {header}
        <div
          className={cn(
            'flex flex-col gap-3 px-3 lg:px-6',
            PAGE_ACTION_BAR_INSET,
          )}
        >
          {children}
        </div>
      </ScrollArea>

      <PageActionBar contentKey={contentKey} blocker={blocker} status={status}>
        {/* Literal `null`, not a component that renders one: the bar counts a
            child that draws nothing and rules a divider beside it. */}
        {dirty ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <span className="uppercase">{cancelLabel}</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          // The ghost variant has no disabled ink of its own — it only stops
          // taking clicks — and the strong `text-primary-foreground` here is
          // exactly what makes a dead button look live. `senary` is the ink the
          // default variant fades to, so a refused commit greys the same way
          // wherever it happens.
          className="text-primary-foreground disabled:text-senary-foreground"
          disabled={Boolean(blocker) || !dirty}
          onClick={onSave}
        >
          <span className="uppercase">{commitLabel}</span>
        </Button>
      </PageActionBar>
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
 * So an editor opens the way a section does: `BrandIntro`, with the section's
 * glyph in its hue. `title` is the **saved** name and the kind — `Dry British
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
  const { icon, tone, readBy } = brandSection(section)
  return (
    <BrandIntro
      icon={icon}
      tone={tone}
      title={title}
      body={body}
      missing={missing}
      readBy={readBy}
    />
  )
}

/** One card in an editor's column: a heading, a line under it, and fields. */
export function EditorCard({
  title,
  hint,
  action,
  children,
}: {
  title: string
  /**
   * The line under the heading. A node rather than a string because the samples
   * card puts its reading up here — one line of it is set in the foreground
   * colour — and a card whose sub-heading is a different element from every
   * other card's would be a second way of saying the same thing.
   */
  hint?: ReactNode
  /**
   * One control on the heading's line, opposite the title.
   *
   * For something that is true of the card as a whole rather than of a field
   * in it — being the default voice, the samples overflow. A field goes in the
   * body with the other fields; this corner is not an overflow for the ones
   * that would not fit.
   */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={cn(COLUMN, 'flex flex-col gap-5 bg-primary px-6 py-6')}>
      <header className="flex items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1">
          <h2 className="font-display text-lg font-medium leading-6 tracking-tight">
            {title}
          </h2>
          {hint && (
            <div className="flex flex-col gap-1 text-sm leading-5 text-secondary-foreground">
              {hint}
            </div>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
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
  icon: Glyph,
  title,
  children,
}: {
  icon: Icon
  title: string
  children: ReactNode
}) {
  return (
    <div className={cn(COLUMN, 'flex gap-3 bg-primary px-6 py-5')}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Glyph className="size-5" />
      </span>
      <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
        Started from <span className="text-foreground">{title}</span>, and
        copied rather than linked — ours changing will never change yours.{' '}
        {children}
      </p>
    </div>
  )
}

/**
 * The one gesture on an editor with no undo behind it, so it takes two.
 *
 * Everything else on these screens is recoverable by not saving — `CANCEL` puts
 * the whole thing back. Deleting is the exception, and the same one the
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
}: {
  /**
   * `VOICE`, `AUDIENCE` — in capitals, because it is spliced into labels that
   * are written in capitals. The caps are part of the copy: they survive
   * copy/paste, screen readers and any restyle, which a `uppercase` class does
   * not.
   */
  noun: string
  name: string
  cost: string
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <EditorCard title="Danger zone" hint={cost}>
      <div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          <TrashIcon />
          <span>DELETE {noun}</span>
        </Button>
      </div>

      <ModalContainer
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete "${name}"?`}
        size="small"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary-foreground">
            {cost} This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              KEEP {noun}
            </Button>
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={onDelete}
            >
              DELETE {noun}
            </Button>
          </div>
        </div>
      </ModalContainer>
    </EditorCard>
  )
}

/**
 * Whether the app falls back to this entry — **a state with an action, not a
 * setting with a switch.**
 *
 * It was a labelled `Switch` with two sentences under it, and the sentences
 * were the tell. Being the default is not symmetrical: you can *take* it, and
 * you cannot give it back, because a library with no default at all sends every
 * post that follows through a choice nobody asked for. A switch promises the
 * second half of a pair that does not exist, so it had to spend a line of
 * tertiary copy explaining that it only goes one way — a control that needs a
 * footnote to say which of its two states is reachable is the wrong control.
 *
 * So: one thing, in the card's top-right corner, and which thing it is *is* the
 * state.
 *
 * - **Not the default** — a ghost `MAKE DEFAULT` with a hollow star. An offer,
 *   and a quiet one: it sits on the heading line of a card whose heading is the
 *   loudest thing on it, and an outline button there read as the card's main
 *   action.
 * - **The default** — a filled star and the word, inert. The tooltip carries
 *   what the two removed sentences were for: what being the default actually
 *   does. Repeating the label back ("this is the default voice") would leave
 *   the meaning of the word unsaid, which was the only thing worth saying.
 *
 * **Both states are 32px tall and padded like the button**, which is not a
 * detail: the first cut swapped a `size="sm"` button for a bare inline span, so
 * taking the default shrank the card's header by twelve pixels and jumped every
 * field below it up the screen. A control that changes shape when you press it
 * has to keep its footprint, or the press moves the page under the cursor.
 *
 * Green rather than the section's hue, matching `DefaultStar` on the library
 * cards and the Overview: the hue means which section this is, and green is
 * this app's word for *fine and working*, which is the claim.
 *
 * **Here rather than in `VoiceEditor`, because audiences have a default now
 * too.** It moved the moment the second section grew one — the two differ by a
 * noun and by nothing else, and two copies of a control whose whole job is to
 * make one fact look the same everywhere is the joke telling itself.
 *
 * Demotion still happens the way it always did — by another entry being
 * promoted — and that is stated on the offer rather than on the state, because
 * it is a consequence of clicking, not a fact about an entry that already has
 * it.
 */
export function DefaultControl({
  isDefault,
  onMakeDefault,
  /** What posts do with this entry, in the state's tooltip. */
  does,
  /** What promoting this one costs, on the offer's tooltip. */
  costs,
}: {
  isDefault: boolean
  onMakeDefault: () => void
  does: string
  costs: string
}) {
  if (isDefault) {
    return (
      <Tooltip>
        {/* A span, not a disabled button: there is nothing to press. A disabled
            button says "you may not do this", and what is true here is that
            this is already done. */}
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            // `h-8`, `px-3`, the button's own type — and `pt-1` for the two
            // pixels its optical top padding puts on a label. The whole point
            // of this branch is that pressing the other one does not move
            // anything, including itself.
            className="flex h-8 shrink-0 items-center gap-2 px-3 pt-1 text-[13px]/4 font-medium text-secondary-foreground"
          >
            <StarIcon
              weight="fill"
              className="size-4 text-positive"
              aria-hidden
            />
            Default
          </span>
        </TooltipTrigger>
        <TooltipContent>{does}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={onMakeDefault}>
          <StarIcon />
          <span>MAKE DEFAULT</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{costs}</TooltipContent>
    </Tooltip>
  )
}
