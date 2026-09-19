import type { BrandFact, FactKind, FactSubject } from '@/components/brand/facts'
import { getActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * The two things Brand's screens now record that `/api/brand` has no column
 * for — kept here, in one file, so the day they get one is a deletion.
 *
 * ## What is faked, and what is not
 *
 * **A fact's statement is real and always has been.** It goes to
 * `PUT /api/brand/guardrails` as a member of `facts: string[]`, exactly as
 * before, and generation reads it from there. Nothing about the ledger changes
 * what the server stores or what the app writes from.
 *
 * What has no column is everything *around* the statement — where it came from,
 * what kind of claim it is, when it was added, checked, and when it stops being
 * repeatable. Those live in `localStorage`, keyed by workspace, and this file
 * is the only place that knows it. Same shape as the campaign-binding stub in
 * `brand.ts`: a module whose whole job is to be swapped for `apiJson` calls
 * when the endpoint exists.
 *
 * **The guardrails stance is faked outright**, and it is the less comfortable
 * of the two. See `readStance`.
 *
 * ## What the fake costs, said out loud
 *
 * It is **per browser**. A colleague opening the same workspace sees the
 * statements and none of the dates, and an expiry set on a laptop does not
 * protect anybody generating from the same workspace elsewhere. That is
 * acceptable for a screen being designed and is not acceptable shipped: the
 * expiry column is a safeguard, and a safeguard one browser wide is decoration.
 * The endpoint has to carry these before the section is offered to anybody who
 * is not us.
 */

/** Everything about a fact except which fact it is. */
export type FactMeta = Pick<
  BrandFact,
  'subject' | 'kind' | 'source' | 'addedAt' | 'checkedAt' | 'expiresAt'
>

/**
 * Whether a workspace has *decided* it needs no guardrails.
 *
 * `decidedAt` is the whole record: a stance with a date on it was taken by
 * somebody, and one without is the absence of a decision. See `readStance`.
 */
export type GuardrailsStance = { none: boolean; decidedAt: string | null }

type Store = {
  /** Fact metadata, keyed by the statement it belongs to. */
  facts: Record<string, FactMeta>
  stance: GuardrailsStance
}

const EMPTY: Store = { facts: {}, stance: { none: false, decidedAt: null } }

function storeKey(): string {
  return `ogen.brand.local.${getActiveWorkspaceId() ?? 'default'}`
}

function read(): Store {
  try {
    const stored = localStorage.getItem(storeKey())
    if (stored) return { ...EMPTY, ...(JSON.parse(stored) as Store) }
  } catch {
    // An unreadable sidecar answers with statements and no metadata, which is
    // exactly what a workspace that predates the ledger answers with — a state
    // every screen here already draws.
  }
  return structuredClone(EMPTY)
}

function write(store: Store): void {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(store))
  } catch {
    // Quota or private mode. The statements are still saved to the server; the
    // dates are lost, and the table draws them as never recorded.
  }
}

/** The key a statement is filed under: what it says, with the edges trimmed. */
function key(statement: string): string {
  return statement.trim()
}

/**
 * The statements the server holds, dressed in whatever we know about them.
 *
 * A statement with no metadata is not an error and not a migration to run: it
 * is a fact somebody wrote before this table existed, and it renders as one —
 * kind `documented` (the safest of the four to assume: something written down,
 * claiming nothing about how it was measured) and no dates at all, which the
 * table draws as *never recorded* rather than as today.
 */
export function factsFrom(statements: string[]): BrandFact[] {
  const { facts } = read()
  return statements.map((statement, at) => {
    const meta = facts[key(statement)]
    return {
      // Index-derived and stable for as long as the list is: the wire has no
      // id, and a random one would change on every refetch, which is enough to
      // make React remount the row somebody is typing in.
      id: `fact-${at}`,
      statement,
      // A statement written before the axis existed is one about this
      // business: the ledger only held those, and guessing otherwise would
      // move somebody's facts into a tab they never filed them under.
      subject: meta?.subject ?? ('us' as FactSubject),
      kind: meta?.kind ?? ('documented' as FactKind),
      source: meta?.source ?? '',
      addedAt: meta?.addedAt ?? '',
      checkedAt: meta?.checkedAt ?? '',
      expiresAt: meta?.expiresAt ?? '',
    }
  })
}

/**
 * Record what we know about these facts, and forget what we knew about any
 * that have gone.
 *
 * Rebuilt rather than merged, so deleting a fact takes its metadata with it —
 * a store that only ever grew would re-dress a statement somebody deleted and
 * retyped months later with the dates from its first life.
 */
export function saveFactMeta(facts: BrandFact[]): void {
  const store = read()
  const next: Record<string, FactMeta> = {}
  for (const fact of facts) {
    const statement = key(fact.statement)
    if (!statement) continue
    next[statement] = {
      subject: fact.subject,
      kind: fact.kind,
      source: fact.source.trim(),
      addedAt: fact.addedAt,
      checkedAt: fact.checkedAt,
      expiresAt: fact.expiresAt,
    }
  }
  write({ ...store, facts: next })
}

/**
 * Whether this workspace has decided it needs no guardrails.
 *
 * **The question this answers is one the data model could not.** `guardrails:
 * null` is the only empty there is, and it is two completely different
 * findings wearing one value: a workspace that has thought about it and
 * concluded nothing needs restricting, and a workspace where nobody has looked
 * at the screen. The app was drawing both as the second one — a red rail and
 * *nothing is off limits* — which is right for one of them and a nag for the
 * other, and there was no way to answer it.
 *
 * The server cannot hold this today, and not by omission: `PUT
 * /api/brand/guardrails` answers `422` to an all-empty body precisely so that
 * `DELETE` stays the only route to `null`. There is no *present but empty* row
 * to hang a stance on, so a stance needs a field of its own, and adding one is
 * a backend change nobody has been asked for yet.
 *
 * So it is stored here, and the cost is the one at the top of this file: it is
 * per browser. A stance is a decision a workspace takes, not a preference a
 * browser holds, and this must not ship as it is.
 */
export function readStance(): GuardrailsStance {
  return read().stance
}

export function writeStance(stance: GuardrailsStance): void {
  write({ ...read(), stance })
}
