import { CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { IgnoredList } from '@/components/assistant/FindingsBlock'
import { LineItem } from '@/components/ui/line-item'
import { campaignProblemsKey } from '@/hooks/useCampaignProblems'
import type { AttentionItem } from '@/lib/campaignReadiness.ts'
import { counted, formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import {
  dismissCampaignFinding,
  type CampaignProblems,
} from '@/services/api/campaignProblems'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { CalendarFinding } from '@/types/assistant'
import { OverviewCard, SectionLink } from './OverviewCard.tsx'

/**
 * The top of the Overview's right-hand column: what is already wrong, or will
 * be on a clock — the client's `alert` and `risk` rules and every problem the
 * server found on the calendar (CON-462).
 *
 * Nothing here is folded away. The column is given over to this card and the
 * to-do list under it, so there is no screen above it to protect, and a fix
 * behind SHOW MORE is a fix nobody runs.
 *
 * It stays on screen when it has nothing to say, and says so: a card that
 * vanishes reads as "not loaded yet", and the absence of warnings is the one
 * thing someone opening this screen wants confirmed.
 */
export function WarningsCard({
  items,
  problems,
  campaignId,
}: {
  /** The client's rules, already narrowed to `alert` and `risk`. */
  items: AttentionItem[]
  /** The calendar's problems, from the server, with their fixes. */
  problems?: CampaignProblems
  campaignId: string
}) {
  const { t } = useTranslation()
  const send = useAssistantStore((s) => s.send)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  function ask(text: string) {
    openRightPanel('assistant')
    void send(threadIdFor({ kind: 'campaign', campaignId }), text)
  }

  // What is already wrong first (the client's alerts: failed posts, a manual
  // publish due), then the server's problems, then what is wrong soon.
  const alerts = items.filter((item) => item.severity === 'alert')
  const risks = items.filter((item) => item.severity !== 'alert')
  const serverProblems = problems?.problems ?? []
  const ignored = problems?.dismissedProblems ?? []
  const total = alerts.length + serverProblems.length + risks.length

  const ignoredList = (
    <IgnoredList
      campaignId={campaignId}
      items={ignored.map((p) => ({ key: p.key, title: p.message }))}
    />
  )

  if (total === 0) {
    return (
      <OverviewCard
        bare
        title={t('campaignOverview.warnings.title')}
        icon={<CheckCircleIcon className="size-5 text-positive" aria-hidden />}
        className="gap-2"
      >
        <p className="text-sm text-secondary-foreground">
          {t('campaignOverview.warnings.none')}
        </p>
        {ignoredList}
      </OverviewCard>
    )
  }

  const clientRow = (item: AttentionItem) => (
    <li key={item.id}>
      <LineItem
        asChild
        indicator={{
          kind: 'notification',
          tone: item.severity === 'alert' ? 'alert' : 'warning',
        }}
        label={<span className="whitespace-normal">{item.label}</span>}
        trailing={
          <span className="group-hover:text-primary-foreground">
            {item.actionLabel}
          </span>
        }
      >
        <SectionLink target={item.fix} campaignId={campaignId} />
      </LineItem>
    </li>
  )

  return (
    <OverviewCard
      bare
      title={t('campaignOverview.warnings.title')}
      icon={<WarningIcon className="size-5 text-warning" aria-hidden />}
      status={
        <>
          <span className="text-sm text-secondary-foreground">
            {ignored.length > 0
              ? t('campaignOverview.warnings.countIgnored', {
                  total: formatNumber(total),
                  ...counted(ignored.length),
                })
              : formatNumber(total)}
          </span>
          {serverProblems.length > 0 && (
            <button
              type="button"
              className={cn('ml-auto shrink-0', ACTION_CLASS)}
              onClick={() => ask(t('campaignOverview.problems.askAll'))}
            >
              {t('campaignOverview.problems.fixAll')}
            </button>
          )}
        </>
      }
    >
      <ul className="flex flex-col">
        {alerts.map(clientRow)}
        {serverProblems.map((problem) => (
          <li key={problem.key}>
            <ProblemRow problem={problem} campaignId={campaignId} onFix={ask} />
          </li>
        ))}
        {risks.map(clientRow)}
      </ul>
      {ignoredList}
    </OverviewCard>
  )
}

const ACTION_CLASS =
  'cursor-pointer text-xs font-semibold tracking-[0.06em] text-foreground hover:text-secondary-foreground disabled:cursor-default disabled:text-quinary-foreground'

/**
 * One of the calendar's problems (CON-478): its words, then its fix as a
 * bordered capitals button with any other as "or …", and IGNORE at the end.
 * The Overview runs no assistant, so a fix is asked of the campaign's — which
 * answers with that problem's fixes as offers to confirm — unless the fix is
 * only a post to open. A problem with no fix offers IGNORE alone. IGNORE
 * dismisses it for the Overview and the campaign's thread alike.
 */
function ProblemRow({
  problem,
  campaignId,
  onFix,
}: {
  problem: CalendarFinding
  campaignId: string
  onFix: (text: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const ignore = useMutation({
    mutationFn: () => dismissCampaignFinding(campaignId, problem.key),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: campaignProblemsKey(campaignId),
      }),
    // The cache's handler toasts a failure under this title.
    meta: { errorTitle: t('campaignOverview.problems.ignoreFailed') },
  })

  const [first, ...others] = problem.fixes
  const fix = (f: CalendarFinding['fixes'][number], primary: boolean) => {
    const label = primary
      ? f.title
      : t('campaignOverview.problems.or', { fix: f.title })
    const className = primary ? FIX_CLASS : OR_CLASS
    if (f.kind === 'open_post' && f.postId) {
      return (
        <Link
          to="/campaigns/$campaignId/posts/$postId"
          params={{ campaignId, postId: f.postId }}
          className={className}
        >
          {label}
        </Link>
      )
    }
    return (
      <button
        type="button"
        className={className}
        onClick={() =>
          onFix(
            t('campaignOverview.problems.askFix', {
              fix: f.title,
              problem: problem.message,
            }),
          )
        }
      >
        {label}
      </button>
    )
  }

  return (
    <LineItem
      indicator={{
        kind: 'notification',
        tone: problem.blocksPublishing ? 'warning' : 'neutral',
      }}
      label={
        <span className="flex min-w-0 flex-col gap-2 py-1">
          {/* Wraps: the column is narrower than the old full-width rail, and
              a problem's sentence is the whole of what it says. */}
          <span className="whitespace-normal">{problem.message}</span>
          {first && (
            <span className="flex flex-wrap items-center gap-3">
              {fix(first, true)}
              {others.map((f, i) => (
                <span key={i}>{fix(f, false)}</span>
              ))}
            </span>
          )}
        </span>
      }
      chevron={false}
      trailing={
        problem.key ? (
          <button
            type="button"
            className={ACTION_CLASS}
            disabled={ignore.isPending}
            onClick={() => ignore.mutate()}
          >
            {t('campaignOverview.problems.ignore')}
          </button>
        ) : undefined
      }
    />
  )
}

const FIX_CLASS =
  'max-w-full cursor-pointer border border-border px-2.5 py-1 text-left text-xs font-semibold uppercase tracking-[0.06em] break-words text-foreground hover:border-foreground'

const OR_CLASS =
  'cursor-pointer text-[12.5px] text-secondary-foreground hover:text-foreground hover:underline'
