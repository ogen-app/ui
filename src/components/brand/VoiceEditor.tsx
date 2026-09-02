import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ModalContainer } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import {
  BrandEditorFrame,
  DangerCard,
  DefaultControl,
  EditorCard,
  EditorIntro,
  Field,
  ForkedNote,
} from './editor'
import type { VoiceStarter } from './VoicesSection'
import {
  MIN_VOICE_SAMPLES,
  type BrandUsage,
  type BrandVoice,
  type VoiceRules,
} from './types'

/**
 * The one place a voice is written — the editor the library has been promising
 * since the first card was drawn.
 *
 * ## Why this screen exists at all
 *
 * Every Brand section is an *index*: it shows material, never fields about
 * material, and it commits nothing. That rule is only affordable because the
 * work happens one level down, and until this file the level down did not
 * exist — `onAdd`, `onOpen` and `onStart` were props that went nowhere, so a
 * starter card, `ADD VOICE` and clicking a voice were three dead controls
 * pretending to be a feature.
 *
 * ## Samples are the screen, not a field on it
 *
 * The obvious build is a settings form: name, description, five dropdowns,
 * save. That form produces the exact failure the section was designed to make
 * visible — a voice named "Witty, professional, bold" with nothing behind it,
 * generating what no voice at all would. So the samples get the largest block,
 * our reading of them in the sub-heading where the definition would be, and a
 * card of their own that is always the next thing to press.
 *
 * The rules sit *below* the samples and are framed as what a sample cannot say:
 * a pasted post shows you the register, it cannot promise that every future
 * post avoids hashtags. That framing is the whole argument for keeping them
 * at all.
 *
 * ## What it does not do
 *
 * - **Nothing is blocked.** A voice with no samples saves. The section already
 *   renders that state as conspicuously hollow, and refusing to save it would
 *   move a judgement the screen makes visibly into a validator that just says
 *   no. The only blocker is a missing name, because a nameless entry cannot be
 *   listed.
 * - **Nothing is persisted.** There is no Brand endpoint (CON-228). The draft
 *   lives in local state and `onSave` hands the assembled voice back to the
 *   caller — which is also why this is plain `useState` rather than RHF +
 *   `ui/form.tsx`: the convention is for forms with a payload and a validation
 *   contract, and this has neither yet. It becomes RHF the day the endpoint
 *   defines what a rejected voice looks like.
 * - **`summary` is not editable.** It is read off the samples by us, not typed
 *   — see `BrandVoice.summary`. Editing samples therefore invalidates it, and
 *   the screen says so rather than showing a stale reading.
 *
 * The commit is a `PageActionBar` and there is no autosave, per CON-178: this
 * is an editor screen, and the one thing the index deliberately has no room for
 * is a commit.
 */
