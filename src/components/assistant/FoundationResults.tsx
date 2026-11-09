import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAssistantStore } from '@/stores/assistantStore'
import { cn } from '@/lib/styles'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { subjectCampaignId } from '@/types/assistant'
import type {
  AudienceChange,
  BrandChangeKind,
  BrandCheck,
  BulkBrandEdit,
  DistillSaved,
  DistillState,
  ExpiredFact,
  FactChange,
  FoundationResults as Results,
  GuardrailsChange,
  SeriesList,
  SeriesRhythm,
  SeriesRunChange,
  SeriesChange,
  ThreadSubject,
  UndoState,
  VoiceChange,
} from '@/types/assistant'
import { ResolvedLine, ResultBlock, ResultRow, TextAction } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * The brand tools' results (CON-461), each in the reply grammar: a voice,
 * audience, guardrail, fact or series changed (each with UNDO), a bulk change,
 * a brand reading, the series library, expired facts, and a brand check's
 * findings. Read-only follow-ups (renew a fact) are sent on the click; ones
 * the user should word (edit a fact) fill the composer.
 */
export function FoundationResults({
  threadId,
  turnId,
  subject,
  results,
  undoStates,
  disabled,
}: {
  threadId: string
  turnId: string
  subject: ThreadSubject
  results: Results
  undoStates: Record<string, UndoState>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const send = useAssistantStore((s) => s.send)
  const askFor = useAssistantStore((s) => s.askFor)
  const undo = useAssistantStore((s) => s.undo)
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const r = results

  const entries: [string, React.ReactNode][] = [
    [
      'brandCheck',
      r.brandCheck && (
        <BrandCheckCard
          t={t}
          check={r.brandCheck}
          campaignId={subjectCampaignId(subject)}
          onConfirm={(id) => void confirm(threadId, id)}
          disabled={disabled}
        />
      ),
    ],
    ['voice', r.voice && <VoiceCard t={t} voice={r.voice} undo={undoFor} />],
    [
      'audience',
      r.audience && <AudienceCard t={t} audience={r.audience} undo={undoFor} />,
    ],
    [
      'guardrails',
      r.guardrails && (
        <GuardrailsCard t={t} guardrails={r.guardrails} undo={undoFor} />
      ),
    ],
    ['fact', r.fact && <FactCard t={t} fact={r.fact} undo={undoFor} />],
    ['bulk', r.bulk && <BulkCard t={t} bulk={r.bulk} undo={undoFor} />],
    [
      'expiredFacts',
      r.expiredFacts && (
        <ExpiredFactsCard
          t={t}
          facts={r.expiredFacts}
          onRenew={(text) => void send(threadId, text)}
          onEdit={(text) => askFor(threadId, text)}
          disabled={disabled}
        />
      ),
    ],
    ['distill', r.distill && <DistillCard t={t} distill={r.distill} />],
    [
      'distillSaved',
      r.distillSaved && <DistillSavedCard t={t} saved={r.distillSaved} />,
    ],
    [
      'seriesList',
      r.seriesList && <SeriesListCard t={t} list={r.seriesList} />,
    ],
    [
      'series',
      r.series && <SeriesCard t={t} series={r.series} undo={undoFor} />,
    ],
    ['run', r.run && <RunCard t={t} run={r.run} undo={undoFor} />],
  ]
  const blocks = entries.filter(([, node]) => Boolean(node))

  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map(([key, block]) => (
        <Fragment key={key}>{block}</Fragment>
      ))}
    </div>
  )
}

/** The values each voice rule can hold, as the library words them. */
const RULE_VALUES = {
  formality: ['casual', 'neutral', 'formal'],
  person: ['i', 'we', 'third', 'none'],
  emoji: ['never', 'sparingly', 'freely'],
  length: ['short', 'medium', 'long'],
} as const

/**
 * The library's one-line description of a voice (`rulesLine`), from only the
 * rules the voice actually sets: an empty or unknown value is left out rather
 * than printed as a catalogue key, or guessed — an unset narrator is not
 * "no narrator".
 */
