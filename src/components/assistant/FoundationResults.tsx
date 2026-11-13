import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useDistillRun } from '@/hooks/useBrandDistill'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { humanizeStep } from '@/lib/assistantTools'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import type { ViewContext } from '@/lib/viewContext'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AudienceChange,
  BrandChangeKind,
  BrandCheck,
  BrandRead,
  BulkBrandEdit,
  DistillSaved,
  DistillState,
  ExpiredFact,
  FactChange,
  FieldChange,
  FoundationResults as Results,
  GuardrailsChange,
  SeriesBrief,
  SeriesChange,
  SeriesList,
  SeriesRhythm,
  SeriesRunChange,
  UndoState,
  VoiceChange,
} from '@/types/assistant'
import {
  ResolvedLine,
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import { FindingRow, FixActions } from './FindingsBlock'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * The brand tools' results (CON-461, drawn as CON-477 has them), each in the
 * reply grammar: a voice, audience, guardrail, fact or series changed — an
 * update saying what it changed — with UNDO; a bulk change; a brand reading;
 * the series library; a brand check's findings, in the calendar's grammar.
 *
 * `getBrand` is read before every edit, so what it read is drawn only when the
 * turn did nothing else: then the expired facts, the templates, the palette
 * and a voice summary's sources follow the screen the question came from.
 * Read-only follow-ups (renew a fact) are sent on the click; ones the user
 * should word (edit a fact) fill the composer.
 */
export function FoundationResults({
  threadId,
  turnId,
  results,
  undoStates,
  ignored = [],
  view,
  disabled,
}: {
  threadId: string
  turnId: string
  results: Results
  undoStates: Record<string, UndoState>
  /** Brand-check findings ignored from this card since. */
  ignored?: string[]
  /** The screen the question was asked from. */
  view?: ViewContext
  disabled: boolean
}) {
  const { t } = useTranslation()
  const send = useAssistantStore((s) => s.send)
  const askFor = useAssistantStore((s) => s.askFor)
  const undo = useAssistantStore((s) => s.undo)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const r = results
  const { brand } = r
  // A turn that only read the brand: what it read is the answer.
  const justRead =
    !!brand &&
    !r.voice &&
    !r.audience &&
    !r.guardrails &&
    !r.fact &&
    !r.bulk &&
    !r.distill &&
    !r.distillSaved &&
    !r.seriesList &&
    !r.series &&
    !r.run &&
    !r.brandCheck
  const screen = view?.screen
  const expired = r.expiredFacts ?? []
  const summarised =
    justRead && view?.focus?.kind === 'voice'
      ? brand.voices.find((v) => v.id === view.focus?.id)
      : undefined

  const entries: [string, React.ReactNode][] = [
    [
      'brandCheck',
      r.brandCheck && (
        <BrandCheckBlock
          t={t}
          threadId={threadId}
          turnId={turnId}
          check={r.brandCheck}
          ignored={ignored}
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
      justRead && (expired.length > 0 || screen === 'foundation.facts') && (
        <ExpiredFactsCard
          t={t}
          facts={expired}
          total={brand.factsTotal}
          onRenew={(text) => void send(threadId, text)}
          onEdit={(text) => askFor(threadId, text)}
          disabled={disabled}
        />
      ),
    ],
    [
      'templates',
      justRead && screen === 'foundation.templates' && (
        <TemplatesCard t={t} templates={brand.templates} />
      ),
    ],
    [
      'look',
      justRead && screen === 'foundation.look' && brand.look && (
        <LookCard t={t} look={brand.look} />
      ),
    ],
    [
      'voiceRead',
      summarised && (
        <SourcesLine
          label={t('assistant.assets.analysis.readFrom')}
          grounding={{
            mode: 'grounded',
            sources: [{ id: '', title: voiceSourceText(t, summarised) }],
          }}
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

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12.5px] text-secondary-foreground">{children}</span>
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

const OPEN_CLASS = `shrink-0 ${TEXT_ACTION_CLASS}`

/**
 * What an update changed, one row per field (CON-477): the field in the
 * catalogue's words, then the old value struck through and the new one, or
 * for a list the lines added and taken out. A voice rule's values are the
 * library's own words; anything else is the record's text.
 */
function ChangeRows({ t, changes }: { t: TFunction; changes: FieldChange[] }) {
  const { resolve } = usePlatformCatalog()
  return (
    <>
      {changes.map((c) => (
        <Row
          key={c.field}
          title={fieldLabel(t, c.field, resolve)}
          sub={
            c.added?.length || c.removed?.length ? (
              <>
                {c.added && c.added.length > 0 && (
                  <span className="block">
                    {t('assistant.foundation.change.added', {
                      lines: formatList(c.added),
                    })}
                  </span>
                )}
                {c.removed && c.removed.length > 0 && (
                  <span className="block">
                    {t('assistant.foundation.change.removed', {
                      lines: formatList(c.removed),
                    })}
                  </span>
                )}
              </>
            ) : (
              <>
                {c.before && (
                  <>
                    <s>{fieldValue(t, c.field, c.before)}</s>
                    {' → '}
                  </>
                )}
                {c.after
                  ? fieldValue(t, c.field, c.after)
                  : t('assistant.foundation.change.cleared')}
              </>
            )
          }
        />
      ))}
    </>
  )
}

const FIELD_LABEL = {
  name: 'assistant.foundation.field.name',
  whenToUse: 'assistant.foundation.field.whenToUse',
  isDefault: 'assistant.foundation.field.isDefault',
  formality: 'assistant.foundation.field.formality',
  person: 'assistant.foundation.field.person',
  length: 'assistant.foundation.field.length',
  emoji: 'assistant.foundation.field.emoji',
  hashtags: 'assistant.foundation.field.hashtags',
  opening: 'assistant.foundation.field.opening',
  closing: 'assistant.foundation.field.closing',
  samples: 'assistant.foundation.field.samples',
  who: 'assistant.foundation.field.who',
  readsOn: 'assistant.foundation.field.readsOn',
  scrollsPastWhen: 'assistant.foundation.field.scrollsPastWhen',
  believesWhen: 'assistant.foundation.field.believesWhen',
  mayClaim: 'assistant.foundation.field.mayClaim',
  neverClaim: 'assistant.foundation.field.neverClaim',
  bannedWords: 'assistant.foundation.field.bannedWords',
  disclaimer: 'assistant.foundation.field.disclaimer',
} as const

/** A field's name; a channel note names its network, a slug this build predates its own words. */
function fieldLabel(
  t: TFunction,
  field: string,
  resolve: (id: string) => { name: string } | undefined,
): string {
  if (field.startsWith('channelNotes.')) {
    const channel = field.slice('channelNotes.'.length)
    return t('assistant.foundation.field.channelNote', {
      channel: resolve(channel)?.name ?? channel,
    })
  }
  return field in FIELD_LABEL
    ? t(FIELD_LABEL[field as keyof typeof FIELD_LABEL])
    : humanizeStep(field)
}

function fieldValue(t: TFunction, field: string, value: string): string {
  if (field === 'isDefault')
    return value === 'true'
      ? t('assistant.foundation.voice.default')
      : t('assistant.foundation.voice.notDefault')
  if (
    field in RULE_VALUES &&
    (
      RULE_VALUES[field as keyof typeof RULE_VALUES] as readonly string[]
    ).includes(value)
  )
    return t(
      `brand.voices.rules.${field}.${value}` as 'brand.voices.rules.person.we',
    )
  return value
}

/** A voice added, changed or removed: an update says what it changed. */
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
  return (
    <ResultBlock
      status={changeWord(t, voice.change)}
      title={voice.name}
      meta={t('assistant.foundation.noun.voice')}
      action={<UndoAction t={t} undoId={voice.undoId} undo={undo} />}
    >
      {voice.change === 'updated' ? (
        voice.changes.length > 0 ? (
          <ChangeRows t={t} changes={voice.changes} />
        ) : (
          <Row title={<Muted>{t('assistant.foundation.change.none')}</Muted>} />
        )
      ) : null}
      {voice.change === 'added' && voice.whenToUse && (
        <Row title={voice.whenToUse} />
      )}
      {voice.change === 'added' && (
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

/** An audience added, changed or removed: an update says what it changed. */
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
      {audience.change === 'updated' ? (
        audience.changes.length > 0 ? (
          <ChangeRows t={t} changes={audience.changes} />
        ) : (
          <Row title={<Muted>{t('assistant.foundation.change.none')}</Muted>} />
        )
      ) : null}
      {audience.change === 'added' && (audience.who || audience.readsOn) && (
        <Row
          title={audience.who || audience.readsOn}
          sub={
            audience.who && audience.readsOn
              ? t('assistant.foundation.audience.readsOn', {
                  where: audience.readsOn,
                })
              : undefined
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

/** The guardrails' change: the lines added and taken out, the disclaimer reworded. */
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
      {guardrails.changes.length > 0 ? (
        <ChangeRows t={t} changes={guardrails.changes} />
      ) : (
        <Row title={<Muted>{t('assistant.foundation.change.none')}</Muted>} />
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

function factWord(t: TFunction, change: FactChange['change']): string {
  return change === 'renewed'
    ? t('assistant.foundation.word.renewed')
    : changeWord(t, change)
}

/** A fact added, changed, renewed for another season, or removed. */
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
      status={factWord(t, fact.change)}
      title={fact.statement}
      action={<UndoAction t={t} undoId={fact.undoId} undo={undo} />}
    >
      {fact.change !== 'removed' && (
        <Row
          title={expiryText(t, fact.expiresAt)}
          sub={fact.source || undefined}
        />
      )}
      <UndoNote t={t} undoId={fact.undoId} undo={undo} />
    </ResultBlock>
  )
}

const MADE_KINDS = ['facts', 'voices', 'audiences'] as const
const MADE_VERBS = ['removed', 'updated', 'added'] as const

/**
 * What a bulk change made, as sentences — "Removed 6 facts", "Added 1 voice"
 * — biggest first, so the headline is the change the user asked for.
 */
function madeLines(t: TFunction, made: BulkBrandEdit['made']): string[] {
  return MADE_VERBS.flatMap((verb) =>
    MADE_KINDS.map((kind) => [verb, kind, made[kind][verb]] as const),
  )
    .filter(([, , n]) => n > 0)
    .sort((a, b) => b[2] - a[2])
    .map(([verb, kind, n]) =>
      t(
        `assistant.foundation.bulk.made.${verb}.${kind}` as 'assistant.foundation.bulk.made.removed.facts',
        counted(n),
      ),
    )
}

/**
 * A bulk change: what it made, the facts it kept on purpose and why, the ones
 * it couldn't, and one UNDO that reverses each change by its own id — saying
 * how many of them came back when only some could.
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
  const undone = states.filter((s) => s === 'undone').length
  const allUndone = bulk.undoIds.length > 0 && undone === bulk.undoIds.length
  const changed = states.filter((s) => s === 'changed').length
  const gone = states.filter((s) => s === 'gone').length
  const [headline, ...more] = madeLines(t, bulk.made)
  const reasons = [...new Set(bulk.kept.map((k) => k.reason).filter(Boolean))]
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        headline ?? t('assistant.foundation.bulk.title', counted(bulk.done))
      }
      action={
        open.length > 0 && !pending ? (
          <TextAction onClick={() => open.forEach(undo.onUndo)}>
            {t('assistant.undo.undo')}
          </TextAction>
        ) : undefined
      }
    >
      {more.map((line) => (
        <Row key={line} title={line} />
      ))}
      {bulk.kept.length > 0 && (
        <Row
          title={t('assistant.foundation.bulk.kept', counted(bulk.kept.length))}
          sub={reasons.length > 0 ? reasons.join(' · ') : undefined}
        />
      )}
      {bulk.failed.map((f, i) => (
        <ResultRow key={i}>
          <p className="text-sm text-warning-ink">
            {t('assistant.foundation.bulk.failed', {
              what: f.what,
              reason: f.reason,
            })}
          </p>
        </ResultRow>
      ))}
      {bulk.stopped && <Row title={<Muted>{bulk.stopped}</Muted>} />}
      {allUndone && <ResolvedLine>{t('assistant.undo.undone')}</ResolvedLine>}
      {undone > 0 && !allUndone && (
        <p className="text-[12.5px] text-secondary-foreground">
          {t('assistant.foundation.bulk.undonePart', {
            undone: formatNumber(undone),
            total: formatNumber(bulk.undoIds.length),
          })}
        </p>
      )}
      {changed > 0 && (
        <p className="text-[12.5px] text-secondary-foreground">
          {t('assistant.foundation.bulk.undoChanged', counted(changed))}
        </p>
      )}
      {gone > 0 && (
        <p className="text-[12.5px] text-secondary-foreground">
          {t('assistant.foundation.bulk.undoGone', counted(gone))}
        </p>
      )}
    </ResultBlock>
  )
}

/** Expired facts out of all of them, each with RENEW and EDIT. */
function ExpiredFactsCard({
  t,
  facts,
  total,
  onRenew,
  onEdit,
  disabled,
}: {
  t: TFunction
  facts: ExpiredFact[]
  /** Every fact, current and expired; 0 when the read didn't say. */
  total: number
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
      meta={
        facts.length > 0 && total > 0
          ? t('assistant.foundation.facts.ofTotal', counted(total))
          : undefined
      }
    >
      {facts.map((fact) => {
        const date = shortDate(fact.expiresAt)
        return (
          <Row
            key={fact.id}
            title={fact.statement}
            sub={
              [
                date && t('assistant.foundation.facts.expiredOn', { date }),
                fact.source,
              ]
                .filter(Boolean)
                .join(' · ') || undefined
            }
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
        )
      })}
    </ResultBlock>
  )
}

/** The templates, each with its ratios, its role and whether it is the default. */
function TemplatesCard({
  t,
  templates,
}: {
  t: TFunction
  templates: BrandRead['templates']
}) {
  return (
    <ResultBlock
      status={t('assistant.foundation.templates.word')}
      title={
        templates.length === 0
          ? t('assistant.foundation.templates.none')
          : t('assistant.foundation.templates.title', counted(templates.length))
      }
    >
      {templates.map((tpl) => (
        <Row
          key={tpl.id}
          title={tpl.name}
          sub={
            [
              formatList(tpl.ratios, 'unit'),
              tpl.role,
              tpl.isDefault && t('assistant.foundation.templates.default'),
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />
      ))}
    </ResultBlock>
  )
}

/** The palette, each colour as a swatch with its role and value. */
function LookCard({
  t,
  look,
}: {
  t: TFunction
  look: NonNullable<BrandRead['look']>
}) {
  return (
    <ResultBlock
      status={t('assistant.foundation.look.word')}
      title={
        look.palette.length === 0
          ? t('assistant.foundation.look.noPalette')
          : t('assistant.foundation.look.palette')
      }
    >
      {look.palette.map((c, i) => (
        <Row
          key={`${c.hex}-${i}`}
          title={
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-3.5 shrink-0 border border-border"
                // The swatch is the brand's own colour, which no token holds.
                style={{ backgroundColor: c.hex }}
              />
              {c.role || c.hex}
            </span>
          }
          sub={<span className="font-mono">{c.hex.toUpperCase()}</span>}
        />
      ))}
      {look.typefaces.length > 0 && (
        <Row
          title={t('assistant.foundation.look.typefaces')}
          sub={formatList(look.typefaces)}
        />
      )}
    </ResultBlock>
  )
}

/** "Warm host: rules, 3 samples, 2 channel notes" — what a voice summary was read from. */
function voiceSourceText(
  t: TFunction,
  voice: BrandRead['voices'][number],
): string {
  const parts = [
    voice.rules > 0 && t('assistant.foundation.voiceRead.rules'),
    voice.samples > 0 &&
      t('assistant.foundation.voiceRead.samples', counted(voice.samples)),
    voice.channelNotes > 0 &&
      t('assistant.foundation.voiceRead.notes', counted(voice.channelNotes)),
  ].filter((p): p is string => !!p)
  return parts.length > 0
    ? t('assistant.foundation.voiceRead.line', {
        name: voice.name,
        parts: formatList(parts),
      })
    : voice.name
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

/** "3 documents", "villa-aurora.example" — what a read reads. */
function sourcesText(
  t: TFunction,
  sources: DistillState['sources'],
): string | undefined {
  if (!sources) return undefined
  const parts = [
    sources.website,
    sources.assets > 0 &&
      t('assistant.foundation.distill.documents', counted(sources.assets)),
  ].filter((p): p is string => !!p)
  return parts.length > 0 ? formatList(parts) : undefined
}

/**
 * Why a read failed: the server's sentence, else its code in the words the
 * read's own screen uses (`RunOutcome`), never the code itself.
 */
function failureText(t: TFunction, distill: DistillState): string {
  if (distill.failure) return distill.failure
  if (distill.failureCode === 'no_usable_sources') {
    const route = distill.sources?.website
      ? 'website'
      : (distill.sources?.assets ?? 0) > 0
        ? 'document'
        : 'questions'
    return t(`brand.distill.failed.nothingTitle.${route}` as const)
  }
  return t('assistant.foundation.distill.failed')
}

/**
 * A brand reading: running, ready to review, or failed — with the way to it.
 * The status is the run's own, read live: the turn's copy is a snapshot, and
 * a reloaded thread would otherwise say Reading about a read long finished.
 */
function DistillCard({ t, distill }: { t: TFunction; distill: DistillState }) {
  const live = useDistillRun(distill.runId)
  const status = live.data?.status ?? distill.status
  const failed = status === 'failed'
  const reading = status === 'pending' || status === 'running'
  const shown: DistillState = live.data?.failure
    ? {
        ...distill,
        failure: live.data.failure.reason || distill.failure,
        failureCode: live.data.failure.code,
      }
    : distill
  const line = countsLine(t, distill.counts)
  return (
    <>
      {distill.answered.length > 0 && <AnsweredCard t={t} distill={distill} />}
      <ResultBlock
        status={distillWord(t, status)}
        tone={failed ? 'warning' : reading ? 'accent' : 'neutral'}
        title={t('assistant.foundation.distill.title')}
        meta={sourcesText(t, distill.sources)}
      >
        <Row
          title={
            failed
              ? failureText(t, shown)
              : reading
                ? t('assistant.foundation.distill.running')
                : line || t('assistant.foundation.distill.ready')
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
        {!reading && !failed && distill.questions.length > 0 && (
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
    </>
  )
}

/** The questions an answering round answered, each with where its answer came from. */
function AnsweredCard({ t, distill }: { t: TFunction; distill: DistillState }) {
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={t(
        'assistant.foundation.distill.answered',
        counted(distill.answered.length),
      )}
    >
      {distill.answered.map((a) => (
        <Row
          key={a.questionId || a.question}
          title={a.question}
          sub={
            a.from
              ? t('assistant.foundation.distill.answerFrom', {
                  answer: a.answer,
                  from: a.from,
                })
              : a.answer
          }
        />
      ))}
      {distill.grounding && <SourcesLine grounding={distill.grounding} />}
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

function rhythmText(t: TFunction, rhythm: SeriesRhythm | undefined): string {
  if (!rhythm) return t('assistant.foundation.rhythm.occasional')
  return rhythm.per === 'week'
    ? t('assistant.foundation.rhythm.week', counted(rhythm.times))
    : t('assistant.foundation.rhythm.month', counted(rhythm.times))
}

/** "In Spring reopening · once a week", for each campaign that runs it. */
function whereItRuns(t: TFunction, series: SeriesBrief): string {
  if (series.runsIn.length === 0)
    return t('assistant.foundation.series.notRunning')
  return series.runsIn
    .map((r) =>
      t('assistant.foundation.series.runsIn', {
        campaign: r.campaignName || t('assistant.untitledCampaign'),
        rhythm: rhythmText(t, r.rhythm),
      }),
    )
    .join('; ')
}

/** The series library, each with where it runs. */
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
        <Row key={s.id} title={s.name} sub={whereItRuns(t, s)} />
      ))}
    </ResultBlock>
  )
}

/**
 * A series made, changed or removed — and, when it was made to run in a
 * campaign in the same step, that run, under the series' one UNDO. OPEN goes
 * to the campaign it runs in: the series' own screen is behind its flag.
 */
function SeriesCard({
  t,
  series,
  undo,
}: {
  t: TFunction
  series: SeriesChange
  undo: ResultUndo
}) {
  const { run } = series
  return (
    <ResultBlock
      status={changeWord(t, series.change)}
      title={series.name}
      meta={t('assistant.foundation.noun.series')}
      action={<UndoAction t={t} undoId={series.undoId} undo={undo} />}
    >
      {series.recipe && series.change !== 'removed' && (
        <Row
          title={t('assistant.foundation.series.recipe')}
          sub={series.recipe}
        />
      )}
      {run?.running && (
        <Row
          title={t('assistant.foundation.series.runsInCampaign', {
            campaign: run.campaignName || t('assistant.untitledCampaign'),
          })}
          sub={rhythmText(t, run.rhythm)}
          action={<CampaignLink t={t} campaignId={run.campaignId} />}
        />
      )}
      {series.notRun && (
        <ResultRow>
          <p className="text-[12.5px] text-warning-ink">
            {t('assistant.foundation.series.notRun', { reason: series.notRun })}
          </p>
        </ResultRow>
      )}
      <UndoNote t={t} undoId={series.undoId} undo={undo} />
    </ResultBlock>
  )
}

function CampaignLink({ t, campaignId }: { t: TFunction; campaignId: string }) {
  if (!campaignId) return null
  return (
    <Link
      to="/campaigns/$campaignId/strategy"
      params={{ campaignId }}
      className={OPEN_CLASS}
    >
      {t('assistant.foundation.open')}
    </Link>
  )
}

/** A series started or stopped in a campaign, named, with its rhythm. */
function RunCard({
  t,
  run,
  undo,
}: {
  t: TFunction
  run: SeriesRunChange
  undo: ResultUndo
}) {
  const names = {
    series: run.seriesName || t('assistant.foundation.noun.series'),
    campaign: run.campaignName || t('assistant.untitledCampaign'),
  }
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={
        run.running
          ? t('assistant.foundation.run.running', names)
          : t('assistant.foundation.run.stopped', names)
      }
      action={<UndoAction t={t} undoId={run.undoId} undo={undo} />}
    >
      {run.running && (
        <Row
          title={rhythmText(t, run.rhythm)}
          action={<CampaignLink t={t} campaignId={run.campaignId} />}
        />
      )}
      <UndoNote t={t} undoId={run.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * A brand check's findings in the calendar's grammar (CON-477): numbered,
 * amber for the serious ones, the post's title with the issue under it, the
 * first fix as the row's button and the rest as "or …", IGNORE on the title
 * line — each against the finding's own campaign, since one check can span
 * several. Then how many follow the brand, and what they were read against.
 */
function BrandCheckBlock({
  t,
  threadId,
  turnId,
  check,
  ignored,
  disabled,
}: {
  t: TFunction
  threadId: string
  turnId: string
  check: BrandCheck
  ignored: string[]
  disabled: boolean
}) {
  const ignore = useAssistantStore((s) => s.ignoreFinding)
  const open = check.findings.filter((f) => !ignored.includes(f.key))
  const gone = check.findings.filter((f) => ignored.includes(f.key))
  const against = [
    ...check.checkedAgainst.voices.map((v) => ({
      id: '',
      title: t('assistant.foundation.check.againstVoice', { name: v.name }),
    })),
    ...(check.checkedAgainst.guardrails
      ? [{ id: '', title: t('assistant.foundation.check.againstGuardrails') }]
      : []),
  ]
  return (
    <ResultBlock
      status={t('assistant.foundation.check.word')}
      tone={open.length > 0 ? 'warning' : 'neutral'}
      title={
        open.length === 0
          ? t('assistant.foundation.check.none')
          : t('assistant.foundation.check.title', counted(open.length))
      }
      meta={t('assistant.foundation.check.inPosts', counted(check.checked))}
    >
      {open.length > 0 && (
        <ol className="flex flex-col">
          {open.map((f, i) => (
            <FindingRow
              key={f.key || i}
              n={i + 1}
              warn={f.severity === 'high'}
              title={f.title || t('assistant.untitledPost')}
              detail={f.issue}
              onIgnore={
                f.key && f.campaignId
                  ? () => void ignore(threadId, turnId, f.campaignId, f.key)
                  : undefined
              }
              disabled={disabled}
            >
              <FixActions
                threadId={threadId}
                campaignId={f.campaignId}
                fixes={f.fixes}
                posts={1}
                disabled={disabled}
              />
            </FindingRow>
          ))}
        </ol>
      )}
      {gone.map((f) => (
        <ResolvedLine key={f.key}>
          {t('assistant.findings.ignored', {
            finding: f.title || t('assistant.untitledPost'),
          })}
        </ResolvedLine>
      ))}
      {check.clean > 0 && (
        <Row
          title={
            <Muted>
              {open.length > 0
                ? t(
                    'assistant.foundation.check.othersClean',
                    counted(check.clean),
                  )
                : t(
                    'assistant.foundation.check.allClean',
                    counted(check.clean),
                  )}
            </Muted>
          }
        />
      )}
      {check.left > 0 && (
        <Row
          title={
            <Muted>
              {t('assistant.foundation.check.left', counted(check.left))}
            </Muted>
          }
        />
      )}
      {check.dismissed > 0 && (
        <Row
          title={
            <Muted>
              {t('assistant.findings.dismissed', counted(check.dismissed))}
            </Muted>
          }
        />
      )}
      {against.length > 0 && (
        <SourcesLine
          label={t('assistant.foundation.check.against')}
          grounding={{ mode: 'grounded', sources: against }}
        />
      )}
    </ResultBlock>
  )
}