export function VoiceEditor({
  header,
  voice,
  starter,
  first = false,
  onSave,
  onCancel,
  onDelete,
}: {
  /**
   * The page header, rendered *inside* this component's scroller.
   *
   * It belongs to the route, which knows where back goes — but it has to be a
   * child of the scroll container for the sticky gradient to have anything to
   * dissolve, and the scroll container is here. Passing it down is cheaper than
   * moving the scroller up and leaving the action bar behind. Same arrangement
   * as post details.
   */
  header?: ReactNode
  /** The voice being edited, or `null` when writing a new one. */
  voice: BrandVoice | null
  /** The template this was forked from, when arriving via a starter card. */
  starter?: VoiceStarter | null
  /**
   * Whether the library is empty — i.e. this is the workspace's first voice.
   *
   * The one thing on this screen the editor cannot work out for itself, and the
   * route has to be sure of it rather than guess: `false` while the library is
   * still loading would silently cost the workspace its default, and `true`
   * would silently take it off whichever voice has it. See `draftFrom`.
   */
  first?: boolean
  onSave?: (voice: BrandVoice) => void
  onCancel?: () => void
  /** Only offered for a voice that exists. */
  onDelete?: () => void
}) {
  const initial = useMemo(
    () => draftFrom(voice, starter, first),
    [voice, starter, first],
  )
  const [draft, setDraft] = useState<Draft>(initial)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))
  const setRule = <K extends keyof VoiceRules>(key: K, value: VoiceRules[K]) =>
    setDraft((d) => ({ ...d, rules: { ...d.rules, [key]: value } }))

  const named = draft.name.trim().length > 0
  const samplesChanged =
    draft.samples.join('\u0000') !== (voice?.samples ?? []).join('\u0000')

  return (
    <BrandEditorFrame
      header={header}
      contentKey={voice ? 'edit' : 'new'}
      blocker={named ? undefined : 'Needs a name before it can be saved.'}
      commitLabel={voice ? 'Save voice' : 'Create voice'}
      onCancel={onCancel}
      onSave={() => onSave?.(assemble(draft, voice, starter))}
    >
      <VoiceIntro name={voice?.name} />

      {starter && !voice && (
        <ForkedNote icon={starter.icon} title={starter.title}>
          Nothing is saved yet, and the samples are empty: that is the half a
          template cannot give you, and the half that does the work.
        </ForkedNote>
      )}

      <EditorCard
        title="General"
        action={
          <DefaultControl
            isDefault={draft.isDefault}
            onMakeDefault={() => set('isDefault', true)}
            does="Posts start in this voice unless another one is picked."
            costs="Takes the default off whichever voice has it now."
          />
        }
      >
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Founder, off the cuff"
          />
        </Field>
        {/* The field the library shows under the name, and the reason it is
            labelled by what it is *for*: "description" invites a paragraph
            about the voice, and what belongs here is the one line that
            makes somebody pick this voice over the other three. */}
        <Field
          label="Description"
          hint="When to use it — one line, and the one a picker shows under the name."
        >
          <Input
            value={draft.whenToUse}
            onChange={(e) => set('whenToUse', e.target.value)}
            placeholder="The lighter end-of-week post, and nothing else"
          />
        </Field>
      </EditorCard>

      <SamplesCard
        samples={draft.samples}
        // What `Reset` goes back to. `initial` rather than `voice`, so a
        // voice forked from a starter resets to the starter's samples and a
        // new one resets to none — the state the screen opened in, which is
        // what anybody means by resetting a form they have been typing in.
        saved={initial.samples}
        onChange={(samples) => set('samples', samples)}
        summary={samplesChanged ? null : voice?.summary || null}
      />

      <EditorCard
        title="Rules"
        hint="What a sample cannot say for itself. A pasted post shows the register; it cannot promise that the next thirty avoid hashtags."
      >
        {/* Two columns, and the only two on the screen. It is affordable
            here for the reason it was not when these were one-line
            controls: a stacked radio group is a block with a straight left
            edge, so a column of them still reads down one line, and five of
            them one under the other is a scroll rather than a card. The
            written-out habits below stay full measure — they are prose,
            and prose gets the whole column. */}
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <ChoiceRow
            label="Formality"
            value={draft.rules.formality}
            options={FORMALITY}
            onChange={(v) => setRule('formality', v)}
          />
          <ChoiceRow
            label="Speaks as"
            value={draft.rules.person}
            options={PERSON}
            onChange={(v) => setRule('person', v)}
          />
          <ChoiceRow
            label="Emoji"
            value={draft.rules.emoji}
            options={EMOJI}
            onChange={(v) => setRule('emoji', v)}
          />
          <ChoiceRow
            label="Hashtags"
            value={draft.rules.hashtags}
            options={HASHTAGS}
            onChange={(v) => setRule('hashtags', v)}
          />
          <ChoiceRow
            label="Length"
            value={draft.rules.length}
            options={LENGTH}
            onChange={(v) => setRule('length', v)}
          />
        </div>
        {/* The two written-out habits, one under the other, because they
            are one question asked at both ends of a post — and a voice that
            is unmistakable at the top and generic at the bottom is the
            failure worth being able to read straight down. */}
        <div className="flex flex-col gap-4">
          <Field
            label="How a post opens"
            hint="The most recognisable habit a voice has, and worth writing out rather than picking."
          >
            <Input
              value={draft.rules.opening}
              onChange={(e) => setRule('opening', e.target.value)}
              placeholder="Opens with the claim, then earns it."
            />
          </Field>
          <Field
            label="How a post closes"
            hint="The half people notice when it is wrong: a question, a call to action, or nothing at all."
          >
            <Input
              value={draft.rules.closing}
              onChange={(e) => setRule('closing', e.target.value)}
              placeholder="Ends on the sharpest line, not on a summary."
            />
          </Field>
        </div>
      </EditorCard>

      <EditorCard
        title="Per-channel customisation"
        hint="A note inside this voice, not a second voice. “Dialled down on LinkedIn” belongs here; a near-identical second entry in the library does not."
      >
        {/* Collapsed to a placeholder on purpose. It was six inputs — one
            per platform — which is a lot of screen spent on a question
            nobody has answered yet: whether a per-channel note is a free
            line, an override of the rules above, or a separate sample set.
            Six empty boxes assert the first, and the assertion was costing
            more room than the samples. Any notes already written are kept
            and saved untouched; only the editing is parked. */}
        <p className="max-w-2xl text-sm leading-5 text-tertiary-foreground">
          Not built yet. Every channel uses this voice exactly as written above.
        </p>
      </EditorCard>

      {voice && onDelete && (
        <DangerCard
          noun="VOICE"
          name={voice.name}
          cost={deletionCost(voice.usage)}
          onDelete={onDelete}
        />
      )}
    </BrandEditorFrame>
  )
}

