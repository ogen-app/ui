import type { Icon } from '@phosphor-icons/react'
import {
  BuildingsIcon,
  ChatTeardropTextIcon,
  FileTextIcon,
  HandshakeIcon,
  LightbulbIcon,
  PuzzlePieceIcon,
  RulerIcon,
} from '@phosphor-icons/react'

/**
 * The facts ledger — what is true about this business, one statement at a time
 * (CON-226 §"guardrails", split out).
 *
 * ## Why it left the guardrails screen
 *
 * Facts were the first of five lists on one page, and they are not the same
 * kind of thing as the other four. *May claim*, *never claim* and *banned
 * words* are rules: they are written once by whoever decides them, they are
 * true because somebody decided them, and they stop being right only when the
 * policy changes. A fact is a **record**: it came from somewhere, somebody put
 * it in on a date, and — this is the part a list of strings cannot hold — most
 * facts stop being true on their own. A headcount, a price, a response time and
 * a customer count all rot silently, and the generator goes on repeating them
 * in a confident voice long after they are wrong.
 *
 * A list of sentences cannot say *where this came from* or *when to stop
 * trusting it*, which is why this is a table and the rest of guardrails is not.
 *
 * ## The columns, and why each one earns its place
 *
 * - **Statement** — the fact, written as it should be repeated.
 * - **About** — who the statement is about: this business, a problem somebody
 *   else has, or an opening nobody has taken. See `FACT_SUBJECTS`.
 * - **Kind** — how subjective it is. See `FACT_KINDS`: it is the axis that
 *   decides how hard a claim may lean on it, and the one thing about a fact
 *   that cannot be read off the sentence.
 * - **Source** — where it can be checked. A fact whose source is blank is a
 *   fact somebody remembered.
 * - **Added** — when it went in.
 * - **Checked** — when somebody last confirmed it is still true. Different from
 *   *added* in the way that matters: a number entered two years ago and
 *   re-checked last week is trustworthy, and the same number never re-checked
 *   is the reason this table exists.
 * - **Expires** — the date it must not be repeated past. Optional, because a
 *   founding year does not expire and a headcount does.
 *
 * `checkedAt` and the derived `factStatus` are the two additions to what was
 * asked for, and they are the same argument twice: an expiry date nothing reads
 * is a column, not a safeguard.
 */
export type FactKind = 'measured' | 'documented' | 'commitment' | 'judgement'

/**
 * Who a statement is about — the ledger's second axis, and the one the
 * problems and opportunities ledgers turned out to be.
 *
 * They were asked for as two more sections, and they are not two more of
 * anything: *"50% of family offices struggle with software"* and *"there is no
 * privately deployed AI system for family finances"* have the identical row
 * shape — a sentence, a source, a date it went in, a date it stops being safe
 * to repeat — and they rot faster than anything a business knows about itself.
 * A market figure is somebody's survey from a year nobody names out loud, and
 * an opening closes the morning a competitor ships. That is the expiry column
 * doing exactly the job it was added for.
 *
 * It is **not** the same question as `FactKind`, which is why it is a second
 * field rather than four more kinds: the problem above is `measured` (a survey
 * counted it) and the opportunity is `judgement` (nobody can source an
 * absence). How checkable a statement is and who it is about are independent,
 * and collapsing them would make "is this a number we can stand behind"
 * unanswerable for two thirds of the ledger.
 */
export type FactSubject = 'us' | 'problem' | 'opportunity'

export type BrandFact = {
  /**
   * Stable within a session only.
   *
   * The wire has no id for a fact — `guardrails.facts` is an array of strings —
   * so this is minted client-side to key rows and to survive an edit to the
   * statement itself. See `services/api/brandLocal.ts` for what is stored
   * against it and why that is temporary.
   */
  id: string
  statement: string
  subject: FactSubject
  kind: FactKind
  /** Where it can be checked: a URL, a document, a person. Free text. */
  source: string
  /** `YYYY-MM-DD`. */
  addedAt: string
  /** `YYYY-MM-DD`, or `''` for a fact nobody has re-checked since. */
  checkedAt: string
  /** `YYYY-MM-DD`, or `''` for a fact that does not go off. */
  expiresAt: string
}

