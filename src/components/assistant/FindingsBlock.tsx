import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/styles'
import { counted, formatDate, formatList } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  CalendarFindings,
  RepairFix,
} from '@/types/assistant'
import { ProposalCard } from './ProposalCard'
import { ResolvedLine, TextAction } from './blocks'
import { useIsIgnored } from './useIsIgnored'

/**
 * A calendar check's findings (CON-454/462, drawn as CON-478 has them):
 * repair, not just report. Numbers lead; amber marks a finding whose posts
 * will be refused when they publish; each finding says what it costs under
 * its title, offers its first fix as the row's one button and any other as
 * words beside it, and IGNORE on its title line. A fix is a registered tool
 * call — an offer to confirm — or a post to open; one whose offer carries its
 * own card or a choice opens that offer under the row.
 *
 * What is ignored is the campaign's list, read from the server, so an ignore
 * reaches every turn and survives a reload; what was fixed is the offer's own
 * status, which a reloaded thread settles from its history.
 */
export function FindingsBlock({
  threadId,
  turnId,
  findings,
  ignored = [],
  proposals = [],
  disabled,
}: {
  threadId: string
  turnId: string
  findings: CalendarFindings
  /** Keys ignored from this card since, before the campaign's list is read. */
  ignored?: string[]
  /** The turn's offers: what a fix's offer became. */
  proposals?: AssistantProposal[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const ignore = useAssistantStore((s) => s.ignoreFinding)
  const send = useAssistantStore((s) => s.send)
  const { campaignId } = findings
  const isIgnored = useIsIgnored(
    campaignId,
    ignored,
    findings.dismissedFindings.map((f) => f.key),
  )
  const all = [...findings.findings, ...findings.dismissedFindings]
  const open = all.filter((f) => !isIgnored(f.key))
  const goneHere = findings.findings.filter((f) => isIgnored(f.key))
  const allIgnored = all.filter((f) => isIgnored(f.key))
  const blocking = open.filter((f) => f.blocksPublishing).length

  if (all.length === 0) {
    return (
      <section className="flex flex-col gap-1">
        <p className="text-sm text-secondary-foreground">
          {t('assistant.findings.none')}
        </p>
        <CheckedFooter
          checkedAt={findings.checkedAt}
          disabled={disabled}
          onCheck={() =>
            void send(threadId, t('assistant.findings.checkPrompt'))
          }
        />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-1">
      {open.length > 0 && (
        <h3 className="text-base/6 font-medium text-foreground">
          {t('assistant.findings.title', counted(open.length))}
          {blocking > 0 && (
            <span className="ml-2 text-sm font-normal text-secondary-foreground">
              {t('assistant.findings.blocking', counted(blocking))}
            </span>
          )}
        </h3>
      )}
      <ol className="mt-1 flex flex-col">
        {open.map((finding, i) => (
          <FindingRow
            key={finding.key || i}
            n={i + 1}
            warn={finding.blocksPublishing}
            title={finding.message}
            detail={findingDetail(finding)}
            onIgnore={
              finding.key && campaignId
                ? () => void ignore(threadId, turnId, campaignId, finding.key)
                : undefined
            }
            disabled={disabled}
          >
            <FixActions
              threadId={threadId}
              campaignId={campaignId}
              fixes={finding.fixes}
              proposals={proposals}
              disabled={disabled}
            />
          </FindingRow>
        ))}
      </ol>
      {goneHere.map((f) => (
        <ResolvedLine key={f.key}>
          {t('assistant.findings.ignored', { finding: f.message })}
        </ResolvedLine>
      ))}
      <IgnoredList
        campaignId={campaignId}
        items={allIgnored.map((f) => ({ key: f.key, title: f.message }))}
      />
      <CheckedFooter
        checkedAt={findings.checkedAt}
        disabled={disabled}
        onCheck={() => void send(threadId, t('assistant.findings.checkPrompt'))}
      />
    </section>
  )
}

/**
 * What a finding says under its title: the server's detail, and the posts it
 * names when there are several of them — the titles, so "3 posts from one
 * idea" says which.
 */
function findingDetail(finding: CalendarFindings['findings'][number]) {
  const titles =
    finding.posts.length > 1
      ? formatList(finding.posts.map((p) => p.title).filter(Boolean))
      : ''
  if (!finding.detail && !titles) return undefined
  return (
    <>
      {finding.detail}
      {finding.detail && titles && <br />}
      {titles}
    </>
  )
}

/**
 * The campaign's ignored findings, behind SHOW, each with RESTORE — the way
 * back from an IGNORE, which the next check then raises again.
 */
export function IgnoredList({
  campaignId,
  items,
}: {
  campaignId: string
  items: { key: string; title: string }[]
}) {
  const { t } = useTranslation()
  const restore = useAssistantStore((s) => s.restoreFinding)
  const [shown, setShown] = useState(false)
  if (items.length === 0 || !campaignId) return null
  return (
    <div className="flex flex-col gap-1 pt-1">
      <p className="flex items-baseline gap-2 text-xs text-secondary-foreground">
        {t('assistant.findings.ignoredCount', counted(items.length))}
        <TextAction onClick={() => setShown((s) => !s)}>
          {shown ? t('assistant.findings.hide') : t('assistant.findings.show')}
        </TextAction>
      </p>
      {shown &&
        items.map((item) => (
          <div
            key={item.key}
            className="flex items-baseline gap-3 border-t border-border py-2"
          >
            <span className="min-w-0 flex-1 text-[12.5px] text-secondary-foreground">
              {item.title}
            </span>
            <TextAction onClick={() => void restore(campaignId, item.key)}>
              {t('assistant.findings.restore')}
            </TextAction>
          </div>
        ))}
    </div>
  )
}

/** When the check read the calendar, and the way to read it again. */
export function CheckedFooter({
  checkedAt,
  onCheck,
  disabled,
}: {
  checkedAt?: string
  onCheck: () => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const when = formatDate(checkedAt, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
  if (!when) return null
  return (
    <div className="flex flex-col items-start gap-2 border-t border-border pt-2.5">
      <p className="text-[12.5px] text-secondary-foreground">
        {t('assistant.findings.readAt', { when })}
      </p>
      <Button
        variant="outline"
        size="sm"
        className={FIX_BUTTON_CLASS}
        disabled={disabled}
        onClick={onCheck}
      >
        {t('assistant.findings.checkAgain')}
      </Button>
    </div>
  )
}

/**
 * One numbered finding: its words, IGNORE on the title line, then whatever
 * the caller puts under it — the fixes. Shared with the review's card.
 */
export function FindingRow({
  n,
  warn,
  title,
  detail,
  onIgnore,
  disabled,
  children,
}: {
  n: number
  warn: boolean
  title: React.ReactNode
  detail?: React.ReactNode
  onIgnore?: () => void
  disabled: boolean
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <li className="flex gap-3 border-t border-border py-3">
      <span
        className={cn(
          'w-5 shrink-0 font-mono text-xs leading-5',
          warn ? 'text-warning-ink' : 'text-secondary-foreground',
        )}
      >
        {String(n).padStart(2, '0')}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-3">
          <p className="min-w-0 flex-1 text-sm text-foreground">{title}</p>
          {onIgnore && (
            <TextAction onClick={onIgnore} disabled={disabled}>
              {t('assistant.findings.ignore')}
            </TextAction>
          )}
        </div>
        {detail && (
          <p className="-mt-1 text-[12.5px] text-secondary-foreground">
            {detail}
          </p>
        )}
        {children}
      </div>
    </li>
  )
}

/**
 * The one look every primary fix has, an offer or a post to open alike: a
 * bordered button in letter-spaced capitals, whatever case the server wrote.
 */
const FIX_BUTTON_CLASS =
  'rounded-none text-xs font-semibold uppercase tracking-[0.06em]'

const OR_CLASS =
  'cursor-pointer text-[12.5px] text-secondary-foreground underline-offset-2 hover:text-foreground hover:underline disabled:cursor-default'

/**
 * A finding's fixes: the first as the row's one button, the rest as words
 * beside it. A fix whose offer has its own card or a choice — a delete naming
 * its posts, a type put back, a move's free slots — opens that offer under
 * the row instead of running on the click, so nothing destructive is one
 * press. Once an offer is confirmed the row says it was fixed and offers
 * nothing more; one dismissed or expired drops out of the row.
 */
export function FixActions({
  threadId,
  campaignId,
  fixes,
  proposals = [],
  disabled,
}: {
  threadId: string
  campaignId: string
  fixes: RepairFix[]
  proposals?: AssistantProposal[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const [opened, setOpened] = useState<string | null>(null)
  const offerOf = (fix: RepairFix) =>
    fix.proposalId ? proposals.find((p) => p.id === fix.proposalId) : undefined

  const done = fixes
    .map((fix) => ({ fix, offer: offerOf(fix) }))
    .find(({ offer }) => offer?.status === 'confirmed')
  if (done) {
    const chosen = done.offer?.options.find((o) => o.id === done.offer?.chosen)
    return (
      <ResolvedLine>
        {chosen
          ? t('assistant.findings.fixedChose', {
              fix: done.fix.title,
              choice: chosen.title,
            })
          : t('assistant.findings.fixed', { fix: done.fix.title })}
      </ResolvedLine>
    )
  }
  const working = fixes.some((fix) => offerOf(fix)?.status === 'confirming')
  if (working) {
    return <ResolvedLine>{t('assistant.findings.fixing')}</ResolvedLine>
  }

  // An offer answered otherwise — dismissed, expired, gone — can't run.
  const live = fixes.filter((fix) => {
    const status = offerOf(fix)?.status
    return !status || status === 'pending'
  })
  const [first, ...rest] = live
  if (!first) return null

  const openedFix = live.find((fix) => fix.proposalId === opened)
  if (openedFix?.proposalId) {
    const offer: AssistantProposal = offerOf(openedFix) ?? {
      id: openedFix.proposalId,
      tool: openedFix.kind,
      summary: openedFix.title,
      options: openedFix.options ?? [],
      recommended: openedFix.options?.find((o) => o.recommended)?.id,
      card: openedFix.card,
      status: 'pending',
    }
    return (
      <div className="flex flex-col gap-2">
        <ProposalCard
          threadId={threadId}
          proposal={offer}
          disabled={disabled}
        />
        <TextAction onClick={() => setOpened(null)}>
          {t('assistant.findings.back')}
        </TextAction>
      </div>
    )
  }

  const run = (fix: RepairFix) => {
    if (!fix.proposalId) return
    // The card or choices can come on the fix or on its offer: either way
    // the offer opens rather than running unseen.
    const offer = offerOf(fix)
    const choices =
      (offer?.options.length ?? 0) > 0 || (fix.options?.length ?? 0) > 0
    if (offer?.card || fix.card || choices) {
      setOpened(fix.proposalId)
      return
    }
    void confirm(threadId, fix.proposalId)
  }

  const act = (fix: RepairFix, primary: boolean) => {
    if (fix.proposalId) {
      return primary ? (
        <Button
          variant="outline"
          size="sm"
          className={FIX_BUTTON_CLASS}
          disabled={disabled}
          onClick={() => run(fix)}
        >
          {fix.title}
        </Button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => run(fix)}
          className={OR_CLASS}
        >
          {t('assistant.findings.or', { fix: fix.title })}
        </button>
      )
    }
    if (fix.postId && campaignId) {
      return primary ? (
        <Button
          asChild
          variant="outline"
          size="sm"
          className={FIX_BUTTON_CLASS}
        >
          <Link
            to="/campaigns/$campaignId/posts/$postId"
            params={{ campaignId, postId: fix.postId }}
          >
            {fix.title}
          </Link>
        </Button>
      ) : (
        <Link
          to="/campaigns/$campaignId/posts/$postId"
          params={{ campaignId, postId: fix.postId }}
          className={OR_CLASS}
        >
          {t('assistant.findings.or', { fix: fix.title })}
        </Link>
      )
    }
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {act(first, true)}
      {rest.map((fix, j) => (
        <span key={j}>{act(fix, false)}</span>
      ))}
    </div>
  )
}
