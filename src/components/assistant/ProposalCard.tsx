import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import { AssetTypeBadge } from './AssetTypeBadge'
import { TrailRows } from './AnalyticsResults'
import { useLapsed } from './useLapsed'
import {
  PendingBox,
  ResolvedLine,
  ResultBlock,
  ResultRow,
  StatusWord,
  TextAction,
} from './blocks'
import type {
  AssistantProposal,
  AssistantTurn,
  ProposalDetails,
  ProposalRow,
} from '@/types/assistant'

/**
 * An offer the assistant is holding for a yes (CON-446). While it waits it is
 * the one boxed thing in the thread, and its confirm is the one dark button;
 * once answered it collapses to a grey line. A typed "yes" in the composer
 * runs the same stored offer, which is why the composer says so meanwhile.
 *
 * An offer with options is a choice: each option a row with its consequence
 * underneath. The option the server marks recommended gets the dark button
 * and the tag; without the mark they are equal, and the card never picks one
 * itself (CON-467).
 *
 * A confirm re-checks the offer first, and one whose ground moved runs
 * nothing: the card says so, with the refusal's reason when there is one,
 * and what still holds arrives below as a fresh offer.
 *
 * An offer that says what it draws on and makes (`card`, CON-476) shows it
 * between the headline and the buttons — where it lands, when, what grounds
 * it, the sources by kind, what happens after the yes — and its confirm is
 * named after the action ("DRAFT 5 POSTS"). Those words are the server's,
 * like the summary; only the layout, the dates and the marks are ours.
 */
const RESOLVED = {
  confirming: 'working',
  confirmed: 'confirmed',
  stale: 'stale',
  dismissed: 'dismissed',
  expired: 'expired',
  superseded: 'superseded',
  closed: 'closed',
} as const satisfies Record<
  Exclude<AssistantProposal['status'], 'pending'>,
  string
>

