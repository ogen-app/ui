import { useState, type ReactNode } from 'react'
import {
  ArrowSquareOutIcon,
  ClockIcon,
  InfinityIcon,
  InfoIcon,
  QuotesIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'
import { brandSection, brandSectionCopy } from '@/lib/brandSections'
import {
  disclaimerIsChoice,
  factDraft,
  isDropped,
  lineText,
  primaryEvidence,
  toggleDropped,
  type DistillReview,
  type FactDraft,
} from '@/lib/brandDistill'
import { formatDate } from '@/lib/intl'
import type {
  DistillAnswer,
  DistillEvidence,
  DistillProposal,
  DistillSource,
  ProposedFact,
  ProposedLine,
} from '@/types/brandDistill'
import { Field } from '../editor'
import {
  FACT_KINDS,
  FACT_SUBJECTS,
  factKind,
  factSubject,
  type FactKind,
  type FactSubject,
} from '../facts'
import {
  GroupLabel,
  KeepDrop,
  KeepMark,
  ReviewSection,
  SourceLabel,
} from './parts'

/**
 * The small items of a review — guardrail lines, banned words, the
 * disclaimer, facts (CON-400 boards 3 and 4A/B).
 *
 * **One click toggles a line.** They carry `LineItem`'s marker as a button:
 * green check kept, empty circle dropped, and a dropped line goes grey but
 * stays legible. Opening a line — clicking its words — shows the passage it
 * was quoted from, word for word, with a way to the page, and lets it be
 * rewritten. Editing never re-checks: once it is changed, it is yours.
 */

type Update = (update: (review: DistillReview) => DistillReview) => void

type Context = {
  review: DistillReview
  update: Update
  answers: DistillAnswer[]
  sources: DistillSource[]
}

export function GuardrailsReview({
  proposal,
  currentWrittenAt,
  ...ctx
}: Context & {
  proposal: DistillProposal
  /** When the workspace's guardrails were last saved — dates "yours". */
  currentWrittenAt: string | null
}) {
  const { t } = useTranslation()
  const info = brandSection('guardrails')
  const g = proposal.guardrails
  const choice = disclaimerIsChoice(proposal)
  const lines = g.mayClaim.length + g.neverClaim.length + (g.disclaimer ? 1 : 0)

  return (
    <ReviewSection
      icon={info.icon}
      tone={info.tone}
      title={brandSectionCopy(t, 'guardrails').label}
      qualifier={[
        lines > 0 && t('brand.distill.review.lines', { count: lines }),
        g.bannedWords.length > 0 &&
          t('brand.distill.review.words', { count: g.bannedWords.length }),
      ]
        .filter(Boolean)
        .join(t('brand.distill.review.qualifierJoin'))}
    >
      {g.mayClaim.length > 0 && (
        <Group label={t('brand.overview.guardrails.mayClaim')}>
          {g.mayClaim.map((line) => (
            <LineRow key={line.proposalId} line={line} {...ctx} />
          ))}
        </Group>
      )}
      {g.neverClaim.length > 0 && (
        <Group label={t('brand.overview.guardrails.neverClaim')}>
          {g.neverClaim.map((line) => (
            <LineRow key={line.proposalId} line={line} {...ctx} />
          ))}
        </Group>
      )}
      {g.bannedWords.length > 0 && (
        <Group label={t('brand.overview.guardrails.bannedWords')}>
          <div className="flex flex-wrap gap-2">
            {g.bannedWords.map((word) => (
              <WordChip key={word.proposalId} word={word} {...ctx} />
            ))}
          </div>
        </Group>
      )}
      {g.disclaimer && (
        <Group label={t('brand.overview.guardrails.disclaimer')}>
          {choice ? (
            <DisclaimerChoice
              current={g.disclaimer.current ?? ''}
              proposed={g.disclaimer}
              writtenAt={currentWrittenAt}
              {...ctx}
            />
          ) : (
            <LineRow line={g.disclaimer} {...ctx} />
          )}
        </Group>
      )}
    </ReviewSection>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <GroupLabel>{label}</GroupLabel>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}

/** A guardrail line: the marker, the words, the page it came from. */
function LineRow({
  line,
  review,
  update,
  answers,
  sources,
}: Context & { line: ProposedLine }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const dropped = isDropped(review, line.proposalId)
  const text = lineText(line, review)
  const toggle = () => update((r) => toggleDropped(r, line.proposalId))

  if (open) {
    return (
      <Opened
        kept={!dropped}
        onToggle={toggle}
        onClose={() => setOpen(false)}
        evidence={primaryEvidence(line.evidence)}
        answers={answers}
        sources={sources}
      >
        <Field label={t('brand.distill.review.line')}>
          <LineInput
            value={text}
            onChange={(next) =>
              update((r) => ({
                ...r,
                lines: { ...r.lines, [line.proposalId]: next },
              }))
            }
          />
        </Field>
      </Opened>
    )
  }

  return (
    <div className="flex min-h-8 items-start gap-3 py-1.5">
      <span className="flex h-5 items-center">
        <KeepMark kept={!dropped} label={text} onToggle={toggle} />
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'min-w-0 flex-1 cursor-pointer text-left text-sm leading-5 hover:underline',
          dropped && 'text-tertiary-foreground',
        )}
      >
        {text}
      </button>
      <SourceLabel
        evidence={line.evidence.slice(0, 1)}
        answers={answers}
        bare
        className="max-w-[40%] shrink-0 justify-end pt-0.5 text-right"
      />
    </div>
  )
}