function voiceRulesText(
  t: TFunction,
  rules: NonNullable<VoiceChange['rules']>,
): string {
  const parts = (Object.keys(RULE_VALUES) as (keyof typeof RULE_VALUES)[])
    .filter((rule) =>
      (RULE_VALUES[rule] as readonly string[]).includes(rules[rule]),
    )
    .map((rule) =>
      t(
        `brand.voices.rules.${rule}.${rules[rule]}` as 'brand.voices.rules.person.we',
      ),
    )
  return parts.join(t('brand.facts.separator'))
}

function shortDate(value: string): string | null {
  return value ? formatDate(value, { day: 'numeric', month: 'short' }) : null
}

function changeWord(t: TFunction, change: BrandChangeKind): string {
  return change === 'removed'
    ? t('assistant.foundation.word.removed')
    : change === 'added'
      ? t('assistant.foundation.word.added')
      : t('assistant.word.done')
}

function rhythmText(t: TFunction, rhythm: SeriesRhythm): string {
  return rhythm.per === 'week'
    ? t('assistant.foundation.rhythm.week', counted(rhythm.times))
    : t('assistant.foundation.rhythm.month', counted(rhythm.times))
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12.5px] text-tertiary-foreground">{children}</span>
  )
}

function Row({
  title,
  sub,
  action,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <ResultRow className="flex items-baseline gap-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-foreground">{title}</span>
        {sub && <Muted>{sub}</Muted>}
      </span>
      {action}
    </ResultRow>
  )
}

const OPEN_CLASS =
  'shrink-0 text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground'

/** A voice added, changed or removed. */
function VoiceCard({
  t,
  voice,
  undo,
}: {
  t: TFunction
  voice: VoiceChange
  undo: ResultUndo
}) {
  const rules = voice.rules ? voiceRulesText(t, voice.rules) : ''
  const open =
    voice.change !== 'removed' ? (
      <Link
        to="/foundation/voices/$voiceId"
        params={{ voiceId: voice.id }}
        className={OPEN_CLASS}
      >
        {t('assistant.foundation.open')}
      </Link>
    ) : undefined
  return (
    <ResultBlock
      status={changeWord(t, voice.change)}
      title={voice.name}
      meta={t('assistant.foundation.noun.voice')}
      action={<UndoAction t={t} undoId={voice.undoId} undo={undo} />}
    >
      {voice.whenToUse && <Row title={voice.whenToUse} />}
      {voice.change !== 'removed' && (
        <Row
          title={
            rules ||
            (voice.isDefault
              ? t('assistant.foundation.voice.default')
              : t('assistant.foundation.voice.noRules'))
          }
          sub={
            rules && voice.isDefault
              ? t('assistant.foundation.voice.default')
              : undefined
          }
          action={open}
        />
      )}
      {voice.change === 'removed' && voice.unbound > 0 && (
        <Row
          title={t('assistant.foundation.unbound', counted(voice.unbound))}
        />
      )}
      <UndoNote t={t} undoId={voice.undoId} undo={undo} />
    </ResultBlock>
  )
}

/** An audience added, changed or removed. */
function AudienceCard({
  t,
  audience,
  undo,
}: {
  t: TFunction
  audience: AudienceChange
  undo: ResultUndo
}) {
  return (
    <ResultBlock
      status={changeWord(t, audience.change)}
      title={audience.name}
      meta={t('assistant.foundation.noun.audience')}
      action={<UndoAction t={t} undoId={audience.undoId} undo={undo} />}
    >
      {(audience.who || audience.readsOn) && (
        <Row
          title={audience.who || audience.readsOn}
          sub={
            audience.who && audience.readsOn
              ? t('assistant.foundation.audience.readsOn', {
                  where: audience.readsOn,
                })
              : undefined
          }
          action={
            audience.change !== 'removed' ? (
              <Link
                to="/foundation/audiences/$audienceId"
                params={{ audienceId: audience.id }}
                className={OPEN_CLASS}
              >
                {t('assistant.foundation.open')}
              </Link>
            ) : undefined
          }
        />
      )}
      {audience.change === 'removed' && audience.unbound > 0 && (
        <Row
          title={t('assistant.foundation.unbound', counted(audience.unbound))}
        />
      )}
      <UndoNote t={t} undoId={audience.undoId} undo={undo} />
    </ResultBlock>
  )
}

