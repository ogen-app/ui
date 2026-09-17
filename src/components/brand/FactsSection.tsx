import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalContainer } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { TextSelect } from '@/components/ui/text-select'
import { FactsTable } from '@/components/tables/factsTable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { brandSectionCopy } from '@/lib/brandSections'
import { BrandBackButton } from './detail'
import { Field } from './editor'
import {
  FACT_KINDS,
  FACT_SUBJECTS,
  emptyFact,
  countBySubject,
  factKind,
  factMatches,
  factSubject,
  todayISO,
  type BrandFact,
  type FactSubject,
} from './facts'

/**
 * The facts ledger — the section *and* its editor, the arrangement guardrails
 * already uses for the same reason: there is one ledger per workspace, so a
 * list screen and an edit screen would show the same table twice with a click
 * between them that chose nothing.
 *
 * ## Why it is a table and the rest of the guardrails is not
 *
 * The argument is on `facts.ts`, in one line: the other four lists are *rules*
 * and this one is a *record*. A rule is true because somebody decided it, and
 * it changes when they decide otherwise. A fact came from somewhere, went in on
 * a date, and — the part a list of sentences cannot hold — most facts go off on
 * their own. A price, a headcount, a response time and a customer count are all
 * wrong eventually, and nothing about the sentence says when.
 *
 * So the columns are the questions a sentence cannot answer: how checkable it
 * is, where to check it, when it went in, when it was last confirmed, and the
 * date it must stop being repeated. Everything else about this screen follows
 * from those being per-row rather than per-list.
 *
 * ## The table is the app's table, and a row is edited in a modal
 *
 * The first cut hand-rolled both: `<table>` markup, and a row that opened into
 * its form in place. The table is `VirtualTable` now — see `factsTable` — for
 * the reason any second implementation of a thing gets deleted, and the form
 * moved into a modal with it. In-place editing and a virtualised, sortable
 * table are not compatible in the way that matters: a row that changes height
 * when it opens breaks the one measurement the virtualiser is built on, and a
 * row that re-sorts itself out from under the form as a date is picked is
 * worse than either.
 *
 * ## Three ledgers, one table
 *
 * Problems and opportunities were asked for as ledgers of their own and are
 * **tabs**, because they turned out to be an attribute of a fact rather than a
 * new kind of thing — the argument is on `FactSubject`. The first tab is ALL,
 * and it is the one the screen opens on: the three are read together far more
 * often than separately, and a screen that makes you visit three places to see
 * twenty statements has split a ledger into three short lists.
 *
 * A tab is a filter and a **seed**: the add button under the Problems tab adds
 * a problem, and says so.
 *
 * ## It is laid out as a table page, not as an editor
 *
 * The other Brand sections are documents: a column of cards, a scroller, an
 * intro card at the top saying what the section is for. This one is a list of
 * records, so it is arranged the way the app's other lists of records are —
 * posts, documents. Title and the one way in at the top right, a toolbar under
 * it holding what narrows the list, and the table taking every pixel left over
 * and scrolling inside itself.
 *
 * Two things went in that rearrangement, both because the table below them said
 * it better. The **intro card** answered "what is this for" at paragraph length
 * immediately above a ledger of dated statements, which is the answer; the
 * sentence still exists, on the Overview card that opens this page, where
 * somebody who has not come in yet is the one reading it. And the **card
 * around the table** was a white surface with its own heading inside a page
 * that had just been given one — two headers, one screen.
 *
 * The search box is what a page-height table needs and a twelve-row box did
 * not: see `LedgerSearch`.
 *
 * ## A row saves itself, so there is no commit bar
 *
 * Every other Brand screen is a document with a `PageActionBar` under it: a
 * voice is one thing being written, the fields are paragraphs of it, and
 * SAVE VOICE is the moment somebody means all of them at once. A ledger is not
 * one thing. Its unit is the row, and a row is already edited in a modal that
 * opens, asks six questions and ends in a button — which *is* a commit, with
 * its own scope and its own cancel.
 *
 * A bar under that measured the whole ledger and said *Unsaved changes* about
 * a table whose rows had each been individually finished, which is the wrong
 * question asked twice: it made somebody who had just pressed ADD FACT press
 * SAVE THE LEDGER to mean it, and left the two disagreeing in between. So the
 * modal writes through — **DONE saves, the trash saves, and nothing on this
 * screen is pending.**
 *
 * That makes the modal's **CANCEL** the real safeguard, and it is: it holds
 * its own copy of the fact, so closing by any of the four ways a modal closes
 * leaves the row exactly as it was and a fact added and thought better of
 * leaves nothing behind.
 *
 * Removing is not confirmed, which is the app's rule for a row in a list —
 * see `DeleteAssetDialog`, where it is written down: the mistake is one row
 * among twenty and it is visible the instant it happens.
 */