/**
 * A banned word, as a chip. Dashed and struck through when dropped — the
 * same word, visibly not going in, rather than gone.
 */
function WordChip({ word, review, update }: Context & { word: ProposedLine }) {
  const { t } = useTranslation()
  const dropped = isDropped(review, word.proposalId)
  const text = lineText(word, review)
  return (
    <button
      type="button"
      aria-pressed={!dropped}
      aria-label={
        dropped
          ? t('brand.distill.review.keepLine', { line: text })
          : t('brand.distill.review.dropLine', { line: text })
      }
      onClick={() => update((r) => toggleDropped(r, word.proposalId))}
      className={cn(
        'cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        dropped
          ? 'border-dashed border-quaternary text-tertiary-foreground line-through'
          : 'border-transparent bg-tertiary text-foreground hover:bg-quaternary',
      )}
    >
      {text}
    </button>
  )
}

/**
 * The one place a review can replace something the workspace already has.
 *
 * Not a checkbox: it shows both texts and keeps **yours** selected, and only an
 * explicit pick sends the site's on commit. Folded to one line until somebody
 * asks to compare, because most people keep their own and a second paragraph
 * of legal text in the middle of the review is the screen asking them to read
 * it.
 */
function DisclaimerChoice({
  current,
  proposed,
  writtenAt,
  review,
  update,
  answers,
}: Context & {
  current: string
  proposed: ProposedLine
  writtenAt: string | null
}) {
  const { t, i18n } = useTranslation()
  const [comparing, setComparing] = useState(review.disclaimer === 'site')
  const pick = (which: DistillReview['disclaimer']) =>
    update((r) => ({ ...r, disclaimer: which }))

  if (!comparing) {
    return (
      <div className="flex items-center gap-3 bg-secondary py-1.5 pr-1.5 pl-3">
        <InfoIcon
          aria-hidden
          className="size-4 shrink-0 text-tertiary-foreground"
        />
        <p className="min-w-0 flex-1 text-sm text-secondary-foreground">
          {t('brand.distill.review.disclaimerDiffers')}
        </p>
        <Button variant="outline" size="sm" onClick={() => setComparing(true)}>
          {t('brand.distill.review.compare')}
        </Button>
      </div>
    )
  }

  const written = writtenAt
    ? formatDate(writtenAt, { day: 'numeric', month: 'short' }, i18n.language)
    : null

  // The radio pattern: one stop in the Tab order — the chosen card — and the
  // arrow keys move the choice, which with two options is always the other.
  const other = () => pick(review.disclaimer === 'yours' ? 'site' : 'yours')

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label={t('brand.overview.guardrails.disclaimer')}
        className="flex flex-col gap-3"
      >
        <ChoiceCard
          selected={review.disclaimer === 'yours'}
          onSelect={() => pick('yours')}
          onArrow={other}
          title={t('brand.distill.review.keepYours')}
          meta={
            written
              ? t('brand.distill.review.writtenHereOn', { date: written })
              : t('brand.shell.origin.blank')
          }
          text={current}
        />
        <ChoiceCard
          selected={review.disclaimer === 'site'}
          onSelect={() => pick('site')}
          onArrow={other}
          title={t('brand.distill.review.useTheirs')}
          meta={
            <SourceLabel
              evidence={proposed.evidence.slice(0, 1)}
              answers={answers}
              bare
            />
          }
          text={lineText(proposed, review)}
        />
      </div>
      <p className="text-xs text-tertiary-foreground">
        {t('brand.distill.review.disclaimerRule')}
      </p>
    </div>
  )
}

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