/** The guardrails after a change: what may and may not be said. */
function GuardrailsCard({
  t,
  guardrails,
  undo,
}: {
  t: TFunction
  guardrails: GuardrailsChange
  undo: ResultUndo
}) {
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.foundation.guardrails.title')}
      action={<UndoAction t={t} undoId={guardrails.undoId} undo={undo} />}
    >
      <Row
        title={t('assistant.foundation.guardrails.claims', {
          may: formatNumber(guardrails.mayClaim),
          never: formatNumber(guardrails.neverClaim),
        })}
        action={
          <Link to="/foundation/guardrails" className={OPEN_CLASS}>
            {t('assistant.foundation.open')}
          </Link>
        }
      />
      {guardrails.bannedWords.length > 0 && (
        <Row
          title={t('assistant.foundation.guardrails.banned')}
          sub={formatList(guardrails.bannedWords)}
        />
      )}
      {guardrails.disclaimer && (
        <Row
          title={t('assistant.foundation.guardrails.disclaimer')}
          sub={guardrails.disclaimer}
        />
      )}
      <UndoNote t={t} undoId={guardrails.undoId} undo={undo} />
    </ResultBlock>
  )
}

function expiryText(t: TFunction, expiresAt: string): string {
  const date = shortDate(expiresAt)
  return date
    ? t('assistant.foundation.fact.expires', { date })
    : t('assistant.foundation.fact.noExpiry')
}