export function FactsLedger({
  facts,
  onSave,
}: {
  facts: BrandFact[]
  onSave?: (facts: BrandFact[]) => void
}) {
  const { t } = useTranslation()
  const today = todayISO()
  /**
   * The ledger on screen — the saved one, one row ahead of the server.
   *
   * Every change here is written through immediately, so this is not a draft;
   * it is what the save was, held locally because the mutation only puts the
   * new list in the cache when the response comes back. Without it the row
   * somebody just finished would sit unchanged behind a closed modal for the
   * length of a round trip, which reads as a save that did not take.
   */
  const [ledger, setLedger] = useState<BrandFact[]>(facts)
  /**
   * …and re-seeded whenever the server's list changes, which is the
   * documented way to reset state from a prop. `facts` is memoised on the
   * statements, so this fires when a save lands (agreeing with what we already
   * show) or when something else refetches — never on an unrelated render.
   */
  const [seeded, setSeeded] = useState<BrandFact[]>(facts)
  if (seeded !== facts) {
    setSeeded(facts)
    setLedger(facts)
  }
  /** Which ledger is on screen. `'all'` is a view, never a value on a row. */
  const [view, setView] = useState<LedgerView>('all')
  /** What is typed in the box, unparsed — see `factMatches`. */
  const [query, setQuery] = useState('')
  /** The row open in the modal, and whether it is in the ledger yet. */
  const [editing, setEditing] = useState<{
    fact: BrandFact
    isNew: boolean
  } | null>(null)

  // The section's label, from the catalogue develop moved it into (CON-227) —
  // the page's title, and the only thing left of the intro card. The ledger's
  // own copy below is still English in place; see the note on
  // `brand-materials`.
  const info = brandSectionCopy(t, 'facts')
  const narrowed = view !== 'all' || query.trim() !== ''
  const shown = ledger.filter(
    (fact) =>
      (view === 'all' || fact.subject === view) && factMatches(fact, query),
  )

  const open = (id: string) => {
    const fact = ledger.find((row) => row.id === id)
    if (fact) setEditing({ fact, isNew: false })
  }

  // The tab decides what is being added — see `emptyFact`. `all` adds a fact
  // about this business, which is what the ledger held before it had tabs.
  const adding: FactSubject = view === 'all' ? 'us' : view

  const add = () =>
    setEditing({
      // Minted off the length rather than off the wire, which has no id for a
      // fact at all — see `BrandFact.id`. Prefixed differently from the ids the
      // service mints so a fresh row cannot collide with a stored one.
      fact: emptyFact(`new-${ledger.length}-${Date.now()}`, today, adding),
      isNew: true,
    })

  /**
   * Show it and store it, in that order — the one path every change takes.
   *
   * A statement-less row is dropped from what is sent, which is the same rule
   * the modal enforces on its commit button; it cannot get here, and the save
   * strips it anyway (`useSaveFacts`). The endpoint takes the whole ledger, so
   * "save this row" is a write of all of them either way — what is atomic is
   * the gesture, not the request.
   */
  const write = (rows: BrandFact[]) => {
    setLedger(rows)
    onSave?.(rows.filter((fact) => fact.statement.trim().length > 0))
  }

  const commit = (fact: BrandFact, isNew: boolean) => {
    write(
      isNew
        ? [...ledger, fact]
        : ledger.map((row) => (row.id === fact.id ? fact : row)),
    )
    setEditing(null)
  }

  const remove = (id: string) => {
    write(ledger.filter((row) => row.id !== id))
    setEditing(null)
  }

  return (
    // The page's own shape, not `BrandEditorFrame`: that frame is a scroller
    // with a commit bar anchored under it, and this screen has neither. A
    // table cannot be nested in something that grows — it would grow with it
    // instead of taking the height left over — so the header stays put, the
    // toolbar stays put, and the table scrolls inside itself, which is the
    // arrangement the posts and documents lists are in.
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        back={<BrandBackButton />}
        // The section's name, where the posts list puts the campaign's. The
        // intro card that used to say it — and say what the section is for
        // at paragraph length — sat directly above the table and argued with
        // it: a page whose subject is a ledger of what is true does not open
        // by explaining itself, and the sentence is still on the Overview's
        // card, which is where somebody deciding whether to come in reads
        // it.
        title={info.label}
        // Top right, the way every other table page in the app offers its
        // one way in. It follows the tab, so under Problems it adds a
        // problem and says so.
        actions={
          <Button size="lg" onClick={add}>
            <PlusIcon />
            <span>{ADD_COPY[adding].button}</span>
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4 lg:px-6">
        {ledger.length === 0 ? (
          // No toolbar over an empty ledger: three tabs reading zero and a box
          // to search nothing with is chrome around an absence. What the absence
          // costs is the only thing worth saying, and the header holds the one
          // thing to do about it.
          <p className="max-w-content border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
            {emptyLine('all', false)}
          </p>
        ) : (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-2">
              <LedgerTabs view={view} onChange={setView} facts={ledger} />
              <LedgerSearch value={query} onChange={setQuery} />
            </div>
            {shown.length === 0 && view !== 'all' && query.trim() === '' ? (
              // An empty *ledger* the table cannot speak for: the shared empty
              // state is about a filter somebody can relax, and a workspace with
              // no problems on file has nothing to relax — it has something to
              // write.
              <p className="max-w-content border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
                {emptyLine(view, true)}
              </p>
            ) : (
              <div className="grid min-h-0 flex-1 overflow-hidden">
                <FactsTable
                  facts={shown}
                  today={today}
                  // Under a tab, every row would say the same word — see the prop.
                  showSubject={view === 'all'}
                  onEdit={open}
                  onRemove={remove}
                  // Only ever empty here because the search emptied it, so the
                  // way out is to undo the search — and the tab with it, since
                  // a query that matches nothing under Problems may well match
                  // something in the ledger.
                  onEmptyStateAction={
                    narrowed
                      ? () => {
                          setQuery('')
                          setView('all')
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <FactModal
          // Re-seeds the fields when a different row is opened, rather than
          // carrying the last one's answers into it.
          key={editing.fact.id}
          fact={editing.fact}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onDone={(fact) => commit(fact, editing.isNew)}
          onRemove={() => remove(editing.fact.id)}
        />
      )}
    </div>
  )
}

/**
 * The box that narrows the ledger by what a statement says.
 *
 * The app's search field — the one the content bank's picker uses — rather
 * than a filter of its own: a ledger that grows past a screen is searched for
 * a sentence somebody half remembers, and the columns already answer
 * everything a structured filter would ask. It narrows the *tab* you are on,
 * which is why the table's way out of an empty result clears both.
 */
function LedgerSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="flex h-10 w-full max-w-72 shrink-0 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3">
      <MagnifyingGlassIcon className="size-4 shrink-0 text-secondary-foreground" />
      <Input
        variant="search"
        inputSize="default"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search statements"
        aria-label="Search the facts ledger"
        className="px-0"
      />
      {value !== '' && (
        <Button
          variant="ghost"
          size="xsIcon"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}

/** `'all'` is a view of the ledger, never a value stored on a row. */
type LedgerView = 'all' | FactSubject

/**
 * What the add button says, per ledger.
 *
 * Written out rather than assembled from the subject's label and an article:
 * *an* opportunity and *a* problem is exactly the kind of sentence a template
 * gets wrong, and there are three of them.
 */
const ADD_COPY: Record<
  FactSubject,
  { button: string; title: string; commit: string }
> = {
  us: { button: 'ADD A FACT', title: 'Add a fact', commit: 'ADD FACT' },
  problem: {
    button: 'ADD A PROBLEM',
    title: 'Add a problem',
    commit: 'ADD PROBLEM',
  },
  opportunity: {
    button: 'ADD AN OPPORTUNITY',
    title: 'Add an opportunity',
    commit: 'ADD OPPORTUNITY',
  },
}

/**
 * The three ledgers, and everything at once.
 *
 * **ALL leads and is where the screen opens.** The three are one record with
 * one set of columns, and what somebody scans this table for — what is past its
 * date — is a question about all of them; three tabs with no way to see the
 * whole thing would answer it three times. The counts are on the tabs because
 * the emptiest ledger is the interesting one: a workspace with twelve facts
 * about itself and no problems on file is writing about nobody.
 */
function LedgerTabs({
  view,
  onChange,
  facts,
}: {
  view: LedgerView
  onChange: (next: LedgerView) => void
  facts: BrandFact[]
}) {
  return (
    <Tabs
      value={view}
      onValueChange={(next) => onChange(next as LedgerView)}
      className="w-fit max-w-full overflow-x-auto"
    >
      <TabsList variant="segmented" size="excluded">
        <TabsTrigger variant="segmented" value="all">
          All <Count n={facts.length} />
        </TabsTrigger>
        {FACT_SUBJECTS.map((subject) => (
          <TabsTrigger key={subject.id} variant="segmented" value={subject.id}>
            {subject.plural} <Count n={countBySubject(facts, subject.id)} />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

/** The count on a tab: present, and never the loudest thing on it. */
function Count({ n }: { n: number }) {
  return <span className="ml-1.5 tabular-nums opacity-60">{n}</span>
}

/**
 * What the absence means, in the terms of the ledger being looked at.
 *
 * The whole-ledger line is the section's own — nothing stated, every figure
 * invented — and the three narrower ones are not that sentence with a noun
 * swapped: a workspace with facts and no problems is not unsafe, it is writing
 * with nothing to say.
 */
function emptyLine(view: LedgerView, hasFacts: boolean): string {
  if (view === 'all' || !hasFacts)
    return 'Nothing is stated as true, so every number in every generated post is invented — plausibly, in your own voice, which is what makes it hard to catch.'
  if (view === 'problem')
    return 'No problem is written down, so nothing generated here can open by naming one. Posts start from what we sell rather than from what somebody is stuck with.'
  if (view === 'opportunity')
    return 'No opening is written down — nothing states what is missing out there, which is the sentence a position is argued from.'
  return 'Nothing is stated about this business itself: no figure, no commitment, nothing a post could say about us and be checked on.'
}

/**
 * One fact, open. Six fields, in the order somebody fills them.
 *
 * It edits a copy, and hands it back only on **SAVE** — so the row behind it
 * is unchanged while the modal is open, and closing by any of the four ways a
 * modal closes leaves the fact as it was. With no commit bar on the screen
 * this is the only thing standing between a half-changed date and the ledger,
 * which is why the modal owns the copy rather than writing as you type.
 */
function FactModal({
  fact,
  isNew,
  onClose,
  onDone,
  onRemove,
}: {
  fact: BrandFact
  isNew: boolean
  onClose: () => void
  onDone: (fact: BrandFact) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState<BrandFact>(fact)
  const set = (next: Partial<BrandFact>) =>
    setDraft((current) => ({ ...current, ...next }))

  // A fact with no sentence is not a fact. It is also what the save strips out
  // silently, so refusing it here is the same rule said where it can be acted
  // on rather than applied behind somebody's back.
  const blank = draft.statement.trim().length === 0

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      // From the subject it opened with rather than the one in the picker: a
      // heading that rewrites itself as you change a field below it is the
      // flicker the editors avoid by titling from the saved value.
      title={isNew ? ADD_COPY[fact.subject].title : 'Edit this statement'}
      size="large"
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Statement"
          hint="Written as it should be repeated, with the period and the unit in it."
        >
          <Textarea
            autoFocus
            value={draft.statement}
            onChange={(e) => set({ statement: e.target.value })}
            placeholder={factSubject(draft.subject).example}
            className="min-h-16 px-3 py-2 leading-5"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="About" hint={factSubject(draft.subject).hint}>
            <TextSelect
              value={draft.subject}
              onValueChange={(subject) =>
                set({ subject: subject as FactSubject })
              }
              elements={FACT_SUBJECTS.map((subject) => ({
                id: subject.id,
                displayValue: subject.label,
              }))}
              size="default"
            />
          </Field>
          <Field label="Kind" hint={factKind(draft.kind).hint}>
            <TextSelect
              value={draft.kind}
              onValueChange={(kind) => set({ kind: kind as BrandFact['kind'] })}
              elements={FACT_KINDS.map((kind) => ({
                id: kind.id,
                displayValue: kind.label,
              }))}
              size="default"
            />
          </Field>
          <Field
            label="Source"
            hint="Where somebody else could check it — a link, a document, a person."
          >
            <Input
              value={draft.source}
              onChange={(e) => set({ source: e.target.value })}
              placeholder="Helpdesk export, Q4"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Added">
            <DatePicker
              value={draft.addedAt || null}
              onChange={(addedAt) => set({ addedAt: addedAt ?? '' })}
            />
          </Field>
          <Field label="Last checked" hint="When somebody last confirmed it.">
            <DatePicker
              value={draft.checkedAt || null}
              onChange={(checkedAt) => set({ checkedAt: checkedAt ?? '' })}
            />
          </Field>
          <Field
            label="Expires"
            hint="Leave empty if it cannot go out of date."
          >
            <DatePicker
              value={draft.expiresAt || null}
              onChange={(expiresAt) => set({ expiresAt: expiresAt ?? '' })}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Removing is only offered for a fact the ledger has: a new one is
              removed by cancelling, and two buttons that both mean "forget
              this" is one more than the row needs. */}
          {!isNew && (
            <Button
              variant="ghost"
              size="sm"
              className="text-tertiary-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <TrashIcon />
              <span>REMOVE THIS FACT</span>
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* Nothing here says when it will be stored. It used to — there
                was a bar under the screen the row was waiting on, and the
                sentence existed to say so. The button below is the save now,
                and a note explaining that a save saves is a screen talking
                about itself. */}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <span>CANCEL</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={blank}
              onClick={() => onDone(draft)}
            >
              <CheckIcon />
              {/* Named from the subject it opened as, like the title — the
                  button that ends a sentence the heading started must not
                  call it something else. `SAVE` rather than the `DONE` it said
                  while a bar downstairs did the saving: this is the press that
                  stores the row, and it should say the word. */}
              <span>{isNew ? ADD_COPY[fact.subject].commit : 'SAVE'}</span>
            </Button>
          </div>
        </div>
      </div>
    </ModalContainer>
  )
}
