import { useState, type ReactNode } from 'react'
import { CheckIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ModalContainer } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { TextSelect } from '@/components/ui/text-select'
import { FactsTable } from '@/components/tables/factsTable'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BarStatus } from '@/components/page-primitives/PageActionBar'
import { brandSection } from '@/lib/brandSections'
import { BrandEditorFrame, EditorCard, EditorIntro, Field } from './editor'
import {
  FACT_KINDS,
  FACT_SUBJECTS,
  emptyFact,
  countBySubject,
  factKind,
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
 * The modal also buys a real cancel. The open row wrote straight into the
 * ledger draft — leaving it "undone" was an edit, and there was nothing to
 * press to take it back. A modal holds its own copy: **CANCEL** puts the fact
 * back, and a fact added and thought better of leaves nothing behind.
 */
export function FactsEditor({
  header,
  facts,
  onSave,
}: {
  header?: ReactNode
  facts: BrandFact[]
  onSave?: (facts: BrandFact[]) => void
}) {
  const today = todayISO()
  const [draft, setDraft] = useState<BrandFact[]>(facts)
  /** Which ledger is on screen. `'all'` is a view, never a value on a row. */
  const [view, setView] = useState<LedgerView>('all')
  /** The row open in the modal, and whether it is in the ledger yet. */
  const [editing, setEditing] = useState<{
    fact: BrandFact
    isNew: boolean
  } | null>(null)

  const info = brandSection('facts')
  const shown =
    view === 'all' ? draft : draft.filter((fact) => fact.subject === view)
  const dirty = signature(draft) !== signature(facts)
  const stated = draft.filter((fact) => fact.statement.trim().length > 0)

  const open = (id: string) => {
    const fact = draft.find((row) => row.id === id)
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
      fact: emptyFact(`new-${draft.length}-${Date.now()}`, today, adding),
      isNew: true,
    })

  const commit = (fact: BrandFact, isNew: boolean) => {
    setDraft((rows) =>
      isNew
        ? [...rows, fact]
        : rows.map((row) => (row.id === fact.id ? fact : row)),
    )
    setEditing(null)
  }

  const remove = (id: string) => {
    setDraft((rows) => rows.filter((row) => row.id !== id))
    setEditing(null)
  }

  return (
    <BrandEditorFrame
      header={header}
      contentKey={`facts-${dirty ? 'dirty' : 'clean'}`}
      dirty={dirty}
      status={barStatus(dirty, facts.length > 0)}
      commitLabel={facts.length > 0 ? 'Save the ledger' : 'Start the ledger'}
      cancelLabel="Discard changes"
      onCancel={() => {
        setDraft(facts)
        setEditing(null)
      }}
      onSave={() => onSave?.(stated)}
    >
      <EditorIntro
        section="facts"
        title={info.label}
        body={info.description}
        missing={facts.length > 0 ? undefined : info.whenEmpty}
      />

      <EditorCard
        // The one card in Brand wider than the reading column — see `wide`.
        wide
        title="The ledger"
        hint="One statement per row, written the way it should be repeated. The dates are the point of the table: a figure nobody has re-checked since it went in is the thing this section exists to make visible."
      >
        {draft.length > 0 && (
          <LedgerTabs view={view} onChange={setView} facts={draft} />
        )}
        {shown.length === 0 ? (
          <p className="border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
            {emptyLine(view, draft.length > 0)}
          </p>
        ) : (
          <FactsTable
            facts={shown}
            today={today}
            // Under a tab, every row would say the same word — see the prop.
            showSubject={view === 'all'}
            onEdit={open}
            onRemove={remove}
          />
        )}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-2 text-secondary-foreground"
            onClick={add}
          >
            <PlusIcon />
            <span>{ADD_COPY[adding].button}</span>
          </Button>
        </div>
      </EditorCard>

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
    </BrandEditorFrame>
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
 * It edits a copy, and hands it back only on **DONE** — so the ledger behind
 * it is unchanged while the modal is open, and closing by any of the four ways
 * a modal closes leaves the fact as it was.
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
            {/* Said here rather than in a toast on save: the row is the unit
                somebody thinks in, and the bar at the foot of the screen is
                what actually commits it. */}
            <span className="mr-2 text-xs text-tertiary-foreground">
              Nothing is stored until the ledger is saved.
            </span>
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
                  call it something else. */}
              <span>{isNew ? ADD_COPY[fact.subject].commit : 'DONE'}</span>
            </Button>
          </div>
        </div>
      </div>
    </ModalContainer>
  )
}

/**
 * What is stated, as one comparable value. Over the *stated* rows so the two
 * things that are not edits do not read as ones: a blank row somebody opened
 * and abandoned, and the order the service happens to mint ids in.
 */
function signature(facts: BrandFact[]): string {
  return JSON.stringify(
    facts
      .filter((fact) => fact.statement.trim().length > 0)
      .map((fact) => [
        fact.statement.trim(),
        fact.kind,
        fact.source.trim(),
        fact.addedAt,
        fact.checkedAt,
        fact.expiresAt,
      ]),
  )
}

function barStatus(dirty: boolean, exists: boolean): BarStatus | undefined {
  if (dirty) {
    return {
      key: 'dirty',
      full: <BarNote>Unsaved changes</BarNote>,
      compact: <BarNote>Unsaved</BarNote>,
    }
  }
  if (!exists) return undefined
  return {
    key: 'saved',
    full: <BarNote>Saved</BarNote>,
    compact: <BarNote>Saved</BarNote>,
  }
}

function BarNote({ children }: { children: ReactNode }) {
  return (
    <span className="px-1 text-xs text-tertiary-foreground">{children}</span>
  )
}
