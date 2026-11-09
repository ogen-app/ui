import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type { CalendarFindings, RepairFix } from '@/types/assistant'
import { counted } from '@/lib/intl'
import { ResolvedLine, TextAction } from './blocks'

/**
 * A calendar check's findings (CON-454/462): repair, not just report. Numbers
 * lead; amber marks only a warning; each finding offers its first fix as the
 * row's one button and any other as words beside it, and IGNORE on its title
 * line. A fix is a registered tool call — an offer to confirm — or a post to
 * open.
 */
export function FindingsBlock({
  threadId,
  turnId,
  findings,
  ignored = [],
  disabled,
}: {
  threadId: string
  turnId: string
  findings: CalendarFindings
  /** Keys ignored from this card since. */
  ignored?: string[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const ignore = useAssistantStore((s) => s.ignoreFinding)
  const { campaignId } = findings
  const open = findings.findings.filter((f) => !ignored.includes(f.key))
  const gone = findings.findings.filter((f) => ignored.includes(f.key))
  const warnings = open.filter((f) => f.severity === 'warning')

  if (findings.findings.length === 0) {
    return (
      <p className="text-sm text-secondary-foreground">
        {t('assistant.findings.none')}
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-1">
      {open.length > 0 && (
        <h3 className="text-base/6 font-medium text-foreground">
          {t('assistant.findings.title', counted(open.length))}
          {warnings.length > 0 && (
            <span className="ml-2 text-sm font-normal text-tertiary-foreground">
              {t('assistant.findings.warnings', counted(warnings.length))}
            </span>
          )}
        </h3>
      )}
      <ol className="mt-1 flex flex-col">
        {open.map((finding, i) => (
          <FindingRow
            key={finding.key || i}
            n={i + 1}
            warn={finding.severity === 'warning'}
            title={finding.message}
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
              posts={finding.postIds.length}
              disabled={disabled}
            />
          </FindingRow>
        ))}
      </ol>
      {gone.map((f) => (
        <ResolvedLine key={f.key}>
          {t('assistant.findings.ignored', { finding: f.message })}
        </ResolvedLine>
      ))}
      {findings.dismissed > 0 && (
        <p className="pt-1 text-xs text-tertiary-foreground">
          {t('assistant.findings.dismissed', counted(findings.dismissed))}
        </p>
      )}
    </section>
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
          warn ? 'text-warning' : 'text-tertiary-foreground',
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
          <p className="-mt-1 text-[12.5px] text-tertiary-foreground">
            {detail}
          </p>
        )}
        {children}
      </div>
    </li>
  )
}

/**
 * A finding's fixes: the first as the row's one button, the rest as words
 * beside it. Deleting is never one click — it asks first, naming how many and
 * that nothing brings them back, because the offer runs as soon as it is
 * confirmed.
 */
export function FixActions({
  threadId,
  campaignId,
  fixes,
  posts,
  disabled,
}: {
  threadId: string
  campaignId: string
  fixes: RepairFix[]
  /** The finding's posts — what a delete names when its fix doesn't. */
  posts: number
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const [asking, setAsking] = useState<RepairFix | null>(null)
  const [first, ...rest] = fixes
  if (!first) return null

  const run = (fix: RepairFix) => {
    if (!fix.proposalId) return
    if (fix.kind === 'delete' && asking !== fix) {
      setAsking(fix)
      return
    }
    setAsking(null)
    void confirm(threadId, fix.proposalId)
  }

  if (asking?.proposalId) {
    const n = asking.postIds?.length || posts || 1
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[12.5px] text-warning">
          {t('assistant.findings.deleteAsk', counted(n))}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="destructive"
            size="sm"
            disabled={disabled}
            onClick={() => run(asking)}
          >
            {t('assistant.findings.deleteConfirm', counted(n))}
          </Button>
          <TextAction onClick={() => setAsking(null)}>
            {t('assistant.findings.keep')}
          </TextAction>
        </div>
      </div>
    )
  }

  const act = (fix: RepairFix, primary: boolean) => {
    if (fix.proposalId) {
      return primary ? (
        <Button
          variant="outline"
          size="sm"
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
          className="cursor-pointer text-[12.5px] text-secondary-foreground underline-offset-2 hover:text-foreground hover:underline disabled:cursor-default"
        >
          {t('assistant.findings.or', { fix: fix.title })}
        </button>
      )
    }
    if (fix.postId && campaignId) {
      return (
        <Link
          to="/campaigns/$campaignId/posts/$postId"
          params={{ campaignId, postId: fix.postId }}
          className={cn(
            primary
              ? 'border border-border px-2.5 py-1 text-xs font-medium hover:border-foreground'
              : 'text-[12.5px] text-secondary-foreground hover:text-foreground hover:underline',
          )}
        >
          {primary ? fix.title : t('assistant.findings.or', { fix: fix.title })}
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
