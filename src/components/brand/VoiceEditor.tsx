import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  PlusIcon,
  StarIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'
import {
  BrandEditorFrame,
  DangerCard,
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
  onSave?: (voice: BrandVoice) => void
  onCancel?: () => void
  /** Only offered for a voice that exists. */
  onDelete?: () => void
}) {
  const initial = useMemo(() => draftFrom(voice, starter), [voice, starter])
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
          />
        }
      >
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Friday finfluencer"
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
            placeholder="The Friday joke post, and nothing else"
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

function draftFrom(
  voice: BrandVoice | null,
  starter?: VoiceStarter | null,
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
    // A new voice is never born the default. Making one takes a deliberate
    // switch, because it demotes whichever voice is the default today — and a
    // side effect on somebody else's entry is not something a Create button
    // gets to do quietly.
    isDefault: false,
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
 */
function assemble(
  draft: Draft,
  voice: BrandVoice | null,
  starter?: VoiceStarter | null,
): BrandVoice {
  const samplesChanged =
    draft.samples.join('\u0000') !== (voice?.samples ?? []).join('\u0000')
  return {
    id: voice?.id ?? crypto.randomUUID(),
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
        <li className="flex">
          <SampleCard
            blank
            onClick={() => open(samples.length)}
            className="gap-3"
          >
            {samples.length === 0 && (
              <span className="text-sm leading-5 text-tertiary-foreground">
                Nothing yet. Saved like this the voice has a name and nothing
                behind it, and it will generate exactly what no voice at all
                would.
              </span>
            )}
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
 * How wide the dog-ear is, in px. One number, because the cut in the card and
 * the line that closes it have to be the same size or the corner shows a seam.
 */
const FOLD = 20

/**
 * Three clamped lines, their padding and their border — what a sample card
 * comes to. Set on the add cell too, so a row of one is the same height as a
 * row of four and the grid never has a short cell in it.
 */
const SAMPLE_HEIGHT = 3 * 20 + 2 * 12 + 2

/**
 * A sample, or the space where one goes: a page with its top-right corner
 * turned.
 *
 * The cut is a `clip-path` on the card, and the corner is left **hollow** — one
 * hairline across the diagonal and nothing behind it. The filled version read
 * as a grey tab stuck onto the card: it sat on top of the top and right borders
 * rather than continuing them, so the outline stepped where the two met. A line
 * has no thickness to misalign. It runs corner to corner of a `FOLD`-square box
 * pinned to the card's own corner, which is exactly where `clip-path` took the
 * border away, so the card's outline closes on itself.
 *
 * Drawn as a gradient rather than a rotated rule because a gradient band is
 * positioned from the box's own geometry — it cannot drift by a subpixel the
 * way a transformed element does — and `currentColor` lets the one class that
 * moves on hover move the line with the border it belongs to.
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
      style={{
        clipPath: `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`,
        minHeight: SAMPLE_HEIGHT,
      }}
      className={cn(
        'group relative flex w-full flex-col rounded-md border border-quaternary py-3 pl-4 text-left transition-colors',
        // The right padding clears the fold: text running under a turned corner
        // is the one way this shape can go wrong.
        'pr-7',
        'hover:border-foreground hover:bg-secondary',
        // The default outline would be drawn outside the clip and disappear
        // with it, so focus goes inside, the same ring every button uses.
        'outline-none focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring',
        blank && 'justify-center',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        style={{
          width: FOLD,
          height: FOLD,
          backgroundImage:
            'linear-gradient(to top right, transparent calc(50% - 0.5px), currentColor calc(50% - 0.5px), currentColor calc(50% + 0.5px), transparent calc(50% + 0.5px))',
        }}
        className="absolute right-0 top-0 text-quaternary transition-colors group-hover:text-foreground"
      />
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
 * Whether posts start in this voice — **a state with an action, not a setting
 * with a switch.**
 *
 * It was a labelled `Switch` with two sentences under it, and the sentences
 * were the tell. Being the default is not symmetrical: you can *take* it, and
 * you cannot give it back, because a workspace with no default at all sends
 * every post that follows through a four-way choice nobody asked for. A switch
 * promises the second half of a pair that does not exist, so it had to spend a
 * line of tertiary copy explaining that it only goes one way — a control that
 * needs a footnote to say which of its two states is reachable is the wrong
 * control.
 *
 * So: one thing, in the card's top-right corner, and which thing it is *is* the
 * state.
 *
 * - **Not the default** — a ghost `MAKE DEFAULT` with a hollow star. An offer,
 *   and a quiet one: it sits on the heading line of a card whose heading is the
 *   loudest thing on it, and an outline button there read as the card's main action.
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
 * Green rather than the section's hue, matching the `default` mark on the
 * library card: the hue means "voices", and green is this app's word for *fine
 * and working*, which is the claim.
 *
 * Demotion still happens the way it always did — by another voice being
 * promoted — and that is stated on the offer rather than on the state, because
 * it is a consequence of clicking, not a fact about a voice that already has
 * it.
 */
function DefaultControl({
  isDefault,
  onMakeDefault,
}: {
  isDefault: boolean
  onMakeDefault: () => void
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
        <TooltipContent>
          Posts start in this voice unless another one is picked.
        </TooltipContent>
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
      <TooltipContent>
        Takes the default off whichever voice has it now.
      </TooltipContent>
    </Tooltip>
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