/* ---------------------------------------------------------------- the draft */

type Draft = Pick<
  BrandVoice,
  'name' | 'whenToUse' | 'isDefault' | 'samples' | 'rules' | 'channelNotes'
>

/** What a voice starts as when nobody has picked anything: the middle of every scale. */
const BLANK_RULES: VoiceRules = {
  formality: 'neutral',
  person: 'we',
  emoji: 'sparingly',
  hashtags: 'few',
  length: 'medium',
  opening: '',
  closing: '',
}

/**
 * What the editor opens with.
 *
 * `first` is the only argument that changes an *unsaved* voice's meaning, and
 * it is worth the prop. A new voice is not born the default, because promotion
 * demotes somebody else's entry and a Create button does not get to do that
 * quietly — but there is nobody to demote in an empty library, and a workspace
 * whose only voice is not its default has just filled in a section that changes
 * nothing: every post falls back past it to no voice at all. So the first one
 * takes the flag, visibly, on a control the writer can see before they commit.
 */
function draftFrom(
  voice: BrandVoice | null,
  starter?: VoiceStarter | null,
  first = false,
): Draft {
  if (voice) {
    return {
      name: voice.name,
      whenToUse: voice.whenToUse,
      isDefault: voice.isDefault,
      samples: voice.samples,
      rules: voice.rules,
      channelNotes: voice.channelNotes,
    }
  }
  // A fork takes the starter's name, use and rules — and, deliberately, none of
  // its samples. See `VoiceStarter.draft`.
  const seed = starter?.draft
  return {
    name: seed?.name ?? '',
    whenToUse: seed?.whenToUse ?? '',
    isDefault: first,
    samples: [],
    rules: seed?.rules ?? BLANK_RULES,
    channelNotes: {},
  }
}

/**
 * The draft as a whole voice, for the caller to store.
 *
 * `summary` is cleared whenever the samples have moved, rather than carried
 * forward: it is our reading of the samples, and a reading of text that no
 * longer exists is worse than none — it is the drift the field was added to
 * make visible, pointing the wrong way.
 *
 * The id is `''` for a voice that has never been stored. Ids are the server's
 * (CON-228), so a create is a `POST` with no id and the real one arrives in the
 * response; minting a UUID here would be the client guessing at an answer only
 * the server has.
 */
function assemble(
  draft: Draft,
  voice: BrandVoice | null,
  starter?: VoiceStarter | null,
): BrandVoice {
  const samplesChanged =
    draft.samples.join('\u0000') !== (voice?.samples ?? []).join('\u0000')
  return {
    id: voice?.id ?? '',
    ...draft,
    summary: samplesChanged ? '' : (voice?.summary ?? ''),
    usage: voice?.usage ?? { drafts: 0, published: 0 },
    origin:
      voice?.origin ??
      (starter
        ? { kind: 'template', templateName: starter.title }
        : { kind: 'blank' }),
    updatedAt: new Date().toISOString(),
    postsBehind: voice?.postsBehind,
  }
}

/* -------------------------------------------------------------- the samples */

