import type { ReactNode } from 'react'
import {
  CaretRightIcon,
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
   * `page` — the section *is* the screen, opened from the Overview.
   *
   * The page variant drops the card chrome, the heading and the reader line,
   * because the section's intro card says all three above it and a card drawn
   * on an otherwise empty page is a card pretending to be a screen. Only the
   * action survives: that one is the section's, not the card's.
   *
   * The measure is deliberately unchanged between the two. Giving a section a
   * screen of its own is a navigation decision, and widening what it reads at
   * is a separate one that has not been made — keeping `max-w-content` here
   * means the move changes where things live without quietly changing how they
   * look.
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
      {/* Nothing left to draw on a page-variant section with no action: the
          intro card at the top of the screen carries both the heading and the
          honesty line, and an empty header still spends the stack's `gap`. */}
      {(!isPage || action) && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            {!isPage && (
              <>
                <h2 className="font-display text-lg font-medium leading-6">
                  {title}
                  {qualifier != null && (
                    <span className="font-normal text-tertiary-foreground">
                      {' '}
                      {qualifier}
                    </span>
                  )}
                </h2>
                <ReadBy consumers={readBy} />
              </>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/**
 * The honesty line. Written as a sentence rather than a row of badges because a
 * badge saying "unused" is decoration, and this has to be legible enough to
 * embarrass us into wiring the section up.
 *
 * **It only appears when the answer is "nothing".** It used to run on every
 * section, and on a wired one it said "Read when a content plan is generated
 * and when a post is written" — a caption above the library stating that the
 * feature works, which is what the user should be able to assume. That is the
 * difference between honesty and narration: a section nothing reads is a fact
 * the screen is otherwise hiding, and a section that behaves as advertised has
 * nothing to disclose. Three of the five sections still show this line today,
 * which is the point of keeping it.
 *
 * The list stays on the signature rather than collapsing to a boolean: the
 * caller's answer is *which* parts read it, and the day one is partly wired
 * this component is where that sentence gets written.
 */
export function ReadBy({ consumers }: { consumers: BrandConsumer[] }) {
  if (consumers.length > 0) return null

  // Set at the card's own measure rather than in micro-type. It was 12px, and
  // a sentence saying the section does not work yet is not a caption — small
  // type is how a screen signals "detail, skip this", which is the opposite of
  // what this line is for. Dimmer than the description above it, same size.
  return (
    <p className="max-w-2xl text-sm leading-5 text-tertiary-foreground">
      Nothing reads this yet — you can fill it in, but it won't change what
      comes out.
    </p>
  )
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
  const dismissed = useSettingsStore((s) =>
    s.dismissedNotes.includes(OFFER_NOTE_ID),
  )
  const dismissNote = useSettingsStore((s) => s.dismissNote)

  if (fills.length === 0 || dismissed) return null

  return (
    <section
      className={cn(
        COLUMN,
        'relative flex flex-col gap-5 bg-primary px-6 py-6',
      )}
    >
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
 * The measure every Brand screen is set to. The Overview's cards sit on it, so
 * a section opened from one of them has to as well — otherwise going in shifts
 * the column under you, and so does the editor a level below that: opening an
 * entry would move the column the entry was just sitting on.
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
 * The card a section opens with, and **the page's title** — not an
 * introduction to one.
 *
 * The section screens carry no heading in the page header: the header is a back
 * caret and nothing else, the way the post editor's is. That is not a saving of
 * chrome, it is where the name went. A page header states a name in a line; this
 * states it in the one card that can also say what the thing is, which on a
 * section somebody has opened once and not since is the more useful half.
 *
 * Same anatomy as `WholeBrandOffer` — the glyph in the section's hue, a display
 * heading, and the sentences under it — because they are the same kind of
 * object: a white card at the top of the column that explains rather than
 * lists. Both were arrived at separately and looked it, which is the usual sign
 * that one of them is a copy of the other with different padding.
 *
 * It began as the first of the **three cards an empty library is** (what is
 * missing, the ones we offer, the blank form) and was shown only while the
 * section had nothing in it. Promoting it to always-on cost nothing and settled
 * two things at once: the page got its name back, and the empty state stopped
 * being a different kind of screen that resolves into a list later. It is now
 * the same screen with the same first card, which gains one line while the
 * section is empty and loses it when the section is not.
 *
 * Deliberately **no faded body copy**. The old empty state set its explanation
 * in tertiary, which is the tone the app uses for asides, and an aside is
 * exactly what this is not: on an empty section the explanation is the entire
 * content of the screen, and setting the only thing on the page in the quietest
 * colour available reads as the screen apologising for itself.
 */
export function BrandIntro({
  icon: Glyph,
  tone,
  title,
  body,
  missing,
  readBy,
  wide,
}: {
  icon: Icon
  /** The section's hue (`BrandSectionInfo.tone`) — see `brandSections`. */
  tone?: string
  title: string
  body: string
  /**
   * The cost of the section being empty, given only while it is. Set below the
   * description rather than in place of it: what a voice is does not stop being
   * worth saying once there is one.
   */
  missing?: string
  /** The honesty line's answer — see `ReadBy`. */
  readBy: BrandConsumer[]
  /**
   * Span the panel instead of the column.
   *
   * The card takes the measure of whatever is under it, and one section's
   * content is not on the column: Templates is a platform rail beside a detail
   * panel, edge to edge. A `max-w-content` card floating above that reads as a
   * card belonging to some other screen.
   */
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        wide ? 'w-full' : COLUMN,
        'flex flex-col gap-3 bg-primary px-6 py-6',
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-md bg-secondary">
        <Glyph className="size-6" style={{ color: tone }} />
      </span>
      {/* The measure is on the text, never on the card: every card in the
          column shares one edge, and one that stops short of it reads as a
          different kind of card rather than as a shorter one. */}
      <h1 className="max-w-2xl font-display text-2xl font-medium leading-8 tracking-tight">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-5">{body}</p>
      {missing && (
        <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
          {missing}
        </p>
      )}
      {/* Renders nothing on a wired section, and costs no gap when it does:
          `ReadBy` returns null rather than an empty node. */}
      <ReadBy consumers={readBy} />
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
export function AddButton({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
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
export function ChipList({
  items,
  max = 6,
}: {
  items: string[]
  max?: number
}) {
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