/** A fact changed, or renewed for another season. */
function FactCard({
  t,
  fact,
  undo,
}: {
  t: TFunction
  fact: FactChange
  undo: ResultUndo
}) {
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={fact.statement}
      action={<UndoAction t={t} undoId={fact.undoId} undo={undo} />}
    >
      <Row
        title={expiryText(t, fact.expiresAt)}
        sub={fact.source || undefined}
        action={
          <Link to="/foundation/facts" className={OPEN_CLASS}>
            {t('assistant.foundation.open')}
          </Link>
        }
      />
      <UndoNote t={t} undoId={fact.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * A bulk change: how many it made, the ones it couldn't, and one UNDO that
 * reverses each of them by its own id.
 */
function BulkCard({
  t,
  bulk,
  undo,
}: {
  t: TFunction
  bulk: BulkBrandEdit
  undo: ResultUndo
}) {
  // Each change was logged under its own id, so each answers on its own: an
  // id with no state yet (never asked, or a failure that cleared it) is still
  // undoable, and UNDO asks again for exactly those.
  const states = bulk.undoIds.map((id) => undo.states[id])
  const open = bulk.undoIds.filter((id) => !undo.states[id])
  const pending = states.includes('pending')
  const allUndone =
    bulk.undoIds.length > 0 && states.every((s) => s === 'undone')
  const changed = states.filter((s) => s === 'changed').length
  const gone = states.filter((s) => s === 'gone').length
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.foundation.bulk.title', counted(bulk.done))}
      action={
        open.length > 0 && !pending ? (
          <TextAction onClick={() => open.forEach(undo.onUndo)}>
            {t('assistant.undo.undo')}
          </TextAction>
        ) : undefined
      }
    >
      {bulk.failed.map((f, i) => (
        <ResultRow key={i}>
          <p className="text-sm text-warning">
            {t('assistant.foundation.bulk.failed', {
              what: f.what,
              reason: f.reason,
            })}
          </p>
        </ResultRow>
      ))}
      {bulk.stopped && <Row title={<Muted>{bulk.stopped}</Muted>} />}
      {allUndone && <ResolvedLine>{t('assistant.undo.undone')}</ResolvedLine>}
      {changed > 0 && (
        <p className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.foundation.bulk.undoChanged', counted(changed))}
        </p>
      )}
      {gone > 0 && (
        <p className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.foundation.bulk.undoGone', counted(gone))}
        </p>
      )}
    </ResultBlock>
  )
}

/** Expired facts, each with RENEW and EDIT. */
function ExpiredFactsCard({
  t,
  facts,
  onRenew,
  onEdit,
  disabled,
}: {
  t: TFunction
  facts: ExpiredFact[]
  onRenew: (text: string) => void
  onEdit: (text: string) => void
  disabled: boolean
}) {
  return (
    <ResultBlock
      status={t('assistant.foundation.facts.word')}
      tone={facts.length > 0 ? 'warning' : 'neutral'}
      title={
        facts.length === 0
          ? t('assistant.foundation.facts.none')
          : t('assistant.foundation.facts.expired', counted(facts.length))
      }
    >
      {facts.map((fact) => (
        <Row
          key={fact.id}
          title={fact.statement}
          sub={[
            t('assistant.foundation.facts.expiredOn', {
              date: shortDate(fact.expiresAt) ?? '',
            }),
            fact.source,
          ]
            .filter(Boolean)
            .join(' · ')}
          action={
            <span className="flex shrink-0 gap-3">
              <TextAction
                disabled={disabled}
                onClick={() =>
                  onRenew(
                    t('assistant.foundation.facts.renewPrompt', {
                      statement: fact.statement,
                    }),
                  )
                }
              >
                {t('assistant.foundation.facts.renew')}
              </TextAction>
              <TextAction
                disabled={disabled}
                onClick={() =>
                  onEdit(
                    t('assistant.foundation.facts.editPrompt', {
                      statement: fact.statement,
                    }),
                  )
                }
              >
                {t('assistant.foundation.facts.edit')}
              </TextAction>
            </span>
          }
        />
      ))}
    </ResultBlock>
  )
}

function distillWord(t: TFunction, status: string): string {
  switch (status) {
    case 'ready':
      return t('assistant.foundation.distill.word.ready')
    case 'failed':
      return t('assistant.foundation.distill.word.failed')
    case 'committed':
      return t('assistant.foundation.distill.word.committed')
    default:
      return t('assistant.foundation.distill.word.reading')
  }
}

function countsLine(
  t: TFunction,
  c: { voices: number; audiences: number; guardrails: number; facts: number },
): string {
  return formatList(
    [
      c.voices > 0 &&
        t('assistant.foundation.distill.voices', counted(c.voices)),
      c.audiences > 0 &&
        t('assistant.foundation.distill.audiences', counted(c.audiences)),
      c.guardrails > 0 &&
        t('assistant.foundation.distill.guardrails', counted(c.guardrails)),
      c.facts > 0 && t('assistant.foundation.distill.facts', counted(c.facts)),
    ].filter((x): x is string => !!x),
  )
}

/** A brand reading: running, ready to review, or failed — with the way to it. */
function DistillCard({ t, distill }: { t: TFunction; distill: DistillState }) {
  const line = countsLine(t, distill.counts)
  return (
    <ResultBlock
      status={distillWord(t, distill.status)}
      tone={distill.status === 'failed' ? 'warning' : 'neutral'}
      title={t('assistant.foundation.distill.title')}
    >
      <Row
        title={
          distill.status === 'failed'
            ? distill.failure || t('assistant.foundation.distill.failed')
            : line || t('assistant.foundation.distill.running')
        }
        action={
          <Link
            to="/foundation/read/$runId"
            params={{ runId: distill.runId }}
            className={OPEN_CLASS}
          >
            {t('assistant.foundation.distill.open')}
          </Link>
        }
      />
      {distill.questions.length > 0 && (
        <Row
          title={t(
            'assistant.foundation.distill.questions',
            counted(distill.questions.length),
          )}
          sub={distill.questions
            .slice(0, 3)
            .map((q) => q.text)
            .join(' · ')}
        />
      )}
    </ResultBlock>
  )
}

/** What a committed reading saved, and what it skipped. */
function DistillSavedCard({ t, saved }: { t: TFunction; saved: DistillSaved }) {
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t('assistant.foundation.distill.saved')}
    >
      <Row
        title={
          countsLine(t, saved) || t('assistant.foundation.distill.savedNothing')
        }
      />
      {saved.skipped.length > 0 && (
        <Row
          title={t(
            'assistant.foundation.distill.skipped',
            counted(saved.skipped.length),
          )}
          sub={formatList(saved.skipped)}
        />
      )}
    </ResultBlock>
  )
}

/** The series library, and what the campaign in scope runs. */
function SeriesListCard({ t, list }: { t: TFunction; list: SeriesList }) {
  return (
    <ResultBlock
      status={t('assistant.foundation.series.word')}
      title={
        list.series.length === 0
          ? t('assistant.foundation.series.none')
          : t('assistant.foundation.series.title', counted(list.series.length))
      }
    >
      {list.series.map((s) => (
        <Row
          key={s.id}
          title={s.name}
          sub={
            s.runs && s.rhythm
              ? rhythmText(t, s.rhythm)
              : list.campaignId
                ? t('assistant.foundation.series.notRunning')
                : s.defaultRhythm
                  ? rhythmText(t, s.defaultRhythm)
                  : undefined
          }
          action={
            <Link
              to="/foundation/series/$seriesId"
              params={{ seriesId: s.id }}
              className={OPEN_CLASS}
            >
              {t('assistant.foundation.open')}
            </Link>
          }
        />
      ))}
    </ResultBlock>
  )
}

