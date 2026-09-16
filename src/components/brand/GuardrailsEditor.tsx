import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { BarStatus } from '@/components/page-primitives/PageActionBar'
import { brandSection, brandSectionCopy } from '@/lib/brandSections'
import { cn } from '@/lib'
import {
  BrandEditorFrame,
  DangerCard,
  EditorCard,
  EditorIntro,
  ForkedNote,
} from './editor'
import { StarterCard, StarterGroup } from './shell'
import {
  GUARDRAIL_STARTERS,
  guardrailStarterCopy,
  guardrailStarterDraft,
  type GuardrailStarter,
} from './starters'
import type { BrandGuardrails } from './types'

/**
 * The guardrails — the section *and* its editor, because a singleton cannot
 * have a drilldown.
 *
 * ## Why there is no read-only version of this screen
 *
 * Voices and audiences are libraries: a screen that lists them and a screen
 * that edits one, and the list earns its existence by being a choice between
 * things. There is exactly one set of guardrails, so the same arrangement
 * produced a page whose whole content was a card of the one document, and a
 * click on it that showed the same document in fields. Nothing was chosen on
 * the way through. A drilldown from a list of one is a hop, and the only thing
 * it added was a screen where the rules cannot be corrected while you are
 * looking at the mistake.
 *
 * So `/brand/guardrails` is this, and there is nothing under it. The Overview's
 * card is the way in, the caret goes back to the Overview, and everything the
 * section card used to draw — the intro, what the emptiness costs, the three
 * starters — is drawn here around the fields it describes. Templates reaches
 * the same shape from the other direction (a screen that is not a column), and
 * Look will when it is built.
 *
 * Two consequences worth naming, because they are what the drilldown was
 * quietly paying for:
 *
 * - **`CANCEL` had somewhere to go, and this does not.** Leaving is the caret;
 *   the bar's ghost is `DISCARD CHANGES` and puts the draft back where it was.
 * - **Saving an untouched screen would be a lie.** This is a page somebody
 *   lands on to read as often as to edit, so the commit is live only once
 *   something differs from what is stored (`dirty`) — otherwise it stamps a new
 *   `updatedAt` on rules nobody touched, in the one section where "when was
 *   this last checked" is a question people ask.
 *
 * ## The whole problem is getting the lists in
 *
 * A voice is written by pasting posts and an audience by answering three
 * questions. Guardrails are neither: they are four lists and a line, they run
 * long, and they already exist — in a compliance email, in a legal annexe, in
 * the founder's head. So this screen's job is not to ask for them, it is to
 * take them, and everything below follows from that.
 *
 * - **A list behaves like a list, not like a form.** Enter starts the next
 *   statement, Backspace on an empty one removes it and leaves the caret at the
 *   end of the row above. Nobody should reach for the mouse between two
 *   sentences they are typing in sequence — that is the difference between
 *   entering nine rules and entering three and giving up.
 * - **Pasting is the bulk import.** A multi-line paste becomes one statement
 *   per line, bullets and numbering stripped. No importer, no CSV, no wizard:
 *   the format everybody already has these in is *a list in a document*, and
 *   the clipboard is a working parser for it.
 * - **Words are tokens, not sentences.** Banned words get a chip field where
 *   Enter, a comma, a pasted list and leaving the field all commit — the shape
 *   everybody has learned from every tag field — because five words typed into
 *   a textarea are five words nobody can count or delete one of.
 *
 * ## One list per card, and one heading style on the screen
 *
 * Five cards: facts, may claim, never claim, banned words, disclaimer. They
 * were three — claims and wording each holding two lists under a sub-heading —
 * and grouping them was the wrong trade. A sub-heading is a second heading
 * style, and a second heading style has to be invented, given a size, a weight
 * and a colour, and then defended against the first one every time either
 * moves. What it bought here was a sentence of kinship ("same subject, two
 * sides") that the two cards say perfectly well by sitting next to each other.
 *
 * The rule that follows: **a card holds one list.** Anything that would need a
 * label inside a card is a card. It costs a little vertical space and it means
 * the screen has exactly one thing that looks like a heading, which is what
 * makes a long form scannable in the first place.
 *
 * `GuardrailStarter` fills *never claim* and *banned words* and deliberately
 * leaves *facts* empty: a template knows what a kind of business may never
 * claim and nothing whatever about what is true of yours. A plausible invented
 * fact is the worst thing this module could ship — it reads exactly like a
 * checked one, in the section people stop re-reading.
 *
 * The starters sit **in** the screen rather than behind a `?from=` on the way
 * to it, which is what collapsing the drilldown makes possible and is the
 * better arrangement anyway: the fields are visible while you choose, so the
 * offer reads as filling in the form you are looking at rather than as picking
 * which form you get. They are withdrawn the moment anything has been typed —
 * a card that overwrites the sentence you just wrote is a trap, not an offer.
 * The old empty state also carried a "write the rules yourself" card, and that
 * control does not survive the merge: the blank fields are already on screen,
 * so it offered a click for nothing.
 *
 * ## What it shares
 *
 * The frame, the intro card, the cards and the danger zone are `editor.tsx`.
 * The two list controls stay here: this is the only screen with them, and the
 * rule this module works by is that a thing moves when it has a second user,
 * not when somebody guesses it will.
 */
