import { useState, type ReactNode } from 'react'
import { CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { campaignProblemsKey } from '@/hooks/useCampaignProblems'
import { counted } from '@/lib/intl'
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

  // The server's problems lead — warnings first, as they arrive — and the
  // client's own rules follow. One list, so the cap below holds across both.
  const rows: { id: string; node: ReactNode }[] = [
    ...(problems?.problems ?? []).map((problem) => ({
      id: problem.key,
      node: <ProblemRow problem={problem} campaignId={campaignId} />,
    })),
    ...items.map((item) => ({
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
    })),
  ]

  // The empty state is the good news, so it reads as good news — the card is
  // titled for the verdict, not for the section.
  if (rows.length === 0) {
    return (
      <OverviewCard
        title="You're all set"
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
          Nothing is failing, overdue, or waiting on you right now. If something
          comes up, it'll show up here.
        </p>
      </OverviewCard>
    )
  }

  // Items arrive sorted by severity, so capping keeps the most urgent rows and
  // drops hygiene nudges first. Collapsing has to pay for itself: the button
  // costs a row, so hiding one item saves nothing and one over the cap just
  // renders. Past that the cap holds and the button is worth its place.
  const collapsible = rows.length > MAX_ATTENTION_ITEMS + 1
  const shown =
    expanded || !collapsible ? rows : rows.slice(0, MAX_ATTENTION_ITEMS)
  const hidden = rows.length - shown.length

  return (
    <OverviewCard
      title="Needs attention"
      icon={<WarningIcon className="size-5 text-warning" aria-hidden />}
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
              <span>SHOW {hidden} MORE</span>
            </Button>
          </li>
        )}
      </ul>
      {problems && problems.dismissed > 0 && (
        <p className="text-xs text-tertiary-foreground">
          {t('campaignOverview.problems.ignored', counted(problems.dismissed))}
        </p>
      )}
    </OverviewCard>
  )
}

/**
 * One of the calendar's problems. The Overview runs no assistant, so its fix
 * is asked of the campaign's — which answers with that problem's fixes as
 * offers to confirm — unless the fix is only a post to open. IGNORE dismisses
 * it for the Overview and the campaign's thread alike.
 */
function ProblemRow({
  problem,
  campaignId,
}: {
  problem: CalendarFinding
  campaignId: string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const send = useAssistantStore((s) => s.send)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  const ignore = useMutation({
    mutationFn: () => dismissCampaignFinding(campaignId, problem.key),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: campaignProblemsKey(campaignId),
      }),
    // The cache's handler toasts a failure under this title.
    meta: { errorTitle: t('campaignOverview.problems.ignoreFailed') },
  })

  const [first] = problem.fixes
  const onlyOpen = first?.kind === 'open_post' && first.postId
  const fix = () => {
    openRightPanel('assistant')
    void send(
      threadIdFor({ kind: 'campaign', campaignId }),
      t('campaignOverview.problems.ask', {
        problem: problem.message,
        key: problem.key,
      }),
    )
  }

  const action =
    'cursor-pointer font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground disabled:cursor-default disabled:text-quinary-foreground'
  return (
    <LineItem
      indicator={{
        kind: 'notification',
        tone: problem.severity === 'warning' ? 'warning' : 'neutral',
      }}
      label={<span title={problem.message}>{problem.message}</span>}
      chevron={false}
      trailing={
        <>
          {onlyOpen ? (
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId, postId: first.postId! }}
              className={action}
            >
              {t('campaignOverview.problems.openPost')}
            </Link>
          ) : (
            <button type="button" className={action} onClick={fix}>
              {t('campaignOverview.problems.fix')}
            </button>
          )}
          <button
            type="button"
            className={action}
            disabled={ignore.isPending}
            onClick={() => ignore.mutate()}
          >
            {t('campaignOverview.problems.ignore')}
          </button>
        </>
      }
    />
  )
}
