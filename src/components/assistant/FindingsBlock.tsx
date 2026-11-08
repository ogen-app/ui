import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type { CalendarFindings } from '@/types/assistant'

/**
 * A calendar check's findings (CON-454): repair, not just report. Numbers
 * lead; amber marks only a warning; each finding offers its first fix as the
 * row's one button and any other as words beside it. A fix is a registered
 * tool call — an offer to confirm — or a post to open.
 */
export function FindingsBlock({
  threadId,
  findings,
  disabled,
}: {
  threadId: string
  findings: CalendarFindings
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const { campaignId } = findings
  const warnings = findings.findings.filter((f) => f.severity === 'warning')

  if (findings.findings.length === 0) {
    return (
      <p className="text-sm text-secondary-foreground">
        {t('assistant.findings.none')}
      </p>
    )
  }

  type Fix = CalendarFindings['findings'][number]['fixes'][number]
  const act = (fix: Fix, primary: boolean) => {
    if (fix.proposalId) {
      const run = () => void confirm(threadId, fix.proposalId!)
      return primary ? (
        <Button variant="outline" size="sm" disabled={disabled} onClick={run}>
          {fix.title}
        </Button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={run}
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
    <section className="flex flex-col gap-1">
      <h3 className="text-base/6 font-medium text-foreground">
        {t('assistant.findings.title', { count: findings.findings.length })}
        {warnings.length > 0 && (
          <span className="ml-2 text-sm font-normal text-tertiary-foreground">
            {t('assistant.findings.warnings', { count: warnings.length })}
          </span>
        )}
      </h3>
      <ol className="mt-1 flex flex-col">
        {findings.findings.map((finding, i) => {
          const [first, ...rest] = finding.fixes
          return (
            <li
              key={finding.key || i}
              className="flex gap-3 border-t border-border py-3"
            >
              <span
                className={cn(
                  'w-5 shrink-0 font-mono text-xs leading-5',
                  finding.severity === 'warning'
                    ? 'text-warning'
                    : 'text-tertiary-foreground',
                )}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm text-foreground">{finding.message}</p>
                {first && (
                  <div className="flex flex-wrap items-center gap-3">
                    {act(first, true)}
                    {rest.map((fix, j) => (
                      <span key={j}>{act(fix, false)}</span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {findings.dismissed > 0 && (
        <p className="pt-1 text-xs text-tertiary-foreground">
          {t('assistant.findings.dismissed', { count: findings.dismissed })}
        </p>
      )}
    </section>
  )
}