/**
 * The block the screen is built around.
 *
 * ## A sample is a card you open, not a box you are already inside
 *
 * The first build laid the samples out as full-width borderless textareas, one
 * under another, on the argument that you are editing the post rather than
 * filling in a box that contains a post. True of the one you are editing, and
 * wrong about the other four: the block's real job is to be **read** — six
 * posts, side by side, so you can see whether they sound like one person. A
 * column of full-measure editable text has no shape to compare, grows without
 * limit as the samples get longer, and puts a caret one stray click away from
 * every post in the voice.
 *
 * So each sample is a card in a two-across grid, clamped to three lines, and
 * clicking it opens the one you meant in a modal. Three lines is enough to
 * recognise a post you wrote and not enough to let one sample push the next
 * three off the screen — and the clamp is why the grid can stay even, which is
 * what makes the set legible as a set.
 *
 * Removing lives in the modal rather than in the corner of the card. A card
 * that is itself a button cannot hold another one without nesting them, and the
 * honest place to decide about a sample is the screen showing all of it.
 *
 * ## The corner is folded
 *
 * A sample is a *document* — somebody's post, whole, pasted in from somewhere
 * else — and the grid was drawing it with the same rounded rectangle this app
 * uses for every clickable thing. The dog-eared corner says the one thing the
 * clamp cannot: that what you are looking at is a page with more of it below
 * the fold. It costs no ink and no copy, and it makes the block scan as a small
 * pile of paper rather than as four buttons.
 *
 * ## The last cell is the empty one
 *
 * Adding is a card at the end of the grid rather than a button under it, so the
 * gesture is always in the same place whether the voice has no samples or six,
 * and the empty voice opens on the shape it is missing rather than on a
 * paragraph about it. With nothing in the grid that card also carries the
 * consequence — a voice saved like this generates what no voice at all would —
 * which is the one moment saying so still changes what somebody does.
 *
 * **Pasting several at once is gone from the card.** It was a second textarea
 * flow living permanently in the block, and it split its samples on blank lines
 * — a rule you had to be told. It is in the overflow menu as the thing it
 * actually is: a bulk import, not yet built.
 */
