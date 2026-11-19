import type { ReactNode } from 'react'
import {
  CaretDownIcon,
  CaretRightIcon,
  PencilSimpleIcon,
  PlusIcon,
  StarIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, type CardStatus } from '@/components/ui/card'
import { TickBox } from '@/components/ui/tick-box'
import { cn } from '@/lib'
import { formatList } from '@/lib/intl'
import { useSettingsStore } from '@/stores/settingsStore'
import { siteHost } from '@/lib/brandDistill'
import type { BrandConsumer, BrandOrigin } from './types'

/**
 * The furniture the Brand sections sit in, and the rules that keep this screen
 * from turning back into Workspace Settings.
 *
 * Three of them, in the order they were argued:
 *
 * 1. **A section shows its material, not fields about its material.** A voice
 *    card shows a line written in that voice; an audience card shows what
 *    follows from it. The moment a card shows "3 samples · updated Tuesday" and
 *    nothing else, this is a settings screen with a nicer heading.
 * 2. **An empty slot is a gap, not a blank.** A named slot with nothing in it
 *    says *your brand has no stated guardrails* — a to-do the workspace can be
 *    measured against. That is the whole reason this is slots-and-libraries
 *    rather than a bin, and it is why `Gap` carries offers rather than a
 *    dash.
 * 3. **A section says who reads it.** CON-226 §9: material nothing reads is
 *    worse than no material, because it teaches people the app ignores what
 *    they tell it. Five equal-looking sections where only two are wired is the
 *    screen lying quietly, so every section card carries `readByStatus` and its
 *    honest value today is usually "nothing yet".
 */

/**
 * The honesty mark, as a card's `status`.
 *
 * **It only appears when the answer is "nothing".** On a wired section it
 * would be a caption stating that the feature works, which is what the user
 * should be able to assume. A section nothing reads is a fact the screen is
 * otherwise hiding; a section that behaves as advertised has nothing to
 * disclose.
 *
 * The list stays on the signature rather than collapsing to a boolean: the
 * caller's answer is *which* parts read it, and the day one is partly wired
 * this is where that gets written.
 */
export function readByStatus(
  t: TFunction,
  consumers: BrandConsumer[],
): CardStatus | undefined {
  return consumers.length > 0
    ? undefined
    : { label: t('brand.overview.nothingReads') }
}

/**
 * An empty slot, rendered as the thing that is missing plus the ways of filling
 * it — never as an empty list.
 *
 * The offers are ordered best-first and that order is the argument: reading a
 * voice off the customer's own website beats any picker, learning it from their
 * published posts beats a template, and the blank form is the escape hatch
 * rather than the default. Nobody's first act should be authoring a brand voice
 * from nothing.
 */
