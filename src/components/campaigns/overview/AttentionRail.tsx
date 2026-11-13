import { useState, type ReactNode } from 'react'
import { CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { IgnoredList } from '@/components/assistant/FindingsBlock'
import { campaignProblemsKey } from '@/hooks/useCampaignProblems'
import { counted, formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import {
  dismissCampaignFinding,
  type CampaignProblems,
} from '@/services/api/campaignProblems'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { CalendarFinding } from '@/types/assistant'
import {
  MAX_ATTENTION_ITEMS,
  type AttentionItem,
  type AttentionSeverity,
} from '@/lib/campaignReadiness.ts'
import { LineItem, type LineItemTone } from '@/components/ui/line-item'
import { OverviewCard, SectionLink } from './OverviewCard.tsx'

/** Severity is carried by the dot alone — see docs/attention-rules.md. */
const TONE: Record<AttentionSeverity, LineItemTone> = {
  alert: 'alert',
  risk: 'warning',
  todo: 'warning',
  info: 'neutral',
}

/**
 * The overview's to-do list: what needs the user's attention right now,
 * already prioritized by `attentionItems`. It keeps its place when the list is
 * empty and says so — a card that vanishes reads as "not loaded yet", and the
 * all-clear is the one thing the user came to this screen to find out.
 */
export function AttentionRail({
  items,
  problems,
  campaignId,
}: {
  items: AttentionItem[]
  /** The calendar's problems, from the server, with their fixes (CON-462). */
  problems?: CampaignProblems
  campaignId: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  // What is already wrong comes first — the client's `alert` rows (failed
  // posts, a manual publish due) — then the server's problems, warnings
  // first as they arrive, then the client's other rules. One list, so the cap
  // below keeps the most urgent rows across both.
  const clientRow = (item: AttentionItem) => ({
    id: item.id,
    node: (
      <LineItem
        asChild
        indicator={{ kind: 'notification', tone: TONE[item.severity] }}
        label={item.label}
        trailing={
          <span className="group-hover:text-primary-foreground">
            {item.actionLabel}
          </span>
        }
      >
        <SectionLink target={item.fix} campaignId={campaignId} />
      </LineItem>
    ),
  })
  // The server's problems are never folded away: each carries its fix, and
  // a fix behind SHOW MORE is a fix nobody runs. Only the client's hygiene
  // rules below them are capped.
  const fixed: { id: string; node: ReactNode }[] = [
    ...items.filter((item) => item.severity === 'alert').map(clientRow),
    ...(problems?.problems ?? []).map((problem) => ({
      id: problem.key,
      node: (
        <ProblemRow problem={problem} campaignId={campaignId} onFix={ask} />
      ),
    })),
  ]
  const rest = items.filter((item) => item.severity !== 'alert').map(clientRow)
  const send = useAssistantStore((s) => s.send)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  function ask(text: string) {
    openRightPanel('assistant')
    void send(threadIdFor({ kind: 'campaign', campaignId }), text)
  }
  const ignored = problems?.dismissedProblems ?? []
  const total = fixed.length + rest.length

  // The empty state is the good news, so it reads as good news — the card is
  // titled for the verdict, not for the section.
  if (total === 0) {
    return (
      <OverviewCard
        title={t('campaignOverview.attention.allSet')}
        // The card is the only one on the screen that isn't a section, so it
        // is the only one whose mark says a verdict rather than a place — and
        // the verdict has two faces. Both are drawn as lines, like the section
        // glyphs they sit in a column with: a filled mark on a header row of
        // outlines reads as the one badge on the screen, which is more weight
        // than "nothing is wrong" should carry.
        icon={<CheckCircleIcon className="size-5 text-positive" aria-hidden />}
        className="gap-2"
      >
        <p className="text-sm text-secondary-foreground">
          {t('campaignOverview.attention.allSetBody')}
        </p>
        <IgnoredList
          campaignId={campaignId}
          items={ignored.map((p) => ({ key: p.key, title: p.message }))}
        />
      </OverviewCard>
    )
  }

  // Items arrive sorted by severity, so capping keeps the most urgent rows and
  // drops hygiene nudges first. Collapsing has to pay for itself: the button
  // costs a row, so hiding one item saves nothing and one over the cap just
  // renders. Past that the cap holds and the button is worth its place.
  const room = Math.max(0, MAX_ATTENTION_ITEMS - fixed.length)
  const collapsible = rest.length > room + 1
  const shown = [
    ...fixed,
    ...(expanded || !collapsible ? rest : rest.slice(0, room)),
  ]
  const hidden = total - shown.length

  return (
    <OverviewCard
      title={t('campaignOverview.attention.title')}
      icon={<WarningIcon className="size-5 text-warning" aria-hidden />}
      status={
        <>
          <span className="text-sm text-secondary-foreground">
            {ignored.length > 0
              ? t('campaignOverview.attention.countIgnored', {
                  total: formatNumber(total),
                  ...counted(ignored.length),
                })
              : formatNumber(total)}
          </span>
          {(problems?.problems.length ?? 0) > 0 && (
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
        {shown.map((row) => (
          <li key={row.id}>{row.node}</li>
        ))}
        {hidden > 0 && (
          // Inside the list, not under it: the button is the next row, so it
          // takes a row's band and no more — and its label lines up with the
          // labels above it across the same reserved indicator slot.
          <li>
            <Button
              variant="ghost"
              size="excluded"
              className="-mx-2 flex h-10 w-full items-center justify-start gap-3 px-2"
              onClick={() => setExpanded(true)}
            >
              <span className="w-4 shrink-0" aria-hidden />
              <span>
                {t('campaignOverview.attention.showMore', counted(hidden))}
              </span>
            </Button>
          </li>
        )}
      </ul>
      <IgnoredList
        campaignId={campaignId}
        items={ignored.map((p) => ({ key: p.key, title: p.message }))}
      />
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
          <span title={problem.message}>{problem.message}</span>
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
  'cursor-pointer border border-border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-foreground hover:border-foreground'

const OR_CLASS =
  'cursor-pointer text-[12.5px] text-secondary-foreground hover:text-foreground hover:underline'