export function ProposalCard({
  threadId,
  proposal,
  disabled,
  label,
}: {
  threadId: string
  proposal: AssistantProposal
  disabled: boolean
  /** The status word over a waiting card; FRESH OFFER under a stale one. */
  label?: string
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const dismiss = useAssistantStore((s) => s.dismissProposal)
  const send = useAssistantStore((s) => s.send)
  const { summary, card } = proposal
  // An offer lapses at its expiry while the card is open (CON-482), rather
  // than keeping CONFIRM until a click finds it gone.
  const lapsed = useLapsed(
    proposal.status === 'pending' ? proposal.expiresAt : undefined,
  )

  if (proposal.status === 'stale')
    return (
      <StaleCard threadId={threadId} proposal={proposal} disabled={disabled} />
    )
  if (
    proposal.status === 'expired' ||
    (proposal.status === 'pending' && lapsed)
  )
    return (
      <ExpiredCard
        summary={summary}
        disabled={disabled}
        onAskAgain={() => void send(threadId, summary)}
      />
    )

  if (proposal.status !== 'pending') {
    const time =
      proposal.status === 'confirmed'
        ? formatDate(proposal.answeredAt, {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null
    const chosen =
      proposal.status === 'confirmed' && proposal.chosen
        ? proposal.options.find((o) => o.id === proposal.chosen)?.title
        : undefined
    return (
      <div className="flex flex-col gap-1">
        {/* Every confirm re-checks the offer before it runs (CON-467); one
            that ran found nothing changed. */}
        {proposal.status === 'confirmed' && (
          <ResolvedLine>{t('assistant.proposal.checked')}</ResolvedLine>
        )}
        <ResolvedLine ran={proposal.status === 'confirmed'}>
          {chosen
            ? t('assistant.proposal.chose', { option: chosen })
            : time
              ? t('assistant.proposal.confirmedAt', { summary, time })
              : t(`assistant.proposal.${RESOLVED[proposal.status]}`, {
                  summary,
                })}
        </ResolvedLine>
        {proposal.error && (
          <p className="text-[12.5px] text-warning-ink">{proposal.error}</p>
        )}
      </div>
    )
  }

  const choice = proposal.options.length > 0
  return (
    <PendingBox>
      <StatusWord>
        {label ??
          (choice ? t('assistant.word.choose') : t('assistant.word.proposal'))}
      </StatusWord>
      <h3 className="text-base/6 font-medium text-foreground">
        {summary}
        {card?.meta && (
          <span className="ml-2 text-sm font-normal text-secondary-foreground">
            {card.meta}
          </span>
        )}
      </h3>
      {card && !choice && (
        <Details
          t={t}
          card={card}
          disabled={disabled}
          onWiden={(text) => void send(threadId, text)}
        />
      )}

      {choice ? (
        // Each option is a button named for what it does (CON-482): the one
        // the server recommends dark, with the tag and why; the rest
        // outlined. Without the mark none is dark — the card never picks.
        <ul className="mt-2 flex flex-col">
          {proposal.options.map((option) => {
            const recommended = proposal.recommended === option.id
            const why = recommended ? option.why : undefined
            return (
              <li
                key={option.id}
                className="flex flex-col items-start gap-1.5 border-t border-border py-3"
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant={recommended ? 'defaultInverted' : 'outline'}
                    size="sm"
                    disabled={disabled}
                    className="uppercase tracking-[0.06em]"
                    onClick={() =>
                      void confirm(threadId, proposal.id, option.id)
                    }
                  >
                    {option.title}
                  </Button>
                  {recommended && (
                    <StatusWord tone="accent">
                      {t('assistant.proposal.recommended')}
                    </StatusWord>
                  )}
                </div>
                {(why || option.description) && (
                  <span className="text-[12.5px] text-secondary-foreground">
                    {why ?? option.description}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <Button
            variant="defaultInverted"
            size="sm"
            disabled={disabled}
            onClick={() => void confirm(threadId, proposal.id)}
            // The server's verb arrives in sentence case; the button's caps
            // are this card's, like CONFIRM's.
            className={card?.verb ? 'uppercase tracking-[0.06em]' : undefined}
          >
            {card?.verb || t('assistant.proposal.confirm')}
          </Button>
          <TextAction
            disabled={disabled}
            onClick={() => void dismiss(threadId, proposal.id)}
          >
            {t('assistant.proposal.dismiss')}
          </TextAction>
        </div>
      )}

      {choice && (
        <div className="pt-1">
          <TextAction
            disabled={disabled}
            onClick={() => void dismiss(threadId, proposal.id)}
          >
            {t('assistant.proposal.dismiss')}
          </TextAction>
        </div>
      )}
    </PendingBox>
  )
}

/**
 * A yes that ran nothing because what the offer was made on changed
 * (CON-482): NOTHING RAN in amber, what changed, and — when what still holds
 * was offered afresh — that offer under it, the one now to answer.
 */
function StaleCard({
  threadId,
  proposal,
  disabled,
}: {
  threadId: string
  proposal: AssistantProposal
  disabled: boolean
}) {
  const { t } = useTranslation()
  const fresh = useAssistantStore((s) =>
    findOffer(s.threads[threadId]?.turns, (p) =>
      proposal.replacedBy
        ? p.id === proposal.replacedBy
        : p.replaces === proposal.id,
    ),
  )
  return (
    <div className="flex flex-col gap-3">
      <ResolvedLine>{t('assistant.proposal.staleCard.checked')}</ResolvedLine>
      <ResultBlock
        status={t('assistant.proposal.staleCard.word')}
        tone="warning"
        title={t('assistant.proposal.staleCard.title')}
        meta={proposal.summary}
      >
        {(proposal.reasons ?? []).map((reason, i) => (
          <ResultRow key={i} className="flex items-baseline gap-2 text-sm">
            <span aria-hidden className="text-warning-ink">
              ·
            </span>
            <span className="min-w-0 text-foreground">{reason}</span>
          </ResultRow>
        ))}
        {proposal.error && (
          <ResultRow className="text-[12.5px] text-warning-ink">
            {proposal.error}
          </ResultRow>
        )}
      </ResultBlock>
      {fresh && (
        <ProposalCard
          threadId={threadId}
          proposal={fresh}
          disabled={disabled}
          label={t('assistant.proposal.staleCard.fresh')}
        />
      )}
    </div>
  )
}

/** The first offer in a thread's turns that matches. */
function findOffer(
  turns: AssistantTurn[] | undefined,
  match: (p: AssistantProposal) => boolean,
): AssistantProposal | undefined {
  for (const turn of turns ?? []) {
    const hit = turn.proposals?.find(match)
    if (hit) return hit
  }
  return undefined
}

/** An offer that lapsed before its yes (CON-482): nothing ran, ASK AGAIN. */
function ExpiredCard({
  summary,
  disabled,
  onAskAgain,
}: {
  summary: string
  disabled: boolean
  onAskAgain: () => void
}) {
  const { t } = useTranslation()
  return (
    <ResultBlock
      status={t('assistant.proposal.expiredCard.word')}
      tone="warning"
      title={t('assistant.proposal.expiredCard.title')}
      meta={summary}
    >
      <ResultRow className="flex items-baseline gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm text-foreground">
            {t('assistant.proposal.expiredCard.nothing')}
          </span>
          <span className="text-[12.5px] text-secondary-foreground">
            {t('assistant.proposal.expiredCard.hint')}
          </span>
        </span>
        <TextAction disabled={disabled} onClick={onAskAgain}>
          {t('assistant.proposal.expiredCard.askAgain')}
        </TextAction>
      </ResultRow>
    </ResultBlock>
  )
}

/** A row's day or window — "2 Mar – 26 Apr" — or the server's words for an open one. */
function rowDates(row: ProposalRow): string {
  const day = (d: string | undefined) =>
    d ? formatDate(d, { day: 'numeric', month: 'short' }) : null
  const start = day(row.start)
  const end = day(row.end)
  if (start && end) return `${start} – ${end}`
  return start ?? end ?? row.value
}

/**
 * What the offer draws on and makes: one hairline row per detail, the sources
 * by kind, the footnote, and — when the offer was made on a narrower source
 * than it could use — the way to widen it, which asks again with the
 * server's instruction rather than changing the offer in place.
 */
function Details({
  t,
  card,
  disabled,
  onWiden,
}: {
  t: TFunction
  card: ProposalDetails
  disabled: boolean
  onWiden: (instruction: string) => void
}) {
  const { widen } = card
  return (
    <div className="mt-2 flex flex-col">
      {card.rows.map((row, i) => {
        const label = rowLabel(row.kind)
        return (
          <div
            key={i}
            className="flex items-baseline gap-3 border-t border-border py-2.5"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={
                  row.kind === 'grounding'
                    ? 'text-sm text-warning-ink'
                    : 'text-sm text-foreground'
                }
              >
                {row.kind === 'dates' ? rowDates(row) : row.value}
              </span>
              {row.note && (
                <span className="text-[12.5px] text-secondary-foreground">
                  {row.note}
                </span>
              )}
            </span>
            {label && (
              <span className="shrink-0 text-[12.5px] text-secondary-foreground">
                {t(label)}
              </span>
            )}
          </div>
        )
      })}
      {/* "More like these": where each example came from (CON-479), so the
          yes is given knowing what the new ideas will be modelled on. */}
      {card.trail && card.trail.length > 0 && <TrailRows trail={card.trail} />}
      {card.sources.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-border py-2.5">
          {card.sources.map((source) => (
            <li key={source.id} className="flex items-center gap-2.5 text-sm">
              <AssetTypeBadge type={source.type} size={18} />
              <Link
                to="/assets/$assetId"
                params={{ assetId: source.id }}
                className="min-w-0 truncate text-foreground hover:underline"
              >
                {source.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {card.footnote && (
        <p className="border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
          {card.footnote}
        </p>
      )}
      {widen && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
          {widen.note && <span>{widen.note}</span>}
          <span>
            <TextAction
              disabled={disabled}
              onClick={() => onWiden(widen.instruction)}
            >
              <span className="uppercase">{widen.label}</span>
            </TextAction>
          </span>
        </div>
      )}
    </div>
  )
}

/** What each kind of row is, beside it; a kind this build doesn't know goes unlabelled. */
const ROW_LABEL = {
  destination: 'assistant.proposal.row.destination',
  type: 'assistant.proposal.row.type',
  dates: 'assistant.proposal.row.dates',
  tags: 'assistant.proposal.row.tags',
} as const

function rowLabel(kind: string) {
  return kind in ROW_LABEL ? ROW_LABEL[kind as keyof typeof ROW_LABEL] : null
}
