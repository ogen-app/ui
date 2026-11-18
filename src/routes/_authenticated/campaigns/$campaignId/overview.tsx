import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { useHelpTopicMap } from '@/hooks/useHelp'
import { useHelpStore } from '@/stores/helpStore'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog.tsx'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate.ts'
import {
  CampaignOverview,
  type OverviewHandlers,
} from '@/components/campaigns/overview/CampaignOverview.tsx'
import { GridCell, PageGrid } from '@/components/page-primitives/PageGrid'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import {
  useCampaign,
  useCampaignPhases,
  useCampaignSummaries,
} from '@/hooks/useCampaigns.ts'
import {
  campaignProblemsKey,
  useCampaignProblems,
} from '@/hooks/useCampaignProblems'
import { useAddPost, useCampaignPosts } from '@/hooks/usePosts.ts'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { overviewModel, type OverviewPost } from '@/lib/campaignOverview'
import { attentionItems } from '@/lib/campaignReadiness.ts'
import { withoutServerChecked } from '@/lib/serverCheckedRules'
import { dismissCampaignFinding } from '@/services/api/campaignProblems'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId/overview',
)({
  component: CampaignOverviewScreen,
})

/**
 * The campaign's front page. Everything it shows is `overviewModel`'s answer
 * to what the queries below hold and today's date; this file only reads and
 * wires. The design harness (`design/campaign-overview`) feeds the same model
 * fixtures, which is why none of the stage logic lives here.
 */
function CampaignOverviewScreen() {
  const { campaignId } = Route.useParams()
  const { data: campaign } = useCampaign(campaignId)
  const postsQuery = useCampaignPosts(campaignId)
  const summariesQuery = useCampaignSummaries()
  const platformViews = usePlatformViews()
  const phasesQuery = useCampaignPhases(campaignId)
  // A failed re-read keeps the last answer, which may predate a change made
  // since; the client's rules stand in until the server answers again.
  const problemsQuery = useCampaignProblems(campaignId)
  const problems = problemsQuery.isError ? undefined : problemsQuery.data
  const { handlers, dialogs } = useOverviewHandlers(campaignId)

  // The layout normally hands this screen the campaign already (`useCampaign`
  // seeds itself from the sidebar's list), so this is rare.
  if (!campaign) {
    return (
      <div className="pb-10">
        <PageGrid>
          <GridCell span="full">
            <Skeleton variant="surface" className="h-28" />
          </GridCell>
          <GridCell span="wide">
            <Skeleton variant="surface" className="h-64" />
          </GridCell>
          <GridCell span="narrow">
            <Skeleton variant="surface" className="h-64" />
          </GridCell>
        </PageGrid>
      </div>
    )
  }

  // The backend sends `null` for a campaign with no posts (Go nil slice), so
  // settled is `data !== undefined`, not truthy data. Until this campaign's
  // posts land, the workspace summaries the Campaigns list fetched stand in —
  // absence from them is an answer, since the server omits empty campaigns.
  const posts: OverviewPost[] | null =
    postsQuery.data !== undefined
      ? (postsQuery.data ?? [])
      : summariesQuery.data !== undefined
        ? (summariesQuery.data[campaignId] ?? [])
        : null

  const now = new Date()
  // Once the server has said what is wrong with the calendar, its findings
  // stand for the rules that check the same thing here.
  const attention = posts
    ? withoutServerChecked(
        attentionItems(campaign, posts, platformViews, now),
        problems != null,
      )
    : []

  const model = overviewModel({
    campaign,
    posts,
    platformViews,
    phases: phasesQuery.data?.phases ?? null,
    attention,
    problems: problems
      ? { problems: problems.problems, dismissed: problems.dismissedProblems }
      : null,
    // The campaign's figures by window wait on the analytics read taking a
    // range for one campaign (CON-175); until then the left column counts
    // what was published and says nothing it can't back.
    lastWeek: null,
    total: null,
    now,
  })

  return (
    <>
      <CampaignOverview
        model={model}
        campaignId={campaignId}
        handlers={handlers}
        now={now}
      />
      {dialogs}
    </>
  )
}

/**
 * What the screen's actions do for real. The Overview runs no assistant, so
 * a fix is asked of the campaign's thread — `<fix>: <problem>`, which answers
 * with that problem's fixes as offers — and a setup step's ASK OGEN only
 * writes the ask into the composer: each one changes the campaign, so the
 * send is the user's. Adding a post and asking for a plan are gated on the
 * click (CON-232).
 */
function useOverviewHandlers(campaignId: string) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const send = useAssistantStore((s) => s.send)
  const askFor = useAssistantStore((s) => s.askFor)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  // Wrapped, not passed bare: useAddPost takes an optional Date for the
  // calendar's click-to-create, so onClick={addPost} would hand it an event.
  const addPost = useAddPost(campaignId)
  const postGate = useUpgradeGate('posts_total')
  const planGate = useUpgradeGate('plan_runs_per_month')
  const thread = threadIdFor({ kind: 'campaign', campaignId })
  const helpEnabled = useFeatureFlag('help-center')
  const { data: helpTopics } = useHelpTopicMap({ enabled: helpEnabled })
  const helpArticle = helpEnabled
    ? helpTopics?.['campaign.overview']
    : undefined
  const openHelp = useHelpStore((s) => s.open)

  const ignore = useMutation({
    mutationFn: (key: string) => dismissCampaignFinding(campaignId, key),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: campaignProblemsKey(campaignId),
      }),
    // The cache's handler toasts a failure under this title.
    meta: { errorTitle: t('campaignOverview.problems.ignoreFailed') },
  })

  const ask = (text: string) => {
    openRightPanel('assistant')
    void send(thread, text)
  }

  const handlers: OverviewHandlers = {
    ask: (fix, problem) =>
      ask(t('campaignOverview.problems.askFix', { fix, problem })),
    askAll: () => ask(t('campaignOverview.problems.askAll')),
    ignore: (key) => ignore.mutate(key),
    addPost: () => void postGate.intent(() => addPost())(),
    withOgen: (step) => {
      const fill = () => {
        openRightPanel('assistant')
        askFor(thread, t(`campaignOverview.setup.${step}.ask`))
      }
      // Only the plan generates posts, so only it is gated.
      if (step === 'posts') void planGate.intent(fill)()
      else fill()
    },
    learnMore: helpArticle ? () => openHelp(helpArticle) : undefined,
  }

  return {
    handlers,
    dialogs: (
      <>
        <UpgradeDialog gate={postGate} />
        <UpgradeDialog gate={planGate} />
      </>
    ),
  }
}