export function Gap({
  what,
  offers,
}: {
  /** The sentence that states the absence. Written as a fact, not a scold. */
  what: string
  offers: { label: string; hint?: string; onSelect?: () => void }[]
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-quaternary p-4">
      <p className="text-sm text-secondary-foreground">{what}</p>
      {offers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {offers.map((offer, i) => (
            <Button
              key={offer.label}
              // The first offer is the recommended one and looks it. The rest
              // are available, not equal — a row of identical buttons is a
              // menu, and a menu is what a blank box already was.
              //
              // `defaultInverted`, not `default`: the section card is
              // `bg-primary`, and the default variant *is* `bg-primary`, so a
              // filled button drawn on one of these cards is invisible. Same
              // trap anywhere else a primary action sits inside a card.
              variant={i === 0 ? 'defaultInverted' : 'outline'}
              size="sm"
              onClick={offer.onSelect}
              // An offer nothing is wired to yet renders disabled rather than
              // as a live button that does nothing — the caller saying which
              // paths exist is the callback being supplied.
              disabled={!offer.onSelect}
            >
              <span>{offer.label}</span>
              {offer.hint && (
                <span
                  className={cn(
                    'font-normal',
                    i === 0 ? 'text-primary/70' : 'text-tertiary-foreground',
                  )}
                >
                  {offer.hint}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Remembered under this id once dismissed. Named for the offer rather than for
 * the screen — renaming it brings the card back for everyone who closed it.
 */
const OFFER_NOTE_ID = 'brand-read-from-website'

/**
 * The one offer that belongs to the page rather than to a section.
 *
 * This came out of drawing it. Every empty section had "read it off your
 * website" as its best path, so an all-empty screen showed the same black
 * button four times down one page — which is the screen telling you the offer
 * was in the wrong place. Reading a website fills voices, guardrails, colours
 * and logo **in one pass**; it was never a per-section action, and repeating it
 * per section made it look like four separate visits to the same site.
 *
 * So it sits above the sections and names what it fills, and each section keeps
 * only the paths that are genuinely its own. Shown while anything is still
 * missing, and gone once nothing is — an offer that outlives its usefulness is
 * how a screen starts nagging.
 *
 * **Built like the starter groups, not like a banner and not like a hero.**
 * It has been both. As a thin strip it read as an advert; as a full card with a
 * 24px display heading it read as the most important thing on a screen whose
 * actual content is the six sections under it, and it was the one card carrying
 * nothing you can do today. What it is, exactly, is *a set of routes into
 * filling this in* — which is what the empty sections' starter cards already
 * draw, one heading and a stack of tiles. Same object, same
 * furniture: the eye reads it as an offer rather than as an announcement, and
 * the screen has one fewer card shape in it.
 *
 * **And it can be closed for good.** Not the `Explainer` contract — that one
 * bans anything the user needs while working. It is safe to lose because it is
 * a shortcut and never the only way in: every section still offers its own
 * starters and its own blank form, so someone who dismisses this has skipped a
 * fast path, not been locked out of one. The alternative was a card that
 * reappears on every visit until the brand is complete, which is the definition
 * of nagging.
 *
 * The dismissal is one-way and there is no control that undoes it — the only
 * route back is `resetAllSettings`, which resets everything else too. That is
 * acceptable for a card offering a shortcut and would not be for one carrying a
 * feature.
 *
 * **The routes are the caller's** (CON-400): the tiles are `StarterCard`s with
 * a caret, and choosing one opens it *inside this card* rather than in a modal
 * — `distill/OfferRoutes` owns that. The dismissal stays exactly where it is,
 * for the reason above: it is still a shortcut.
 */
export function WholeBrandOffer({
  fills,
  children,
}: {
  /** The sections it would populate, named. */
  fills: string[]
  /** The three routes (CON-400) — `distill/OfferRoutes`. */
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const dismissed = useSettingsStore((s) =>
    s.dismissedNotes.includes(OFFER_NOTE_ID),
  )
  const dismissNote = useSettingsStore((s) => s.dismissNote)

  if (fills.length === 0 || dismissed) return null

  // A notice: the dismiss X is the only control in its header.
  return (
    <Card
      title={t('brand.shell.offer.title')}
      onDismiss={() => dismissNote(OFFER_NOTE_ID)}
      dismissLabel={t('brand.shell.offer.dismiss')}
      capped
    >
      {/* The list is joined by `Intl`, not by this file: the conjunction and
          the serial comma are the language's, and `a, b and c` is an English
          rule that Spanish does not follow. `i18n.language` is passed rather
          than read inside, so the switch that re-renders this component is
          the same one that changes the join. */}
      <p className="text-sm text-secondary-foreground">
        {t('brand.shell.offer.body', {
          fills: formatList(fills, 'conjunction', i18n.language),
        })}
      </p>

      {children}
    </Card>
  )
}

/**
 * The measure every Brand screen is set to. The Overview's cards sit on it, so
 * a section opened from one of them has to as well — otherwise going in shifts
 * the column under you, and so does the editor a level below that: opening an
 * entry would move the column the entry was just sitting on.
 */
export const COLUMN = 'w-full max-w-content'

/**
 * A library section rendered as its own screen: a stack of full-width entries
 * with the way to add one at the bottom.
 *
 * **One entry, one card.** The first cut packed entries two-across inside a
 * single section card, which is what a summary looks like — and this is not a
 * summary, the Overview is. A card that is half the column wide cannot hold the
 * thing that actually distinguishes one entry from another (for a voice, a
 * sample written in it), so the grid was quietly deciding the screen could only
 * ever show names.
 *
 * **Adding is the last card, not a button in a header.** A header button is
 * top-right furniture, and CON-178 gives top-right to views. More to the point,
 * "add" belongs at the end of the list it adds to: that is where you are
 * looking when you have finished reading the list and found nothing that does
 * the job.
 */
export function BrandLibrary({
  children,
  add,
}: {
  children: ReactNode
  /** The add card. Omitted when there is nothing to add to — see `LibraryEmpty`. */
  add?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      {add}
    </div>
  )
}

/**
 * The card an entry sits in when the section is a screen: full column width,
 * the same `bg-primary` block `SettingsCard` uses everywhere else in the app.
 *
 * Distinct from `EntryCard`, which is the tile a *summary* uses. Same module,
 * two jobs: one is a thing in a list of things, the other is a thing you are
 * about to work on.
 *
 * **Hover lifts the card; it does not tint it.** The first version darkened the
 * surface by 3%, which is the wrong signal twice over: on a white card in a
 * column of white cards a wash that faint is nearly invisible, and where it
 * *is* visible it reads as selection — the app tints a surface when something
 * is chosen, not when the pointer is passing over it. A shadow says the card
 * can be picked up without claiming it has been. It is also what `CampaignCard`
 * already does, and these two are the same gesture: a full-width card in a
 * column that opens a screen.
 *
 * The caret comes from the same place, and earns its keep on a card that is
 * otherwise four blocks of text: nothing else on it looks clickable, and the
 * `role="button"` that makes it so is invisible to everyone using a mouse.
 */
export function LibraryCard({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        COLUMN,
        'group flex gap-4 bg-primary px-6 py-6 text-left',
        onClick &&
          'cursor-pointer transition-shadow duration-150 hover:shadow-lg',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4">{children}</div>
      {onClick && (
        // Aligned to the title's line rather than to the middle of the card:
        // the cards are different heights, and a vertically-centred caret would
        // sit at a different point on each one down the column.
        <CaretRightIcon
          className="mt-1 size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
          weight="bold"
          aria-hidden
        />
      )}
    </article>
  )
}

/**
 * One library entry, laid out — **the anatomy every library card shares**, so
 * voices, audiences and series stop being three cards that happen to sit on
 * the same white block.
 *
 * They had drifted: a voice ruled its sample and let it run to any length, a
 * series clamped its recipe and ruled nothing, an audience set its three lines
 * as a bare list. Each was defensible, and side by side down the hub's three
 * sections they read as three designers. So one order, one set of type:
 *
 * 1. **The name**, display size, with the default star beside it when there is
 *    one — the only mark allowed on the heading line.
 * 2. **One line** under it, secondary: what somebody picks this one for.
 * 3. **The substance**, in a ruled block — the thing that makes this entry
 *    different from its siblings (a sample, the three consequence lines, the
 *    recipe). Text is clamped to four lines, because a card is a preview and
 *    the editor is one click away. When there is none, the same block says so
 *    in tertiary, in the same place, so an empty entry is the same card with
 *    different words rather than a shorter one.
 * 4. **The facts**, bulleted at the foot, in the line-under-the-name colour.
 */
export function LibraryEntry({
  name,
  mark,
  line,
  substance,
  empty,
  facts,
  onOpen,
  tick,
}: {
  name: string
  /**
   * The entry's tick (CON-472): beside the card rather than in it — the card
   * is a button, and a control inside a button is two targets in one. Shown
   * under the pointer, and on every entry once any is ticked.
   */
  tick?: { checked: boolean; shown: boolean; onToggle: () => void }
  /** Beside the name — in practice `DefaultStar`. */
  mark?: ReactNode
  line?: string
  /** A string is clamped to four lines; a node is drawn as given. */
  substance?: ReactNode
  /** What the ruled block says while there is no substance. */
  empty?: string
  facts: ReactNode[]
  onOpen?: () => void
}) {
  const card = (
    <LibraryCard
      onClick={onOpen}
      className={cn(
        tick && 'pl-10',
        // Ticked, a light tint of the accent, as a ticked Ideas row is
        // (CON-486) — mixed into the card's own fill rather than laid over
        // the page, since the card sits on the grey and the row on white.
        tick?.checked &&
          'bg-[color-mix(in_srgb,var(--color-accent)_5%,var(--color-primary))]',
      )}
    >
      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
            {name}
          </h3>
          {mark}
        </div>
        {line ? (
          <p className="text-sm leading-5 text-secondary-foreground">{line}</p>
        ) : null}
      </header>

      <div className="border-l-2 border-quaternary pl-3 text-sm leading-5">
        {typeof substance === 'string' ? (
          <p className="line-clamp-4 whitespace-pre-line">{substance}</p>
        ) : substance ? (
          substance
        ) : (
          <p className="text-tertiary-foreground">{empty}</p>
        )}
      </div>

      {/* A list rather than stacked lines, because a fact wraps on a narrow
          column and without markers the wrapped half reads as another fact. */}
      <footer>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
          {facts.map((fact, i) => (
            <li key={i}>{fact}</li>
          ))}
        </ul>
      </footer>
    </LibraryCard>
  )
  if (!tick) return card
  return (
    <div className={cn(COLUMN, 'group/entry relative')}>
      {card}
      <LibraryTick name={name} {...tick} />
    </div>
  )
}

function LibraryTick({
  name,
  checked,
  shown,
  onToggle,
}: {
  name: string
  checked: boolean
  shown: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <TickBox
      checked={checked}
      onCheckedChange={onToggle}
      aria-label={t('brand.selection.select', { name })}
      className={cn(
        'absolute top-8 left-4',
        // Without hover to reveal it, a touch screen shows it from the start.
        !shown &&
          'opacity-0 group-hover/entry:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
      )}
    />
  )
}

/**
 * The add card that closes a library.
 *
 * **On the same white surface as the entries above it.** It was a dashed
 * outline on the page background for a while, on the argument that it is an
 * entry which does not exist yet — true, and it made the last row of the
 * library read as a dropzone rather than as a card, because a dashed rectangle
 * on a bare canvas is what every upload target in this app looks like. It is
 * not a placeholder for a thing; it is the control that makes one, and a
 * control is as solid as the things it sits with.
 *
 * What keeps it from competing with the real entries is not the surface but the
 * weight: the plus tile, one line of label, one line of hint, and none of the
 * material that gives an entry card its height. It is visibly the shortest
 * thing in the column, which is exactly where the eye goes after reading a list
 * and finding nothing that does the job.
 *
 * Only on a library that already has entries — the empty library's blank form
 * is a `PlainActionCard` instead.
 */
export function AddEntryCard({
  label,
  hint,
  icon: Glyph = PlusIcon,
  onClick,
}: {
  /** Literal capitals, matching the app's other action labels. */
  label: string
  hint: string
  /** Defaults to the plus. Give it a pencil when the card means "start blank". */
  icon?: Icon
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        COLUMN,
        'group flex cursor-pointer items-center gap-3 bg-primary px-6 py-5 text-left',
        'transition-shadow duration-150 hover:shadow-lg',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary transition-colors group-hover:bg-foreground group-hover:text-background">
        <Glyph className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-grotesk text-sm font-medium">{label}</span>
        <span className="text-sm text-secondary-foreground">{hint}</span>
      </span>
    </button>
  )
}

/**
 * The third card: one action, no heading and **no description**.
 *
 * Its plainness is the design. Two cards above it have spent the screen
 * explaining things, and this one is a single line — which is what makes it
 * legible as a different kind of offer rather than a third thing to read. It is
 * also the honest shape for it: there is nothing to say about a blank form
 * beyond what it is, and a sentence underneath would be a sentence written to
 * fill the space.
 *
 * Distinguished from `AddEntryCard` by what it leaves out, not by its surface:
 * both are white cards closing a library, and this one has no hint line under
 * the label because on an empty screen the two cards above it have already said
 * everything a hint would.
 */
export function PlainActionCard({
  label,
  icon: Glyph = PencilSimpleIcon,
  onClick,
}: {
  /** Literal capitals, matching the app's other action labels. */
  label: string
  icon?: Icon
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        COLUMN,
        'group flex cursor-pointer items-center gap-3 bg-primary px-6 py-5 text-left',
        'transition-shadow duration-150 hover:shadow-lg',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary transition-colors group-hover:bg-foreground group-hover:text-background">
        <Glyph className="size-5" />
      </span>
      <span className="font-grotesk text-sm font-medium">{label}</span>
    </button>
  )
}

/**
 * One of ours, offered as a starting point — the same card the campaign-type
 * chooser is made of (icon, name, what it is), because it is the same act:
 * picking which of a handful of opinionated presets this thing is going to be.
 *
 * The preset is **forked, not linked** (see `BrandOrigin`), and its job is to be
 * replaced. If every workspace keeps the one it picked, we have moved the
 * un-branded problem rather than solved it — which is why the screen goes on
 * asking for samples afterwards.
 */
export function StarterCard({
  icon: Glyph,
  tone,
  title,
  body,
  onClick,
  caret,
  pressed,
}: {
  icon: Icon
  /**
   * The section's hue. Kept on the glyph and only the glyph: three starters in
   * three colours would read as three kinds of thing, when what they are is
   * three versions of the same one.
   */
  tone?: string
  title: string
  body: string
  /**
   * Absent renders the tile as a **description rather than a control**: same
   * box, same glyph, no hover, no cursor, not focusable. That is what the
   * whole-brand offer needed while none of its routes was built, and it is a
   * better answer than a disabled button, which reads as *not right now* and
   * gets clicked to find out which permission is withholding it.
   */
  onClick?: () => void
  /**
   * A caret at the far end — `right` for a tile that goes somewhere, `down`
   * for one that has opened in place (the offer's routes, CON-400). The
   * starter groups go without: the whole tile is the target and the next
   * screen is the editor it forks into.
   */
  caret?: 'right' | 'down'
  /**
   * The tile that is open. Held in its hover look — the black hairline and
   * the grey face — so the choice reads as made rather than as passed over.
   */
  pressed?: boolean
}) {
  const Caret = caret === 'down' ? CaretDownIcon : CaretRightIcon
  const inner = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary transition-colors',
          onClick && 'group-hover:bg-primary',
          pressed && 'bg-primary',
        )}
      >
        <Glyph className="size-6" style={{ color: tone }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-secondary-foreground">{body}</span>
      </span>
      {caret && (
        <Caret
          className={cn(
            'size-4 shrink-0 text-tertiary-foreground',
            onClick && 'group-hover:text-primary-foreground',
            pressed && 'text-primary-foreground',
          )}
          weight="bold"
          aria-hidden
        />
      )}
    </>
  )

  const box =
    'flex items-center gap-3 rounded-md border border-quaternary px-4 py-4 text-left'

  if (!onClick) {
    return <div className={cn(box, 'border-dashed')}>{inner}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={caret === 'down' ? pressed : undefined}
      className={cn(
        box,
        'group cursor-pointer transition-colors hover:border-foreground hover:bg-secondary',
        pressed && 'border-foreground bg-secondary',
      )}
    >
      {inner}
    </button>
  )
}

/**
 * The card a library entry sits in. One shape for voices, audiences and
 * templates, because the primitive is one primitive — four cards designed
 * separately is how a module ends up reading as four features sharing a screen.
 */
export function EntryCard({
  title,
  meta,
  children,
  footer,
  onClick,
}: {
  title: ReactNode
  /** Sits opposite the title — a role, a default marker, a warning. */
  meta?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClick?: () => void
}) {
  return (
    <article
      // A button rather than a link in the harness; the real screen navigates.
      // Either way the whole card is the target: the material is the thing you
      // click, and a card whose only handle is a pencil in the corner reads as
      // a record rather than as something being worked on.
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'flex flex-col gap-3 rounded-md bg-secondary p-4 text-left',
        onClick && 'cursor-pointer transition-colors hover:bg-tertiary',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-grotesk text-sm font-medium leading-5">{title}</h3>
        {meta}
      </header>
      {children}
      {footer}
    </article>
  )
}

/**
 * Which entry the app falls back to — a star, wherever that entry is listed.
 *
 * **One mark, three screens.** It replaces the dot-and-word the voice card
 * carried on its own, because the same fact is now told in three places (the
 * Overview's rows, the two library screens) and by the two editors, and the
 * editors were already using a star. A fact that looks like a dot in a list and
 * a star in the form it opens is two facts as far as anybody reading is
 * concerned.
 *
 * **The colour is the second half of the fact, and it is the useful half.**
 * Being the default is not an achievement — it is the ordinary resting state of
 * one of four voices — but being the default *with nothing behind you* is the
 * one thing on these screens actually worth finding, because it is the case
 * where every post the workspace generates falls back to material that changes
 * nothing. Green is this app's word for fine and working; the grey is the same
 * grey as an unticked row, so the two marks agree down a column.
 *
 * Positive green rather than the section's own hue, on both sections, even
 * though audiences' hue is itself a green: the hue means *which section this
 * is* — it is the colour of the page header, the Overview card and the empty
 * state — and a second meaning laid over it breaks both readings.
 *
 * No tooltip, and the word stays: a mark whose meaning is only available on
 * hover is not available at all in a list somebody is scanning, and the whole
 * sentence goes to a screen reader through the label.
 */
export function DefaultStar({
  backed,
  label,
  word = true,
  className,
}: {
  /** Whether the entry has the material behind it that makes it worth being the default. */
  backed: boolean
  /** The whole fact, for a screen reader — the visible word is only one of it. */
  label: string
  /**
   * Whether to print `default` beside the mark.
   *
   * `false` on the Overview, where the star has taken the row's leading slot:
   * it is 16px wide, the label column starts after it, and a word in there
   * would push every name on the card out of line with every other card's. The
   * sentence still goes to a screen reader through `label` — which is the half
   * that was doing the work.
   */
  word?: boolean
  /** Type for the mark; it inherits nothing of its own. See `OriginLine`. */
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <span
      aria-label={label}
      className={cn('flex shrink-0 items-center gap-1.5', className)}
    >
      {/* Filled and green when the entry has what it takes to be the default,
          hollow when it has not. Weight carries the same fact the colour does,
          which is what makes it legible where the mark stands alone — on the
          Overview it has replaced the row's tick, and a grey filled star there
          would read as a decoration rather than as a finding. */}
      <StarIcon
        weight={backed ? 'fill' : 'regular'}
        aria-hidden
        className={cn(
          'size-4',
          backed ? 'text-positive' : 'text-senary-foreground',
        )}
      />
      {word && t('brand.shell.default')}
    </span>
  )
}

/**
 * Where an entry came from, at the foot of its card.
 *
 * Load-bearing for the template path specifically: a template is **forked,
 * never linked**, so this line is the only thing connecting an entry to what it
 * started as. It makes a reset possible, and it is how we find out whether the
 * template's job — to be replaced — is actually being done.
 */
export function OriginLine({
  origin,
  className,
}: {
  origin: BrandOrigin
  /**
   * Type for the line, when its container has not already set some.
   *
   * Inherits by default, because on a library card this is one bullet in a list
   * whose other bullets are plain text — a line that carried its own size and
   * colour would be the one item in the list set differently, which is exactly
   * the thing that made those cards read as a form. The summary tiles pass
   * their own.
   */
  className?: string
}) {
  const { t } = useTranslation()

  // Four of the details are the customer's own words — a template's name,
  // their site, a document's title, a post's title — and stay exactly as they
  // are. Only the post count is a sentence of ours, and it is the only one
  // that needs counting. The site is its host alone: "Read off the website ·
  // acme-roasters.com" is the line, and a scheme and a trailing slash are noise
  // in it. Answers have no detail — the origin is the whole fact.
  const detail =
    origin.kind === 'template'
      ? origin.templateName
      : origin.kind === 'website'
        ? siteHost(origin.url)
        : origin.kind === 'document'
          ? origin.title
          : origin.kind === 'posts'
            ? t('brand.shell.originPostCount', { count: origin.count })
            : origin.kind === 'promoted'
              ? origin.fromPost
              : null

  return (
    <p className={className}>
      {t(`brand.shell.origin.${origin.kind}` as const)}
      {detail && <span> · {detail}</span>}
    </p>
  )
}

/**
 * A short list rendered as prose-ish chips — banned words, claims, typefaces.
 * Truncating rather than scrolling: this screen is an index, and the full list
 * belongs in the editor one level down.
 */
export function ChipList({
  items,
  max = 6,
}: {
  items: string[]
  max?: number
}) {
  const { t } = useTranslation()
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <span
          key={item}
          className="rounded border border-quaternary px-1.5 py-0.5 text-xs text-secondary-foreground"
        >
          {item}
        </span>
      ))}
      {rest > 0 && (
        <span className="px-1.5 py-0.5 text-xs text-tertiary-foreground">
          {t('brand.shell.chipMore', { count: rest })}
        </span>
      )}
    </div>
  )
}