function SamplesCard({
  samples,
  saved,
  onChange,
  summary,
}: {
  samples: string[]
  /** The samples as last saved, which is what `Reset` puts back. */
  saved: string[]
  onChange: (samples: string[]) => void
  /** Our reading of these samples, or `null` once they have moved under it. */
  summary: string | null
}) {
  /** Which sample the modal is on: an index, or `samples.length` for a new one. */
  const [editing, setEditing] = useState<number | null>(null)
  const [text, setText] = useState('')

  const open = (i: number) => {
    setEditing(i)
    setText(samples[i] ?? '')
  }

  const commit = () => {
    if (editing === null) return
    const written = text.trim()
    // An emptied sample is a removed one. The alternative is keeping a blank
    // card in the grid, which is the state the old inline list could reach and
    // nobody could tell from a bug.
    // The splice form covers both jobs: for a new sample `editing` is
    // `samples.length`, so the head is the whole array and the tail is empty.
    const next = written
      ? [...samples.slice(0, editing), written, ...samples.slice(editing + 1)]
      : samples.filter((_, j) => j !== editing)
    onChange(next)
    setEditing(null)
  }

  const remove = () => {
    if (editing === null) return
    onChange(samples.filter((_, j) => j !== editing))
    setEditing(null)
  }

  const short = samples.length < MIN_VOICE_SAMPLES
  const isNewSample = editing !== null && editing >= samples.length
  const changed = samples.join('\n\n') !== saved.join('\n\n')

  return (
    <EditorCard
      title="Samples"
      /*
       * The reading first, in the foreground colour, where the description used
       * to be — because once there are samples it is the more useful of the two
       * and the only one that is about *this* voice. The description is a
       * definition, and a definition is worth its line while the set is still
       * short of the floor; after that it is telling somebody who has done the
       * thing how to do the thing.
       *
       * The count went with it. "4 samples" over four visible cards is the
       * screen counting to itself.
       */
      hint={
        <>
          {summary ? (
            <span>
              <span className="text-primary-foreground">Reads as</span>{' '}
              {summary}
            </span>
          ) : (
            samples.length > 0 && (
              <span>Read back off the samples once this is saved.</span>
            )
          )}
          {short && (
            <span>
              Three to eight real posts you would be happy to have written. This
              is the voice — everything below is only what a sample cannot say
              for itself.
            </span>
          )}
        </>
      }
      action={
        <SamplesMenu canReset={changed} onReset={() => onChange(saved)} />
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {samples.map((sample, i) => (
          // Index as key: samples are positional, unidentified strings, and
          // the text itself is not unique enough to key on — two posts can
          // legitimately start the same way.
          <li key={i} className="flex">
            <SampleCard onClick={() => open(i)}>
              {/* `whitespace-pre-line` so a post's own line breaks survive into
                  the preview, and the clamp counts them — a three-line post
                  reads as itself here rather than as a paragraph. */}
              <span className="line-clamp-3 text-sm leading-5 whitespace-pre-line">
                {sample}
              </span>
            </SampleCard>
          </li>
        ))}
        {/* The add cell says one thing whether the voice has six samples or
            none. It used to carry the consequence of saving an empty voice as
            well — but the card's own hint says that above the grid while the
            set is short, and a cell that argues with you is a worse button
            than one that does not. */}
        <li className="flex">
          <SampleCard blank onClick={() => open(samples.length)}>
            <span className="flex items-center gap-1.5 font-grotesk text-xs font-medium uppercase text-tertiary-foreground transition-colors group-hover:text-primary-foreground">
              <PlusIcon className="size-4" weight="bold" />
              Add a sample
            </span>
          </SampleCard>
        </li>
      </ul>

      {/* One sample, full height, on its own. The modal is what the card is
          not: no clamp, no grid, and the whole post in front of you while you
          decide whether it belongs in this voice. */}
      <ModalContainer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={isNewSample ? 'Add a sample' : 'Edit sample'}
        size="default"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a post you would be happy to have written."
            className="min-h-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {!isNewSample && (
                <Button variant="destructive" size="sm" onClick={remove}>
                  <TrashIcon />
                  <span>REMOVE SAMPLE</span>
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <span>CANCEL</span>
              </Button>
              <Button variant="outline" size="sm" onClick={commit}>
                <span>{isNewSample ? 'ADD IT' : 'DONE'}</span>
              </Button>
            </div>
          </div>
        </div>
      </ModalContainer>
    </EditorCard>
  )
}

/**
 * How wide the dog-ear is, in px. One number, because every edge of the fold —
 * the cut in the silhouette, the flap under it and the two hairlines that close
 * both — is derived from it. Two numbers is how a corner gets a seam.
 */
const FOLD = 20

/** The hairline, in px. The card has no CSS border; see `SampleCard`. */
const LINE = 1

/**
 * How far a 45° edge moves along an axis when the shape is inset by `LINE`.
 *
 * A vertical or horizontal edge inset by one pixel moves by one pixel. A
 * diagonal one does not: insetting it *perpendicularly* by `LINE` slides its
 * intercepts by `LINE / sin 45°`. Getting this wrong by the 0.414px difference
 * is exactly the seam this whole approach exists to remove, so it is a named
 * constant rather than a fudge factor spelled out at three call sites.
 */
const SKEW = LINE * Math.SQRT2

/** The corner-cut silhouette: a rectangle with its top-right corner taken off. */
const OUTER = `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`

/** The same silhouette, inset by `LINE` on all five edges. */
const INNER = `polygon(${LINE}px ${LINE}px, calc(100% - ${FOLD + SKEW - LINE}px) ${LINE}px, calc(100% - ${LINE}px) ${FOLD + SKEW - LINE}px, calc(100% - ${LINE}px) calc(100% - ${LINE}px), ${LINE}px calc(100% - ${LINE}px))`

/**
 * The turned-down corner itself, in a `FOLD`-square box pinned to the card's
 * top-right — the removed corner reflected back across the diagonal, which is
 * where a real fold puts it. Right angle at the inside, hypotenuse along the
 * crease.
 */
const FLAP = 'polygon(0 0, 100% 100%, 0 100%)'

/** `FLAP`, inset by `LINE`. */
const FLAP_INNER = `polygon(${LINE}px ${LINE + SKEW}px, ${FOLD - LINE - SKEW}px ${FOLD - LINE}px, ${LINE}px ${FOLD - LINE}px)`

/**
 * Three clamped lines, their padding and their border — what a sample card
 * comes to. Set on the add cell too, so a row of one is the same height as a
 * row of four and the grid never has a short cell in it.
 */
const SAMPLE_HEIGHT = 3 * 20 + 2 * 12 + 2

/**
 * A sample, or the space where one goes: a page with its top-right corner
 * turned down.
 *
 * ## It is folded, not cut
 *
 * The previous build clipped the corner off and ruled one hairline across the
 * gap. That is a *cut* corner — a page with a bite out of it — and it read as
 * one, because the thing that makes a dog-ear legible is the flap: the small
 * triangle of the reverse side lying on top of the page, which is the only part
 * of the drawing that says the paper went somewhere rather than being removed.
 * So the corner is back, reflected across the crease into the card, filled a
 * step darker than the card because you are looking at the back of the sheet.
 *
 * ## Why there is no `border` anywhere in here
 *
 * The seam was not a rounding error, it was the technique. A CSS border is
 * painted *inside* the box while `clip-path` cuts the box's *edge*, so along
 * the diagonal the clip ate the border and any line drawn to replace it met the
 * top and right borders a pixel off — visible as a step at both ends of the
 * diagonal, which is what the corner was reported for.
 *
 * The outline here is not drawn at all. It is the **difference between two
 * clipped shapes**: this element is filled with the line colour and clipped to
 * `OUTER`, a child is filled with the card colour and clipped to `INNER`, and
 * what shows between them is a hairline that follows all five edges. There is
 * no join to misalign because there are no two lines to join — the corner is a
 * single filled polygon. The flap is the same sandwich at `FOLD` scale.
 *
 * The cost is one extra element per card and the `SKEW` arithmetic; the return
 * is that the shape is correct by construction at any size, on any zoom, in any
 * colour it is ever hovered into.
 *
 * `blank` is the add-a-sample cell: the same card, not a dashed ghost of one.
 * Dashes said "placeholder" about a control that is not a placeholder — it is
 * the button you press — and put a third border style in a card that already
 * has two.
 */
function SampleCard({
  blank,
  className,
  onClick,
  children,
}: {
  blank?: boolean
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ clipPath: OUTER, minHeight: SAMPLE_HEIGHT }}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col rounded-md bg-quaternary text-left transition-colors hover:bg-foreground',
        // The default outline would be drawn outside the clip and vanish with
        // it, so focus goes inside, the same ring every button uses.
        'outline-none focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring',
      )}
    >
      {/* The card's own face. Inset by the hairline on every edge, which is
          what leaves the hairline visible. */}
      <span
        aria-hidden
        style={{ clipPath: INNER }}
        className="absolute inset-0 rounded-md bg-primary transition-colors group-hover:bg-secondary"
      />

      {/* The flap, over the face and under the text. Its hypotenuse is the
          crease and coincides with the silhouette's diagonal, so the two never
          need to agree about where the edge is — they are the same edge. */}
      <span
        aria-hidden
        style={{ width: FOLD, height: FOLD, clipPath: FLAP }}
        className="absolute right-0 top-0 bg-quaternary transition-colors group-hover:bg-foreground"
      >
        <span
          aria-hidden
          style={{ clipPath: FLAP_INNER }}
          className="absolute inset-0 bg-secondary transition-colors group-hover:bg-tertiary"
        />
      </span>

      {/* The right padding clears the fold: text running under a turned corner
          is the one way this shape can go wrong. */}
      <span
        className={cn(
          'relative flex min-w-0 flex-col py-3 pl-4 pr-7',
          blank && 'my-auto',
          className,
        )}
      >
        {children}
      </span>
    </button>
  )
}