export type FactSubjectInfo = {
  id: FactSubject
  /** On the row and in the picker — singular, because a row is one of them. */
  label: string
  /** The tab, the filter and the Overview's line. */
  plural: string
  icon: Icon
  /** What belongs here, in the one line the picker shows. */
  hint: string
  /**
   * The empty field's example — one sentence of the shape this ledger wants.
   *
   * Per subject for the same reason the kind is: a form headed *Add an
   * opportunity* showing a support metric teaches the wrong shape in the one
   * place somebody is looking for the right one.
   */
  example: string
  /**
   * The kind a fresh statement of this sort opens on.
   *
   * Not a claim that every opportunity is a judgement — it is the kind the
   * picker starts on, and the two axes are still independent. But an opening
   * is an *absence*, and an absence has no system that holds it and nothing to
   * count: `measured` was wrong on nearly every opportunity anybody would
   * write, and a default that is usually wrong is worse than no default,
   * because it is the one nobody thinks to change.
   */
  startsAs: FactKind
}

/**
 * The three, in the order a page about this business would make them: what we
 * are, what is wrong out there, and what that leaves open.
 */
export const FACT_SUBJECTS: FactSubjectInfo[] = [
  {
    id: 'us',
    label: 'About us',
    plural: 'About this business',
    icon: BuildingsIcon,
    hint: 'Something true about this business — what it does, what it has counted, what it has promised.',
    example: 'Support answered 94% of tickets within one working day in 2026.',
    startsAs: 'measured',
  },
  {
    id: 'problem',
    label: 'Problem',
    plural: 'Problems',
    icon: PuzzlePieceIcon,
    // A problem worth stating is usually one somebody counted — "half of them
    // struggle with it" is a survey, and the ones we merely believe are the
    // ones to be careful repeating.
    hint: 'Somebody else’s difficulty, written as they would recognise it rather than as the thing we sell against it.',
    example:
      'Half of family offices still reconcile their positions in spreadsheets.',
    startsAs: 'measured',
  },
  {
    id: 'opportunity',
    label: 'Opportunity',
    plural: 'Opportunities',
    icon: LightbulbIcon,
    hint: 'A gap in the world as it is — what nobody is doing yet, and what that makes possible.',
    example: 'No privately deployed assistant is built for family finances.',
    startsAs: 'judgement',
  },
]

export function factSubject(id: FactSubject): FactSubjectInfo {
  return FACT_SUBJECTS.find((s) => s.id === id)!
}

/** How many of the ledger are about one thing. The tabs and the hub card. */
export function countBySubject(
  facts: BrandFact[],
  subject: FactSubject,
): number {
  return facts.filter((fact) => fact.subject === subject).length
}

/**
 * Whether a fact answers a search.
 *
 * Over the statement and the source, because those are the two fields somebody
 * wrote in their own words. The other three are already filters — About is a
 * tab, Kind and the dates are sortable columns — and a search that also read
 * them would return every problem in the ledger for a query aimed at a
 * sentence about one.
 *
 * Every word has to appear, in either field, in any order: *family
 * spreadsheets* finds "Half of family offices still reconcile their positions
 * in spreadsheets", which a single substring match would not, and nobody types
 * a search expecting the word order to be the part that matters.
 */