export function GuardrailsEditor({
  header,
  guardrails,
  onSave,
  onDelete,
}: {
  /** The page header, rendered inside the frame's scroller. */
  header?: ReactNode
  /** The guardrails as they stand, or `null` while the section is empty. */
  guardrails: BrandGuardrails | null
  onSave?: (guardrails: BrandGuardrails) => void
  /** Only offered once there are guardrails to remove. */
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(t, guardrails))
  /** Which of ours filled it in, while nothing has been saved over it yet. */
  const [forkedFrom, setForkedFrom] = useState<GuardrailStarter | null>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const written = assemble(draft)
  const stated = signature(written)
  const dirty = stated !== signature(guardrails)
  const blank = stated === signature(null)

  const info = brandSection('guardrails')
  const copy = brandSectionCopy(t, 'guardrails')

  return (
    <BrandEditorFrame
      header={header}
      contentKey={`${guardrails ? 'edit' : 'new'}-${dirty ? 'dirty' : 'clean'}`}
      dirty={dirty}
      status={barStatus(t, dirty, guardrails !== null)}
      // Only reachable with rules already stored: clearing every field is how
      // somebody deletes them without noticing they have, and an empty record
      // saved over a full one is indistinguishable afterwards from rules that
      // were never written. The way back to nothing is the danger zone, which
      // says what it costs and asks twice.
      blocker={guardrails && blank ? t('brand.guardrails.cleared') : undefined}
      commitLabel={
        guardrails ? t('brand.guardrails.save') : t('brand.guardrails.create')
      }
      cancelLabel={t('brand.guardrails.discard')}
      onCancel={() => {
        setDraft(draftFrom(t, guardrails))
        setForkedFrom(null)
      }}
      onSave={() => onSave?.(written)}
    >
      <EditorIntro
        section="guardrails"
        title={copy.label}
        body={copy.description}
        // The line the section card used to carry, on the screen that replaced
        // it. Only while nothing is stored: what the emptiness costs stops
        // being true the moment it is not empty.
        missing={guardrails ? undefined : copy.whenEmpty}
      />

      {forkedFrom && !guardrails && (
        <ForkedNote
          icon={forkedFrom.icon}
          title={guardrailStarterCopy(t, forkedFrom).title}
        >
          {t('brand.guardrails.forkedNote')}
        </ForkedNote>
      )}

      {/* Offered while the screen is still blank, and withdrawn by the first
          keystroke — see the note on starters above. */}
      {!guardrails && !dirty && (
        <StarterGroup
          title={t('brand.guardrails.starterGroupTitle')}
          body={t('brand.guardrails.starterGroupBody')}
        >
          {GUARDRAIL_STARTERS.map((starter) => {
            const starterCopy = guardrailStarterCopy(t, starter)
            return (
              <StarterCard
                key={starter.id}
                icon={starter.icon}
                tone={info.tone}
                title={starterCopy.title}
                body={starterCopy.body}
                onClick={() => {
                  setDraft(draftFrom(t, null, starter))
                  setForkedFrom(starter)
                }}
              />
            )
          })}
        </StarterGroup>
      )}

      <EditorCard
        title={t('brand.guardrails.facts')}
        hint={t('brand.guardrails.factsHint')}
      >
        <StatementList
          items={draft.facts}
          onChange={(facts) => set('facts', facts)}
          placeholder={t('brand.guardrails.factsPlaceholder')}
          addLabel={t('brand.guardrails.addFact')}
        />
      </EditorCard>

      <EditorCard
        title={t('brand.guardrails.mayClaim')}
        hint={t('brand.guardrails.mayClaimHint')}
      >
        <StatementList
          items={draft.mayClaim}
          onChange={(mayClaim) => set('mayClaim', mayClaim)}
          placeholder={t('brand.guardrails.mayClaimPlaceholder')}
          addLabel={t('brand.guardrails.addClaim')}
        />
      </EditorCard>

      <EditorCard
        title={t('brand.guardrails.neverClaim')}
        hint={t('brand.guardrails.neverClaimHint')}
      >
        {draft.neverClaim.length === 0 && (
          <p className="border-l-2 border-destructive pl-3 text-sm leading-5 text-tertiary-foreground">
            {t('brand.guardrails.neverClaimEmpty')}
          </p>
        )}
        <StatementList
          items={draft.neverClaim}
          onChange={(neverClaim) => set('neverClaim', neverClaim)}
          placeholder={t('brand.guardrails.neverClaimPlaceholder')}
          addLabel={t('brand.guardrails.addRule')}
          tone="hard"
        />
      </EditorCard>

      <EditorCard
        title={t('brand.guardrails.bannedWords')}
        hint={t('brand.guardrails.bannedWordsHint')}
      >
        <WordField
          words={draft.bannedWords}
          onChange={(bannedWords) => set('bannedWords', bannedWords)}
        />
      </EditorCard>

      <EditorCard
        title={t('brand.guardrails.disclaimer')}
        hint={t('brand.guardrails.disclaimerHint')}
      >
        <Textarea
          value={draft.disclaimer}
          onChange={(e) => set('disclaimer', e.target.value)}
          placeholder={t('brand.guardrails.disclaimerPlaceholder')}
          className="min-h-20"
        />
      </EditorCard>

      {guardrails && onDelete && (
        <DangerCard
          noun={t('brand.guardrails.noun')}
          name={t('brand.guardrails.dangerName')}
          cost={t('brand.guardrails.deleteCost')}
          onDelete={onDelete}
        />
      )}
    </BrandEditorFrame>
  )
}