function ChoiceCard({
  selected,
  onSelect,
  onArrow,
  title,
  meta,
  text,
}: {
  selected: boolean
  onSelect: () => void
  /** An arrow key: move the choice, and the focus with it. */
  onArrow: () => void
  title: string
  meta: ReactNode
  text: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!ARROWS.includes(e.key)) return
        e.preventDefault()
        onArrow()
        const radios = e.currentTarget
          .closest('[role=radiogroup]')
          ?.querySelectorAll<HTMLElement>('[role=radio]')
        const next = [...(radios ?? [])].find((r) => r !== e.currentTarget)
        next?.focus()
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-md border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-foreground'
          : 'border-quaternary hover:border-tertiary-foreground',
      )}
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-4 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-foreground' : 'border-senary-foreground',
          )}
        >
          {selected && <span className="size-2 rounded-full bg-foreground" />}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-tertiary-foreground">
          {meta}
        </span>
      </span>
      <span className="pl-7 text-sm leading-5 text-secondary-foreground">
        {text}
      </span>
    </button>
  )
}

/** Facts are many; six are shown until somebody asks for the rest. */
const FACTS_SHOWN = 6

export function FactsReview({
  facts,
  ...ctx
}: Context & { facts: ProposedFact[] }) {
  const { t } = useTranslation()
  const info = brandSection('facts')
  const [all, setAll] = useState(false)
  const shown = all ? facts : facts.slice(0, FACTS_SHOWN)
  const rest = facts.length - shown.length

  return (
    <ReviewSection
      icon={info.icon}
      tone={info.tone}
      title={brandSectionCopy(t, 'facts').label}
      qualifier={t('brand.distill.review.proposed', { count: facts.length })}
    >
      <div className="flex flex-col">
        <div
          className={cn(
            FACT_GRID,
            'border-b border-quaternary pb-2 font-grotesk text-xs font-medium uppercase tracking-wide text-secondary-foreground',
          )}
        >
          <span />
          <span>{t('brand.distill.review.factColumns.statement')}</span>
          <span className="hidden sm:block">
            {t('brand.distill.review.factColumns.about')}
          </span>
          <span className="hidden sm:block">
            {t('brand.distill.review.factColumns.kind')}
          </span>
          <span className="hidden sm:block">
            {t('brand.distill.review.factColumns.expires')}
          </span>
        </div>
        {shown.map((fact) => (
          <FactRow key={fact.proposalId} fact={fact} {...ctx} />
        ))}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="cursor-pointer self-start text-sm font-medium text-accent hover:underline"
        >
          {t('brand.distill.review.moreFacts', { count: rest })}
        </button>
      )}
    </ReviewSection>
  )
}

/** Mark, statement, then the ledger's three columns — About, Kind, Expires. */
const FACT_GRID =
  'grid grid-cols-[16px_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[16px_minmax(0,1fr)_104px_116px_112px]'

