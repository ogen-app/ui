import type { ReactNode } from 'react'
import {
  FileArrowUpIcon,
  GlobeIcon,
  PencilSimpleIcon,
  PlusIcon,
  SparkleIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { useSettingsStore } from '@/stores/settingsStore'
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
 *    screen lying quietly, so `ReadBy` is mandatory and its honest value today
 *    is usually "nothing yet".
 *
 * Deliberately *not* `SettingsCard`. The two look close on purpose — same
 * column, same block — but this one carries the two beats settings has no use
 * for (the reader line and the gap), and sharing the component would have meant
 * adding both to a card whose whole job elsewhere is a form.
 */

export function BrandSection({
  title,
  /** The rest of the heading, set back — usually a count. */
  qualifier,
  readBy,
  action,
  children,
  className,
  variant = 'card',
}: {
  title: string
  qualifier?: ReactNode
  /**
   * Which parts of the app read this. Required, and `[]` is a real answer that
   * renders as such — see the rule above.
   */
  readBy: BrandConsumer[]
  action?: ReactNode
  children: ReactNode
  className?: string
  /**
   * `card` — one of several sections stacked on the Overview.
   * `page` — the section *is* the screen, on its own tab.
   *
   * The page variant drops the card chrome and the heading, because the tab bar
   * above already says which section this is and a card drawn on an otherwise
   * empty page is a card pretending to be a screen. The reader line and the
   * action survive: those are the section's, not the card's.
   *
   * The measure is deliberately unchanged between the two. Giving a section its
   * own tab is a navigation decision, and widening what it reads at is a
   * separate one that has not been made — keeping `max-w-content` here means
   * the move to tabs changes where things live without quietly changing how
   * they look.
   */
  variant?: 'card' | 'page'
}) {
  const isPage = variant === 'page'

  return (
    <section
      className={cn(
        'flex w-full max-w-content mx-auto flex-col gap-4',
        !isPage && 'rounded-lg bg-primary p-5',
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          {!isPage && (
            <h2 className="font-display text-lg font-medium leading-6">
              {title}
              {qualifier != null && (
                <span className="font-normal text-tertiary-foreground"> {qualifier}</span>
              )}
            </h2>
          )}
          <ReadBy consumers={readBy} />
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

const CONSUMER_PHRASE: Record<BrandConsumer, string> = {
  plan: 'when a content plan is generated',
  post: 'when a post is written',
  images: 'when an image is branded',
}

/**
 * The honesty line. Written as a sentence rather than a row of badges because a
 * badge saying "unused" is decoration, and this has to be legible enough to
 * embarrass us into wiring the section up.
 */
export function ReadBy({ consumers }: { consumers: BrandConsumer[] }) {
  if (consumers.length === 0) {
    return (
      <p className="text-xs text-tertiary-foreground">
        Nothing reads this yet — you can fill it in, but it won't change what
        comes out.
      </p>
    )
  }

  const phrases = consumers.map((c) => CONSUMER_PHRASE[c])
  const sentence =
    phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`

  return <p className="text-xs text-tertiary-foreground">Read {sentence}.</p>
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
 * **Built like the section cards, not like a banner.** The first cut was a thin
 * strip: a small bold line, a grey caption and a button pushed to the right
 * margin. Every other card on this screen leads with a chip, a display heading
 * and body copy at full strength, so the one card carrying the best thing the
 * screen can do for you was also the one that looked like an advert. Same
 * anatomy as `LibraryEmpty` now, for the same reason: this is a card offering
 * to do something, and the explanation is most of it.
 *
 * **And it can be closed for good.** Not the `Explainer` contract — that one
 * bans anything the user needs while working, and this is an action. It is safe
 * to lose because it is a shortcut and never the only way in: every section
 * still offers its own starters and its own blank form, so someone who dismisses
 * this has skipped a fast path, not been locked out of one. The alternative was
 * a card that reappears on every visit until the brand is complete, which is
 * the definition of nagging.
 */
export function WholeBrandOffer({
  fills,
  onFromWebsite,
  onFromDocument,
  onAskOgen,
}: {
  /** The sections it would populate, named. */
  fills: string[]
  onFromWebsite?: () => void
  /** For a workspace whose brand is already written down somewhere. */
  onFromDocument?: () => void
  /** For one where it is not written down anywhere. */
  onAskOgen?: () => void
}) {
  const dismissed = useSettingsStore((s) => s.dismissedNotes.includes(OFFER_NOTE_ID))
  const dismissNote = useSettingsStore((s) => s.dismissNote)

  if (fills.length === 0 || dismissed) return null

  return (
    <section className={cn(COLUMN, 'relative flex flex-col gap-5 bg-primary px-6 py-6')}>
      {/* Parked in the corner rather than sharing the action row: closing the
          card is not one of the things it offers to do. */}
      <Button
        variant="ghost"
        size="smIcon"
        className="absolute top-3 right-3"
        aria-label="Don't offer this again"
        onClick={() => dismissNote(OFFER_NOTE_ID)}
      >
        <XIcon />
      </Button>

      {/* The one chip on this screen that is filled rather than tinted. Accent
          is a fill and not an ink (it fails as text — see docs/colors.md), and
          this is the screen's single promoted action, so it gets the fill. */}
      <header className="flex max-w-2xl flex-col gap-3 pr-10">
        <span className="flex size-10 items-center justify-center rounded-md bg-accent text-primary">
          <GlobeIcon className="size-6" />
        </span>
        <h2 className="font-display text-2xl font-medium leading-8 tracking-tight">
          Read the rest off your website
        </h2>
        <p className="text-sm leading-5">
          One pass fills {joinList(fills)} — from your own copy, not from a
          template. You see everything it proposes before any of it is saved.
        </p>
        {/* Both halves of the offer are the explanation, so both are set the
            same. This one was a tertiary footnote *under* the buttons, which
            put the answer to "what if I have neither" after the point at which
            somebody with neither has already given up on the card. */}
        <p className="text-sm leading-5">
          If none of it is written down anywhere, Ogen will ask you a handful of
          questions and draft it with you. If it is — a brand deck, a
          tone-of-voice PDF, an old style guide — that works as well as the site
          does.
        </p>
      </header>

      {/* Three ways in, and the first one looks like the recommendation it is.
          Ogen leads: a website read is the better raw material when there is a
          website worth reading, but answering a few questions is the path that
          works for every workspace, and the one nobody has to go and find a URL
          or a file for first.

          Capitals because these are the actions, not links in a paragraph: same
          rule the rest of the app's action labels follow, and the caps are the
          copy rather than a CSS transform. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="defaultInverted" size="sm" onClick={onAskOgen}>
          <SparkleIcon />
          <span>ASK OGEN TO HELP</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onFromWebsite}>
          <GlobeIcon />
          <span>POINT US AT YOUR SITE</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onFromDocument}>
          <FileArrowUpIcon />
          <span>UPLOAD A DOCUMENT</span>
        </Button>
      </div>
    </section>
  )
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The measure every Brand screen is set to. The tab bar and the Overview's
 * cards already sit on it; a section that is its own screen has to as well, or
 * moving between tabs shifts the column under you — and so does an editor one
 * level down, or opening an entry would shift the column the entry was just
 * sitting on.
 */
export const COLUMN = 'mx-auto w-full max-w-content'

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
  readBy,
  children,
  add,
}: {
  readBy: BrandConsumer[]
  children: ReactNode
  /** The add card. Omitted when there is nothing to add to — see `LibraryEmpty`. */
  add?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={cn(COLUMN, 'px-1')}>
        <ReadBy consumers={readBy} />
      </div>
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
        'flex flex-col gap-4 bg-primary px-6 py-6 text-left',
        onClick && 'cursor-pointer transition-colors hover:bg-primary-foreground/[0.03]',
        className,
      )}
    >
      {children}
    </article>
  )
}

/**
 * The add card that closes a library. Dashed rather than filled: it is an
 * outline of an entry that does not exist yet, and it must not compete with the
 * real ones above it for the eye.
 *
 * Only on a library that already has entries. The empty library's blank form is
 * a `PlainActionCard` instead — dashed means "an entry that isn't there yet",
 * which is the wrong thing to say on a screen where none of them are.
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
        'group flex items-center gap-3 border border-dashed border-quaternary px-6 py-5 text-left transition-colors hover:border-foreground hover:bg-primary',
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
 * An empty library is **three cards, not one**: what is missing, the ones we
 * offer, and the blank form. `LibraryIntro` is the first.
 *
 * The single card that did all three ran the explanation, a sub-list and an
 * escape hatch together in one block, so the page had one entry point and you
 * read it top to bottom or not at all. Split, each card is one decision, and
 * the stack matches the *filled* screen — which is also a column of white
 * cards, one per thing. That is the real gain: the empty state stops being a
 * different kind of screen that resolves into a list later, and is instead the
 * same screen with different cards in it.
 *
 * This one holds only the description, and on a filled library it is not shown
 * at all — its slot is where the entries go.
 *
 * Deliberately **no faded body copy**. The old empty state set its explanation
 * in tertiary, which is the tone the app uses for asides, and an aside is
 * exactly what this is not: on an empty section the explanation is the entire
 * content of the screen, and setting the only thing on the page in the quietest
 * colour available reads as the screen apologising for itself.
 */
export function LibraryIntro({
  icon: Glyph,
  tone,
  title,
  body,
}: {
  icon: Icon
  /** The section's hue (`BrandSectionInfo.tone`) — see `brandSections`. */
  tone?: string
  title: string
  body: string
}) {
  return (
    <div className={cn(COLUMN, 'flex flex-col gap-3 bg-primary px-6 py-6')}>
      <span className="flex size-10 items-center justify-center rounded-md bg-secondary">
        <Glyph className="size-6" style={{ color: tone }} />
      </span>
      {/* The measure is on the text, never on the card: the three cards share
          one column edge, and a card that stops short of it reads as a
          different kind of card rather than as a shorter one. */}
      <h2 className="max-w-2xl font-display text-2xl font-medium leading-8 tracking-tight">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-5">{body}</p>
    </div>
  )
}

/**
 * The second card: the ones we offer, under a heading of their own.
 *
 * The heading is *on* the card rather than floating above it, and it is a
 * heading rather than a label — this is a group of things you choose between,
 * and a bare row of tiles under a section that has already finished explaining
 * itself does not say what the tiles are for. It takes the same
 * display-heading-plus-secondary-line shape every entry card uses on the filled
 * screen, so the two states are built from one grammar.
 */
export function StarterGroup({
  title,
  body,
  children,
}: {
  title: string
  /** One line: what picking one actually does. */
  body: string
  children: ReactNode
}) {
  return (
    <div className={cn(COLUMN, 'flex flex-col gap-4 bg-primary px-6 py-6')}>
      <header className="flex max-w-2xl flex-col gap-1">
        <h3 className="font-display text-lg font-medium leading-6 tracking-tight">
          {title}
        </h3>
        <p className="text-sm leading-5 text-secondary-foreground">{body}</p>
      </header>
      <div className="grid gap-3">{children}</div>
    </div>
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
 * White rather than dashed, unlike `AddEntryCard`. Dashed means "an entry that
 * is not there yet", which is the wrong claim on a screen where none of them
 * are — there it reads as another gap rather than as the way out of one.
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
        'group flex items-center gap-3 bg-primary px-6 py-5 text-left transition-colors hover:bg-secondary',
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
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-md border border-quaternary px-4 py-4 text-left transition-colors hover:border-foreground hover:bg-secondary"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary transition-colors group-hover:bg-primary">
        <Glyph className="size-6" style={{ color: tone }} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-secondary-foreground">{body}</span>
      </span>
    </button>
  )
}

/** The `ADD …` control a library section carries in its header. */
export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <PlusIcon />
      <span>{label}</span>
    </Button>
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

const ORIGIN_LABEL: Record<BrandOrigin['kind'], string> = {
  blank: 'Written here',
  template: 'From a template',
  website: 'Read off the website',
  posts: 'Learned from published posts',
  promoted: 'Saved from a post',
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
  const detail =
    origin.kind === 'template'
      ? origin.templateName
      : origin.kind === 'website'
        ? origin.url
        : origin.kind === 'posts'
          ? `${origin.count} posts`
          : origin.kind === 'promoted'
            ? origin.fromPost
            : null

  return (
    <p className={className}>
      {ORIGIN_LABEL[origin.kind]}
      {detail && <span> · {detail}</span>}
    </p>
  )
}

/**
 * A short list rendered as prose-ish chips — banned words, claims, typefaces.
 * Truncating rather than scrolling: this screen is an index, and the full list
 * belongs in the editor one level down.
 */
export function ChipList({ items, max = 6 }: { items: string[]; max?: number }) {
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
          +{rest} more
        </span>
      )}
    </div>
  )
}