/* ------------------------------------------------------------ the controls */

/**
 * A list of statements, edited the way a list is edited.
 *
 * Each row is one rule and each row is a textarea, because these are sentences
 * and a sentence that runs past the end of an input is a sentence nobody
 * proof-reads. The keyboard does the rest:
 *
 * - **Enter** ends this statement and starts the next one, focused.
 * - **Backspace** on an empty row deletes it and puts the caret at the end of
 *   the row above — the bargain every list editor makes, and the reason a row
 *   needs no delete gesture to be removable.
 * - **A multi-line paste** becomes one row per line. This is the import path:
 *   the list already exists in a document, and retyping it line by line is how
 *   a screen ends up with three of the nine rules that matter.
 *
 * Blank rows are not policed while typing — they are the cursor's workspace —
 * and are dropped on save by `assemble`. A list that removed a row the moment
 * it went empty would remove the row you are standing in.
 */
function StatementList({
  items,
  onChange,
  placeholder,
  addLabel,
  tone = 'normal',
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder: string
  /** `Add a fact`, `Add a rule` — the noun belongs to the list. */
  addLabel: string
  /** `hard` marks the list whose rules bite, matching the section's red rule. */
  tone?: 'normal' | 'hard'
}) {
  const { t } = useTranslation()
  // An empty list still shows one row: the first thing anybody wants to do here
  // is type, and a list whose first action is "click add" charges a click for
  // the obvious move.
  const rows = items.length > 0 ? items : ['']

  const refs = useRef<(HTMLTextAreaElement | null)[]>([])
  const [focusAt, setFocusAt] = useState<number | null>(null)

  useEffect(() => {
    if (focusAt === null) return
    setFocusAt(null)
    const el = refs.current[focusAt]
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [focusAt])

  /** Write the list, and say which row the caret ends up in. */
  const put = (next: string[], focus?: number) => {
    onChange(next)
    if (focus !== undefined) setFocusAt(focus)
  }

  const onKeyDown = (
    e: ReactKeyboardEvent<HTMLTextAreaElement>,
    at: number,
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      put([...rows.slice(0, at + 1), '', ...rows.slice(at + 1)], at + 1)
      return
    }
    if (e.key === 'Backspace' && rows[at] === '' && rows.length > 1) {
      e.preventDefault()
      put(
        rows.filter((_, i) => i !== at),
        Math.max(at - 1, 0),
      )
    }
  }

  const onPaste = (e: ReactClipboardEvent<HTMLTextAreaElement>, at: number) => {
    const lines = splitLines(e.clipboardData.getData('text'))
    // One line is an ordinary paste into the row, and the browser does that
    // better than we would — it respects the selection.
    if (lines.length < 2) return
    e.preventDefault()
    const here = rows[at].trim() ? [rows[at], ...lines] : lines
    put(
      [...rows.slice(0, at), ...here, ...rows.slice(at + 1)],
      at + here.length - 1,
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {rows.map((row, at) => (
          // The index is the identity: these rows have none of their own, and
          // keying by content would remount the row being typed in on every
          // keystroke.
          <li key={at} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                'mt-4 size-1.5 shrink-0 rounded-full',
                tone === 'hard' ? 'bg-destructive' : 'bg-quaternary',
              )}
            />
            <Textarea
              ref={(el) => {
                refs.current[at] = el
              }}
              value={row}
              placeholder={at === 0 ? placeholder : ''}
              onChange={(e) =>
                onChange(rows.map((r, i) => (i === at ? e.target.value : r)))
              }
              onKeyDown={(e) => onKeyDown(e, at)}
              onPaste={(e) => onPaste(e, at)}
              className="min-h-9 px-3 py-2 leading-5"
            />
            <Button
              variant="ghost"
              size="smIcon"
              className="mt-0.5 shrink-0 text-tertiary-foreground hover:text-destructive"
              aria-label={t('brand.guardrails.removeLine')}
              // Removing the only row leaves the phantom one behind, which is
              // the same thing as an empty list and renders as it.
              onClick={() => put(rows.filter((_, i) => i !== at))}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3 pl-3.5">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-secondary-foreground"
          onClick={() => put([...rows, ''], rows.length)}
        >
          <PlusIcon />
          <span>{addLabel}</span>
        </Button>
        {/* Said while the list is still being learned and dropped once it
            obviously has been — a keyboard hint repeated beside every list on
            the screen is three copies of one sentence. */}
        {rows.length <= 1 && (
          <span className="text-xs text-tertiary-foreground">
            {t('brand.guardrails.keyboardHint')}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * The banned words, as chips.
 *
 * These are the one part of the guardrails that is not sentences, and five
 * words typed into a textarea produce something nobody can count, delete one
 * of, or tell has a stray comma in it. A chip is a word you can see is
 * separate.
 *
 * Enter, a comma, a pasted list and leaving the field all commit — four ways in
 * rather than one, because this is the field somebody fills while thinking of
 * the words rather than while reading a document, and being told "press Enter"
 * after typing three words separated by commas is a field losing your work to a
 * rule.
 */
function WordField({
  words,
  onChange,
}: {
  words: string[]
  onChange: (next: string[]) => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const commit = (raw: string) => {
    const taken = new Set(words.map((w) => w.toLowerCase()))
    const fresh: string[] = []
    for (const word of splitWords(raw)) {
      if (taken.has(word.toLowerCase())) continue
      taken.add(word.toLowerCase())
      fresh.push(word)
    }
    if (fresh.length > 0) onChange([...words, ...fresh])
    setQuery('')
  }

  return (
    <div
      className={cn(
        'flex min-h-10 cursor-text flex-wrap items-center gap-1.5',
        'border-b-1 border-quaternary bg-input px-3 py-1.5',
        'transition-[border-color] duration-300 focus-within:border-foreground',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {words.map((word) => (
        <span
          key={word}
          className="inline-flex items-center gap-1.5 rounded-full bg-quaternary py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-primary-foreground"
        >
          {word}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(words.filter((w) => w !== word))
            }}
            aria-label={t('brand.guardrails.removeWord', { word })}
            className="flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-foreground/10"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={
          words.length === 0 ? t('brand.guardrails.bannedWordPlaceholder') : ''
        }
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => commit(query)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text')
          if (!/[,\n]/.test(text)) return
          e.preventDefault()
          commit(`${query}${text}`)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit(query)
            return
          }
          if (e.key === 'Backspace' && query === '' && words.length > 0) {
            e.preventDefault()
            onChange(words.slice(0, -1))
          }
        }}
        className="min-w-[10ch] flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-tertiary-foreground"
      />
    </div>
  )
}

/* ---------------------------------------------------------------- the draft */

type Draft = Pick<
  BrandGuardrails,
  'facts' | 'mayClaim' | 'neverClaim' | 'bannedWords' | 'disclaimer'
>

function draftFrom(
  t: TFunction,
  guardrails: BrandGuardrails | null,
  starter?: GuardrailStarter,
): Draft {
  if (guardrails) {
    return {
      facts: guardrails.facts,
      mayClaim: guardrails.mayClaim,
      neverClaim: guardrails.neverClaim,
      bannedWords: guardrails.bannedWords,
      disclaimer: guardrails.disclaimer,
    }
  }
  // A starter hands over rules and words, never facts — see `GuardrailStarter`.
  const seed = starter ? guardrailStarterDraft(t, starter) : undefined
  return {
    facts: [],
    mayClaim: [],
    neverClaim: seed?.neverClaim ?? [],
    bannedWords: seed?.bannedWords ?? [],
    disclaimer: '',
  }
}

/**
 * The draft as the whole singleton, for the caller to store.
 *
 * Blank rows are dropped here rather than while typing, which is the only place
 * it can be done without deleting the row somebody is standing in. It is also
 * what makes `empty` answerable above: whether anything has been *stated* is a
 * question about the saved shape, not about how many boxes are on screen.
 */
function assemble(draft: Draft): BrandGuardrails {
  const stated = (items: string[]) =>
    items.map((item) => item.trim()).filter((item) => item.length > 0)

  return {
    facts: stated(draft.facts),
    mayClaim: stated(draft.mayClaim),
    neverClaim: stated(draft.neverClaim),
    bannedWords: stated(draft.bannedWords),
    disclaimer: draft.disclaimer.trim(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * A pasted block as one statement per line.
 *
 * The leading bullet or number goes: what gets pasted here came out of a
 * document where it was already a list, and keeping the marker would make "1."
 * part of the rule. Everything else is left exactly as typed — this is
 * compliance text, and a parser that tidied it would be editing it.
 */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-–—•*]|\d+[.)])\s+/, '').trim())
    .filter((line) => line.length > 0)
}

/** A run of words, split on the two things people separate them with. */
function splitWords(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0)
}

/**
 * What is stated, as one comparable value — the answer to "has anything
 * actually changed", which is what decides whether the commit is live.
 *
 * Over the *stated* shape rather than the draft, so the two things that are not
 * edits do not read as ones: a blank row somebody opened and abandoned, and the
 * fresh `updatedAt` `assemble` stamps on every call. `null` and a record with
 * nothing in it are deliberately the same signature — that equality is what
 * makes the blocker above catch a cleared-out set of rules.
 */
function signature(guardrails: BrandGuardrails | null): string {
  const g = guardrails
  return JSON.stringify([
    g?.facts ?? [],
    g?.mayClaim ?? [],
    g?.neverClaim ?? [],
    g?.bannedWords ?? [],
    g?.disclaimer ?? '',
  ])
}

/**
 * Where the screen stands, in the bar beside the actions.
 *
 * This is the half of the `dirty` rule that speaks. The commit going quiet on
 * an untouched screen only reads as deliberate if something says the screen is
 * untouched; without it, a disabled `SAVE GUARDRAILS` is a page that appears to
 * be broken. Nothing is said while the section is empty and nothing has been
 * typed — there is no state to report yet, and the intro card above has just
 * said the section is empty in more useful words.
 */
function barStatus(
  t: TFunction,
  dirty: boolean,
  exists: boolean,
): BarStatus | undefined {
  if (dirty) {
    return {
      key: 'dirty',
      full: <BarNote>{t('brand.guardrails.unsaved')}</BarNote>,
      compact: <BarNote>{t('brand.guardrails.unsavedShort')}</BarNote>,
    }
  }
  if (!exists) return undefined
  return {
    key: 'saved',
    full: <BarNote>{t('brand.guardrails.saved')}</BarNote>,
    compact: <BarNote>{t('brand.guardrails.saved')}</BarNote>,
  }
}

function BarNote({ children }: { children: ReactNode }) {
  return (
    <span className="px-1 text-xs text-tertiary-foreground">{children}</span>
  )
}