function FactRow({
  fact,
  review,
  update,
  answers,
  sources,
}: Context & { fact: ProposedFact }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const dropped = isDropped(review, fact.proposalId)
  const draft = factDraft(fact, review)
  const toggle = () => update((r) => toggleDropped(r, fact.proposalId))
  const set = (patch: Partial<FactDraft>) =>
    update((r) => ({
      ...r,
      facts: {
        ...r.facts,
        [fact.proposalId]: { ...r.facts[fact.proposalId], ...patch },
      },
    }))

  if (open) {
    return (
      <div className="border-b border-quaternary">
        <Opened
          kept={!dropped}
          onToggle={toggle}
          onClose={() => setOpen(false)}
          evidence={primaryEvidence(fact.evidence)}
          answers={answers}
          sources={sources}
        >
          <Field label={t('brand.distill.review.factColumns.statement')}>
            <LineInput
              value={draft.statement}
              onChange={(statement) => set({ statement })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('brand.distill.review.factColumns.about')}>
              <TextSelect
                value={draft.subject}
                onValueChange={(subject) =>
                  set({ subject: subject as FactSubject })
                }
                elements={FACT_SUBJECTS.map((s) => ({
                  id: s.id,
                  displayValue: s.label,
                }))}
                size="default"
              />
            </Field>
            <Field label={t('brand.distill.review.factColumns.kind')}>
              <TextSelect
                value={draft.kind}
                onValueChange={(kind) => set({ kind: kind as FactKind })}
                elements={FACT_KINDS.map((k) => ({
                  id: k.id,
                  displayValue: k.label,
                }))}
                size="default"
              />
            </Field>
            <Field label={t('brand.distill.review.factColumns.expires')}>
              <DatePicker
                value={draft.expiresAt}
                onChange={(expiresAt) => set({ expiresAt })}
              />
            </Field>
          </div>
        </Opened>
      </div>
    )
  }

  const subject = factSubject(draft.subject)
  const kind = factKind(draft.kind)
  const SubjectIcon = subject.icon
  const KindIcon = kind.icon
  const muted = 'text-tertiary-foreground'

  return (
    <div
      className={cn(
        FACT_GRID,
        'min-h-[34px] border-b border-quaternary py-1.5',
      )}
    >
      <KeepMark kept={!dropped} label={draft.statement} onToggle={toggle} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={draft.statement}
        className={cn(
          'min-w-0 cursor-pointer truncate text-left text-sm hover:underline',
          dropped && muted,
        )}
      >
        {draft.statement}
      </button>
      <span
        className={cn('hidden items-center gap-1.5 text-sm sm:flex', muted)}
      >
        <SubjectIcon aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{subject.label}</span>
      </span>
      <span
        className={cn('hidden items-center gap-1.5 text-sm sm:flex', muted)}
      >
        <KindIcon aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{kind.label}</span>
      </span>
      <span
        className={cn('hidden items-center gap-1.5 text-sm sm:flex', muted)}
      >
        {draft.expiresAt ? (
          <>
            <ClockIcon aria-hidden className="size-4 shrink-0" />
            <span className="truncate tabular-nums">
              {formatDate(
                draft.expiresAt,
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  // A calendar day, not an instant: read in UTC so it is
                  // the same day wherever the reader is.
                  timeZone: 'UTC',
                },
                i18n.language,
              )}
            </span>
          </>
        ) : (
          <InfinityIcon
            aria-label={t('brand.distill.review.noExpiry')}
            className="size-4 shrink-0 text-senary-foreground"
          />
        )}
      </span>
    </div>
  )
}

/**
 * A line opened in place — the ideas list's opened row: a pale fill, no
 * border. What it was quoted from sits under the fields, word for word, with
 * the page it is on and a way to open it; this is the evidence the server
 * checked, and the reason to open a line at all.
 */
function Opened({
  kept,
  onToggle,
  onClose,
  evidence,
  answers,
  sources,
  children,
}: {
  kept: boolean
  onToggle: () => void
  onClose: () => void
  evidence: DistillEvidence | undefined
  answers: DistillAnswer[]
  sources: DistillSource[]
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="-mx-3 my-1 flex flex-col gap-4 bg-secondary px-3 py-4">
      <div className="flex flex-col gap-4 pl-7">{children}</div>
      {evidence && (
        <Passage evidence={evidence} answers={answers} sources={sources} />
      )}
      <div className="pl-7">
        <KeepDrop
          kept={kept}
          onKeep={() => !kept && onToggle()}
          onDrop={() => kept && onToggle()}
          trailing={
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('brand.distill.review.done')}
            </Button>
          }
        />
      </div>
    </div>
  )
}

/** The quote, the page it came from, and a way to it. */
function Passage({
  evidence,
  answers,
  sources,
}: {
  evidence: DistillEvidence
  answers: DistillAnswer[]
  sources: DistillSource[]
}) {
  const { t } = useTranslation()
  const answer =
    evidence.kind === 'answer'
      ? answers.find((a) => a.questionId === evidence.questionId)
      : undefined
  const quote = answer?.answer ?? evidence.quote
  if (!quote) return null
  const source = sources.find((s) => s.assetId === evidence.assetId)

  return (
    <figure className="flex gap-3">
      <QuotesIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-tertiary-foreground"
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <blockquote className="text-sm leading-6 whitespace-pre-line">
          {quote}
        </blockquote>
        <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <SourceLabel evidence={[evidence]} answers={answers} bare />
          {source?.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-medium text-accent hover:underline"
            >
              {t('brand.distill.review.openPage')}
              <ArrowSquareOutIcon aria-hidden className="size-3" />
            </a>
          ) : evidence.assetId ? (
            <Link
              to="/assets/$assetId"
              params={{ assetId: evidence.assetId }}
              className="font-medium text-accent hover:underline"
            >
              {t('brand.distill.review.openFile')}
            </Link>
          ) : null}
        </figcaption>
      </div>
    </figure>
  )
}

/** The facts editor's field: pale fill, a rule under it that goes black on focus. */
function LineInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-b-2 border-quaternary bg-primary focus-visible:border-foreground"
    />
  )
}