/**
 * The card's overflow, for the two things that are about the set rather than
 * about one sample.
 *
 * Both are here for the same reason: neither earns a permanent control. `Reset`
 * is an undo for a session of editing and is dark until there is something to
 * undo. Bulk upload is the paste-several flow that used to live in the block —
 * a real need (nobody seeds a voice by typing five posts) and a decision nobody
 * has made, since "upload" could mean a file, a URL, or the old paste-and-split.
 * Listed and disabled rather than absent, because a screen that has thought
 * about a thing and not built it should say so where somebody would look.
 */
function SamplesMenu({
  canReset,
  onReset,
}: {
  canReset: boolean
  onReset: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="smIcon"
          className="shrink-0"
          aria-label="More sample options"
        >
          <DotsThreeVerticalIcon weight="regular" className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!canReset} onSelect={onReset}>
          <ArrowCounterClockwiseIcon />
          <span>Reset samples</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <UploadSimpleIcon />
          <span>Bulk upload</span>
          <span className="pl-6 text-xs text-tertiary-foreground">
            Coming soon
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * What deleting this voice costs, in the numbers this voice actually has.
 *
 * Said on the card *and* again in the confirmation, which is not a duplication:
 * the card's line is what you read while deciding whether to go near the
 * button, and the dialog's is what you read while deciding. A dialog that only
 * asked "are you sure?" would make the second reading depend on remembering the
 * first.
 */
function deletionCost(usage: BrandUsage): string {
  const { published, drafts } = usage
  if (published > 0) {
    return `${published} published ${published === 1 ? 'post was' : 'posts were'} written in this voice. Deleting it leaves them exactly as they are — their text was written and it stands — but nothing new can be generated in it, and any campaign pointing here falls back to no voice at all.`
  }
  if (drafts > 0) {
    return `${drafts} ${drafts === 1 ? 'draft points' : 'drafts point'} at this voice and will fall back to no voice at all.`
  }
  return 'Nothing has been written in this voice, so nothing else changes.'
}

/* ------------------------------------------------------------- the furniture */

/**
 * The card the column opens on. See `EditorIntro` for why an editor has one.
 *
 * The **saved** name, never the draft's: reading it off the field two inches
 * below would make the heading spell itself out as the name is typed. Unquoted,
 * too — set at 24px in the display face the name is already visibly the name,
 * and quotation marks around it read as scare quotes.
 */
function VoiceIntro({ name }: { name?: string }) {
  return (
    <EditorIntro
      section="voices"
      title={name ? `${name} Voice` : 'A new voice'}
      body="Three to eight real posts you would be happy to have written are what make one. Everything else on this screen is what a sample cannot say for itself."
    />
  )
}

/**
 * One rule, as its options laid out rather than folded into a dropdown.
 *
 * Three choices are shorter to read than the select that would hide them, and
 * — the actual reason — the set *is* the explanation: seeing `never · sparingly
 * · freely` under each other tells you what the rule means without a hint.
 *
 * **Radios, after two goes at something denser.** First three filled
 * rectangles, which read as three buttons you could press rather than one
 * setting with three positions. Then a segmented control, which fixed that and
 * introduced a worse problem: a segmented control is a *view switch* everywhere
 * else in this app — it changes what you are looking at, immediately, and it is
 * how the top-right corner of every screen behaves (CON-178). These five change
 * the document, and they only take effect when the bar at the bottom is
 * pressed. Borrowing the switch's clothes for a form field promises an
 * immediacy the card does not have.
 *
 * A radio is the plainest possible statement of one-of-three, it is what the
 * rest of the card already looks like (a label, a control, ink on white), and
 * it stacks — which is what buys the two columns: five vertical groups sit in
 * three rows instead of five, and the eye still runs down a single edge inside
 * each column.
 *
 * The input itself is native and visually hidden, with the ring and dot drawn
 * by the span next to it. Keyboard behaviour, arrow-key cycling within a group
 * and form semantics all come free from the browser, and `name` is what makes
 * a group a group — hence the `useId`, so two `Formality` rules on one screen
 * could never share a name.
 */
function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
        {label}
      </legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex w-fit cursor-pointer items-center gap-2 text-sm leading-5"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          {/* `text-transparent` → `peer-checked:text-foreground` with a
              `bg-current` dot inside: one class switches both the ring and the
              mark, and the dot needs no variant of its own — which it could not
              have anyway, being a child of the peer's sibling rather than one. */}
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-quaternary bg-primary text-transparent transition-colors peer-checked:border-foreground peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
            <span className="size-2 rounded-full bg-current" />
          </span>
          <span className="text-secondary-foreground peer-checked:text-primary-foreground">
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

const FORMALITY: { value: VoiceRules['formality']; label: string }[] = [
  { value: 'casual', label: 'casual' },
  { value: 'neutral', label: 'neutral' },
  { value: 'formal', label: 'formal' },
]

const PERSON: { value: VoiceRules['person']; label: string }[] = [
  { value: 'i', label: 'I' },
  { value: 'we', label: 'we' },
  { value: 'third', label: 'the company' },
]

const EMOJI: { value: VoiceRules['emoji']; label: string }[] = [
  { value: 'never', label: 'never' },
  { value: 'sparingly', label: 'sparingly' },
  { value: 'freely', label: 'freely' },
]

const HASHTAGS: { value: VoiceRules['hashtags']; label: string }[] = [
  { value: 'never', label: 'never' },
  { value: 'few', label: 'a few' },
  { value: 'many', label: 'many' },
]

const LENGTH: { value: VoiceRules['length']; label: string }[] = [
  { value: 'short', label: 'short' },
  { value: 'medium', label: 'medium' },
  { value: 'long', label: 'long' },
]