/** A series made, changed or removed. */
function SeriesCard({
  t,
  series,
  undo,
}: {
  t: TFunction
  series: SeriesChange
  undo: ResultUndo
}) {
  const rhythm = series.rhythm ?? series.defaultRhythm
  return (
    <ResultBlock
      status={changeWord(t, series.change)}
      title={series.name}
      meta={t('assistant.foundation.noun.series')}
      action={<UndoAction t={t} undoId={series.undoId} undo={undo} />}
    >
      {(series.recipe || rhythm) && (
        <Row
          title={series.recipe || (rhythm ? rhythmText(t, rhythm) : '')}
          sub={series.recipe && rhythm ? rhythmText(t, rhythm) : undefined}
          action={
            series.change !== 'removed' ? (
              <Link
                to="/foundation/series/$seriesId"
                params={{ seriesId: series.id }}
                className={OPEN_CLASS}
              >
                {t('assistant.foundation.open')}
              </Link>
            ) : undefined
          }
        />
      )}
      <UndoNote t={t} undoId={series.undoId} undo={undo} />
    </ResultBlock>
  )
}

/** A series started or stopped in a campaign, with its rhythm. */
function RunCard({
  t,
  run,
  undo,
}: {
  t: TFunction
  run: SeriesRunChange
  undo: ResultUndo
}) {
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        run.running
          ? t('assistant.foundation.run.running')
          : t('assistant.foundation.run.stopped')
      }
      meta={run.running && run.rhythm ? rhythmText(t, run.rhythm) : undefined}
      action={<UndoAction t={t} undoId={run.undoId} undo={undo} />}
    >
      <UndoNote t={t} undoId={run.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * A brand check's findings, numbered and most serious first, like the
 * calendar's. A fix that is an offer runs from here; one that opens the post
 * goes to it, through the post's campaign or else the thread's.
 */
function BrandCheckCard({
  t,
  check,
  campaignId,
  onConfirm,
  disabled,
}: {
  t: TFunction
  check: BrandCheck
  campaignId: string | undefined
  onConfirm: (proposalId: string) => void
  disabled: boolean
}) {
  const n = check.findings.length
  return (
    <ResultBlock
      status={t('assistant.foundation.check.word')}
      tone={n > 0 ? 'warning' : 'neutral'}
      title={
        n === 0
          ? t('assistant.foundation.check.none')
          : t('assistant.foundation.check.title', counted(n))
      }
      meta={t('assistant.foundation.check.inPosts', counted(check.checked))}
    >
      {check.findings.map((f, i) => {
        const campaign = f.campaignId ?? campaignId
        const serious = f.severity === 'high'
        const proposalId = f.proposalId
        return (
          <ResultRow key={i} className="flex items-baseline gap-3">
            <span
              className={cn(
                'w-5 shrink-0 font-mono text-xs',
                serious ? 'text-warning' : 'text-tertiary-foreground',
              )}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm text-foreground">
                {f.title || t('assistant.untitledPost')}
              </span>
              <Muted>{f.issue}</Muted>
              {f.quote && <Muted>“{f.quote}”</Muted>}
              {f.suggestion && <Muted>{f.suggestion}</Muted>}
            </span>
            {proposalId ? (
              <TextAction
                disabled={disabled}
                onClick={() => onConfirm(proposalId)}
              >
                {f.fixTitle || t('assistant.foundation.check.fix')}
              </TextAction>
            ) : campaign ? (
              <Link
                to="/campaigns/$campaignId/posts/$postId"
                params={{ campaignId: campaign, postId: f.postId }}
                className={OPEN_CLASS}
              >
                {t('assistant.foundation.check.openPost')}
              </Link>
            ) : null}
          </ResultRow>
        )
      })}
      {check.left > 0 && (
        <Row
          title={
            <Muted>
              {t('assistant.foundation.check.left', counted(check.left))}
            </Muted>
          }
        />
      )}
    </ResultBlock>
  )
}