export function factMatches(fact: BrandFact, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = `${fact.statement} ${fact.source}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

export type FactKindInfo = {
  id: FactKind
  label: string
  icon: Icon
  /** What it means, in the one line the picker shows. */
  hint: string
}

/**
 * The subjectivity ladder, most checkable first.
 *
 * Not a topic taxonomy ("pricing", "product", "company") — a topic is something
 * you could read off the sentence, and this is not. What a reader cannot tell
 * from *"we answer within one working day"* is whether that is a measurement,
 * a contract, a promise we have made, or a nice way of describing ourselves,
 * and those four licence very different claims: the first two can be repeated
 * as facts, the third is true while we keep it, and the fourth may never be put
 * in a sentence that reads like a statistic.
 */
export const FACT_KINDS: FactKindInfo[] = [
  {
    id: 'measured',
    label: 'Measured',
    icon: RulerIcon,
    hint: 'A number somebody measured, over a period, from a system that holds it.',
  },
  {
    id: 'documented',
    label: 'Documented',
    icon: FileTextIcon,
    hint: 'Written down somewhere we can point at — a contract, a spec, a licence.',
  },
  {
    id: 'commitment',
    label: 'Commitment',
    icon: HandshakeIcon,
    hint: 'True because we decided it, and true for exactly as long as we keep it.',
  },
  {
    id: 'judgement',
    label: 'Judgement',
    icon: ChatTeardropTextIcon,
    hint: 'Our own reading of it. Defensible, not checkable — never write it as a figure.',
  },
]

export function factKind(id: FactKind): FactKindInfo {
  return FACT_KINDS.find((k) => k.id === id)!
}

/** What a fact is worth today. */
export type FactStatus = 'current' | 'due' | 'expired'

/** How long before an expiry date the table starts saying so. */
export const DUE_WITHIN_DAYS = 30

/**
 * Whether this fact may still be repeated.
 *
 * `due` is the whole point of the column: a fact that expires tomorrow is not
 * yet wrong, and the day it becomes wrong is the day nobody is looking at this
 * screen. Facts with no expiry are `current` and stay there — an unexpiring
 * fact is a claim about the kind of fact it is, not a gap in the record.
 */
export function factStatus(fact: BrandFact, today: string): FactStatus {
  if (!fact.expiresAt) return 'current'
  if (fact.expiresAt < today) return 'expired'
  return daysBetween(today, fact.expiresAt) <= DUE_WITHIN_DAYS
    ? 'due'
    : 'current'
}

/**
 * How far off an expiry is, as a count and a unit — never as a phrase.
 *
 * The column used to print the date itself, and a date is the one thing this
 * cell is not read for. Nobody scanning a ledger for what has gone off
 * subtracts *01 Aug 26* from today in their head; what they want is the answer
 * to that subtraction, and the date is the supporting detail — which is why it
 * moved to the hover.
 *
 * ## The units, and where they change over
 *
 * **Days up to two months, months after that.** The obvious threshold is one
 * month, and it is wrong: everything from six weeks to nine weeks rounds to
 * *next month*, which is vaguer than the "in 52 days" it replaced. Days keep
 * going until a month count can honestly say *two*.
 *
 * **Years past two of them.** Not a unit that was asked for, and the
 * alternative is worse: *in 47 months* is a number nobody converts. Two years
 * is where the months stop being read as a duration and start being read as
 * arithmetic.
 *
 * The count is signed, the way `Intl.RelativeTimeFormat` wants it — negative
 * is a fact already past its date and being repeated now. Returning the pair
 * rather than the sentence is the rule the publish countdown follows for the
 * same reason: the words belong to the active language, and a module that
 * baked "in 2 months" into a return value would freeze whichever one loaded
 * first (`docs/technical-decisions.md#i18n`).
 */
export type ExpiryDistance = {
  /** Signed: positive is ahead, negative is overdue. */
  value: number
  unit: 'day' | 'month' | 'year'
}

/** Averaged, because the buckets are approximations by design. */
const DAYS_PER_MONTH = 30.44
const DAYS_PER_YEAR = 365.25

export function expiryDistance(days: number): ExpiryDistance {
  if (Math.abs(days) < 60) return { value: days, unit: 'day' }
  const months = Math.round(days / DAYS_PER_MONTH)
  if (Math.abs(months) < 24) return { value: months, unit: 'month' }
  return { value: Math.round(days / DAYS_PER_YEAR), unit: 'year' }
}

/** Whole days from one `YYYY-MM-DD` to another. Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Today, as the dates in this table are written. */
export function todayISO(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The ledger's own summary: how many facts, and how many of them the app should
 * not be repeating.
 *
 * Both cards that preview this section show the second number, because it is
 * the only one that can be bad. Sixty facts is not a finding; two expired ones
 * are.
 */
export function factTally(
  facts: BrandFact[],
  today: string,
): { total: number; due: number; expired: number } {
  let due = 0
  let expired = 0
  for (const fact of facts) {
    const status = factStatus(fact, today)
    if (status === 'due') due += 1
    if (status === 'expired') expired += 1
  }
  return { total: facts.length, due, expired }
}

/**
 * A blank row, dated today — what the add button puts in the table.
 *
 * `subject` is passed in rather than defaulted, because the button is pressed
 * underneath a tab: on Problems it adds a problem. Nobody arrives at an empty
 * form to be asked a question the tab they are standing on already answered.
 *
 * The subject also picks the kind the row opens on — see `startsAs`.
 */
export function emptyFact(
  id: string,
  today: string,
  subject: FactSubject = 'us',
): BrandFact {
  return {
    id,
    statement: '',
    subject,
    kind: factSubject(subject).startsAs,
    source: '',
    addedAt: today,
    checkedAt: today,
    expiresAt: '',
  }
}
