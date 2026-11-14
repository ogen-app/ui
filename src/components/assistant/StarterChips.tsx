import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  ArrowsClockwiseIcon,
  ArrowCounterClockwiseIcon,
  FunnelIcon,
  GitDiffIcon,
  IntersectIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  StackIcon,
  TagIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  LightbulbIcon,
  ListChecksIcon,
  MagicWandIcon,
  MegaphoneIcon,
  NotePencilIcon,
  PaperclipIcon,
  PlugsConnectedIcon,
  ScissorsIcon,
  SealCheckIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  TextAaIcon,
  QuestionIcon,
  EnvelopeSimpleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { subjectCampaignId, type ThreadSubject } from '@/types/assistant'
import type { ViewScreen } from '@/lib/viewContext'
import { counted } from '@/lib/intl'
import { useAssetsState } from '@/hooks/useContent'
import type { AssetsState } from '@/services/api/content'
import { useAssistantStore } from '@/stores/assistantStore'
import { useViewContextStore } from '@/stores/viewContextStore'
import { cn } from '@/lib/styles'
import { StatusWord } from './blocks'

/**
 * `key` names the starter's label and draft under `assistant.starter`.
 * `count` is the figure a label from the bank's state carries ("Retry 3
 * failed"), and picks its plural form.
 */
type Starter = { icon: Icon; key: StarterKey; count?: number }

type StarterKey =
  | 'contentPlan'
  | 'addPosts'
  | 'improveBrief'
  | 'reviewBrief'
  | 'moveEnd'
  | 'redistribute'
  | 'overview'
  | 'checkPosts'
  | 'tightenOpening'
  | 'changeTone'
  | 'shorter'
  | 'useAsset'
  | 'callToAction'
  | 'missing'
  | 'yesterday'
  | 'lastWeek'
  | 'weeklyReport'
  | 'failing'
  | 'waitingIdeas'
  | 'whatWorked'
  | 'connections'
  | 'findIdeas'
  | 'mergeDuplicates'
  | 'setAsideWeak'
  | 'distillMore'
  | 'draftSelected'
  | 'compileSelected'
  | 'whatShare'
  | 'findSimilar'
  | 'findDocuments'
  | 'analyseWaiting'
  | 'retryFailed'
  | 'triageIdeas'
  | 'smartGroups'
  | 'compareSelected'
  | 'campaignFromSelected'
  | 'whatAnalysisFound'
  | 'readBrand'
  | 'summariseVoice'
  | 'whichVoice'
  | 'checkAgainstVoice'
  | 'expiredFacts'
  | 'ourSeries'
  | 'makeSeries'
  | 'storyTemplates'
  | 'ourPalette'
  | 'checkBrandSelected'
  | 'summariseSelected'
  | 'planFromSelected'
  | 'tagSelected'
  | 'summariseIt'
  | 'askTheAsset'
  | 'ideasFromThis'
  | 'tagIt'
  | 'lessFormal'
  | 'readBrandAgain'
  | 'checkAgainstThese'
  | 'addBannedWord'
  | 'renewFact'
  | 'addFact'
  | 'runInCampaign'
  | 'whichTemplate'
  | 'readBrandFromThese'
  | 'whyTopPost'
  | 'compareMonth'
  | 'moreLikeThese'
  | 'whySelected'
  | 'checkWeek'
  | 'optimise'
  | 'stanceOn'
  | 'factsStale'
  | 'checkGuardrails'
  | 'thisWeek'
  | 'autoPublish'

/**
 * The assistant's capabilities, one starter per shipped tool. They are
 * otherwise undiscoverable from an empty composer, so the empty thread lists
 * them; a starter only *prefills* the box, never sends, because most of these
 * write to the campaign or the post.
 *
 * Deliberately one flat run rather than grouped: eight labels don't need
 * headings, and the groups only made the menu look like a settings screen.
 */
const CAMPAIGN_STARTERS: Starter[] = [
  { icon: SparkleIcon, key: 'contentPlan' },
  { icon: NotePencilIcon, key: 'addPosts' },
  { icon: MagicWandIcon, key: 'improveBrief' },
  { icon: SealCheckIcon, key: 'reviewBrief' },
  { icon: CalendarBlankIcon, key: 'moveEnd' },
  { icon: ArrowsClockwiseIcon, key: 'redistribute' },
  { icon: ChartBarIcon, key: 'overview' },
  { icon: ListChecksIcon, key: 'checkPosts' },
]

const POST_STARTERS: Starter[] = [
  { icon: ScissorsIcon, key: 'tightenOpening' },
  { icon: SlidersHorizontalIcon, key: 'changeTone' },
  { icon: TextAaIcon, key: 'shorter' },
  { icon: PaperclipIcon, key: 'useAsset' },
  { icon: MegaphoneIcon, key: 'callToAction' },
  { icon: QuestionIcon, key: 'missing' },
]

const WORKSPACE_STARTERS: Starter[] = [
  { icon: CalendarBlankIcon, key: 'yesterday' },
  { icon: LightbulbIcon, key: 'waitingIdeas' },
  { icon: ChartBarIcon, key: 'whatWorked' },
  { icon: PlugsConnectedIcon, key: 'connections' },
]

/**
 * What each screen can be asked (CON-451, CON-452–457): its verbs, and — where
 * the screen has a selection — the verbs for what is ticked. A screen with no
 * set here falls back to its thread's.
 */
type ScreenStarters = { none: Starter[]; selected?: Starter[] }

const IDEAS: ScreenStarters = {
  none: [
    { icon: MagnifyingGlassIcon, key: 'findIdeas' },
    { icon: IntersectIcon, key: 'mergeDuplicates' },
    { icon: ArchiveIcon, key: 'setAsideWeak' },
    { icon: SparkleIcon, key: 'distillMore' },
  ],
  selected: [
    { icon: NotePencilIcon, key: 'draftSelected' },
    { icon: StackIcon, key: 'compileSelected' },
    { icon: IntersectIcon, key: 'whatShare' },
    { icon: MagnifyingGlassIcon, key: 'findSimilar' },
  ],
}

/** After what the bank has waiting (`stateStarters`), which leads. */
const ASSETS: ScreenStarters = {
  none: [
    { icon: FunnelIcon, key: 'smartGroups' },
    { icon: MagnifyingGlassIcon, key: 'findDocuments' },
  ],
  selected: [
    { icon: GitDiffIcon, key: 'compareSelected' },
    { icon: ListBulletsIcon, key: 'summariseSelected' },
    { icon: MegaphoneIcon, key: 'campaignFromSelected' },
    { icon: SparkleIcon, key: 'readBrandFromThese' },
    { icon: CalendarBlankIcon, key: 'planFromSelected' },
    { icon: TagIcon, key: 'tagSelected' },
  ],
}

const ASSET: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'summariseIt' },
    { icon: MagnifyingGlassIcon, key: 'askTheAsset' },
    { icon: SparkleIcon, key: 'whatAnalysisFound' },
    { icon: LightbulbIcon, key: 'ideasFromThis' },
    { icon: TagIcon, key: 'tagIt' },
  ],
}

/**
 * What the bank has waiting (CON-460), first on the Assets list: each only
 * when its count is above zero, so "Retry 3 failed" never offers nothing.
 */
function stateStarters(state: AssetsState | undefined): Starter[] {
  if (!state) return []
  const undecided = state.undecided.reduce((sum, lens) => sum + lens.ideas, 0)
  const starters: Starter[] = []
  if (state.waiting > 0)
    starters.push({
      icon: ArrowClockwiseIcon,
      key: 'analyseWaiting',
      count: state.waiting,
    })
  if (state.analysisFailed > 0)
    starters.push({
      icon: ArrowCounterClockwiseIcon,
      key: 'retryFailed',
      count: state.analysisFailed,
    })
  if (undecided > 0)
    starters.push({ icon: LightbulbIcon, key: 'triageIdeas', count: undecided })
  return starters
}

const ANALYTICS: ScreenStarters = {
  none: [
    { icon: ChartBarIcon, key: 'whatWorked' },
    { icon: QuestionIcon, key: 'whyTopPost' },
    { icon: ArrowsClockwiseIcon, key: 'compareMonth' },
  ],
  selected: [
    { icon: SparkleIcon, key: 'moreLikeThese' },
    { icon: QuestionIcon, key: 'whySelected' },
  ],
}

const CALENDAR: ScreenStarters = {
  none: [
    { icon: ListChecksIcon, key: 'checkWeek' },
    { icon: ArrowsClockwiseIcon, key: 'optimise' },
  ],
}

const FOUNDATION: ScreenStarters = {
  none: [
    { icon: QuestionIcon, key: 'stanceOn' },
    { icon: CalendarBlankIcon, key: 'factsStale' },
    { icon: SealCheckIcon, key: 'checkGuardrails' },
    { icon: SparkleIcon, key: 'readBrand' },
  ],
}

/** Each Foundation section's own verbs (CON-461). */
/** One voice open: verbs about that voice. */
const FOUNDATION_VOICE: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'summariseVoice' },
    { icon: NotePencilIcon, key: 'lessFormal' },
    { icon: SealCheckIcon, key: 'checkAgainstVoice' },
    { icon: SparkleIcon, key: 'readBrandAgain' },
  ],
}

/** The guardrails: hold posts to them, add to them, and the facts beside them. */
const FOUNDATION_GUARDRAILS: ScreenStarters = {
  none: [
    { icon: SealCheckIcon, key: 'checkAgainstThese' },
    { icon: NotePencilIcon, key: 'addBannedWord' },
    { icon: ListBulletsIcon, key: 'expiredFacts' },
  ],
}

/** The voices list: no voice is open, so the verbs are about all of them. */
const FOUNDATION_VOICES: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'whichVoice' },
    { icon: SealCheckIcon, key: 'checkGuardrails' },
    { icon: QuestionIcon, key: 'stanceOn' },
  ],
}

const FOUNDATION_FACTS: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'expiredFacts' },
    { icon: ArrowClockwiseIcon, key: 'renewFact' },
    { icon: NotePencilIcon, key: 'addFact' },
  ],
}

const FOUNDATION_SERIES: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'ourSeries' },
    { icon: NotePencilIcon, key: 'makeSeries' },
    { icon: MegaphoneIcon, key: 'runInCampaign' },
  ],
}

const FOUNDATION_TEMPLATES: ScreenStarters = {
  none: [
    { icon: StackIcon, key: 'storyTemplates' },
    { icon: SparkleIcon, key: 'ourPalette' },
    { icon: MagnifyingGlassIcon, key: 'whichTemplate' },
  ],
}

/** The look: its own verbs, not the templates' ("Templates for stories"). */
const FOUNDATION_LOOK: ScreenStarters = {
  none: [
    { icon: SparkleIcon, key: 'ourPalette' },
    { icon: MagnifyingGlassIcon, key: 'whichTemplate' },
  ],
}

/** A campaign's posts list: its own verbs, and the brand check for a selection. */
const CAMPAIGN_LIST: ScreenStarters = {
  none: CAMPAIGN_STARTERS,
  selected: [{ icon: SealCheckIcon, key: 'checkBrandSelected' }],
}

// The CON-464 boards' three (CON-480): the week, the report, the misses.
const ACTIVITY: ScreenStarters = {
  none: [
    { icon: CalendarBlankIcon, key: 'lastWeek' },
    { icon: EnvelopeSimpleIcon, key: 'weeklyReport' },
    { icon: WarningCircleIcon, key: 'failing' },
  ],
}

const SETTINGS: ScreenStarters = {
  none: [
    { icon: QuestionIcon, key: 'autoPublish' },
    { icon: PlugsConnectedIcon, key: 'connections' },
  ],
}

function screenStarters(screen: ViewScreen | null): ScreenStarters | null {
  if (!screen) return null
  if (screen === 'ideas' || screen === 'campaign.ideas') return IDEAS
  if (screen === 'assets' || screen === 'campaign.assets') return ASSETS
  if (screen === 'asset' || screen === 'campaign.asset') return ASSET
  if (screen === 'analytics' || screen === 'campaign.analytics')
    return ANALYTICS
  if (screen === 'calendar' || screen === 'campaign.calendar') return CALENDAR
  if (screen === 'foundation.voice') return FOUNDATION_VOICE
  if (screen === 'foundation.voices') return FOUNDATION_VOICES
  if (screen === 'foundation.facts') return FOUNDATION_FACTS
  if (screen === 'foundation.guardrails') return FOUNDATION_GUARDRAILS
  if (screen === 'foundation.series' || screen === 'foundation.series_item')
    return FOUNDATION_SERIES
  if (screen === 'foundation.templates') return FOUNDATION_TEMPLATES
  if (screen === 'foundation.look') return FOUNDATION_LOOK
  if (screen.startsWith('foundation')) return FOUNDATION
  if (screen === 'campaign.list') return CAMPAIGN_LIST
  if (screen === 'activity' || screen === 'campaign.activity') return ACTIVITY
  if (
    screen === 'settings' ||
    screen === 'profile' ||
    screen === 'campaign.settings'
  )
    return SETTINGS
  return null
}

const STARTERS: Record<ThreadSubject['kind'], Starter[]> = {
  campaign: CAMPAIGN_STARTERS,
  post: POST_STARTERS,
  workspace: WORKSPACE_STARTERS,
}

/**
 * In an empty thread the chips are the body's, centred under its lines; in a
 * thread already going they sit over the composer under ON THIS SCREEN, since
 * there they follow the screen rather than introduce the assistant.
 */
export function StarterChips({
  kind,
  onPick,
  disabled = false,
  placement = 'body',
}: {
  kind: ThreadSubject['kind']
  onPick: (text: string) => void
  disabled?: boolean
  placement?: 'body' | 'footer'
}) {
  const { t } = useTranslation()
  const screen = useViewContextStore((s) => s.location.screen)
  const selection = useViewContextStore((s) => s.page?.selection)
  const hasSelection =
    !!selection && ('allMatching' in selection || selection.ids.length > 0)
  const forScreen = screenStarters(screen)
  // The bank's state, on the Assets list only: a campaign's sources inside
  // one, the workspace's otherwise — the scope the assistant reads.
  const onAssets = screen === 'assets' || screen === 'campaign.assets'
  const subject = useAssistantStore((s) =>
    s.activeThreadId ? s.threads[s.activeThreadId]?.subject : undefined,
  )
  const campaignId =
    screen === 'campaign.assets' && subject
      ? (subjectCampaignId(subject) ?? null)
      : null
  const state = useAssetsState(campaignId, onAssets && !hasSelection)
  const starters =
    (hasSelection && forScreen?.selected) ||
    (forScreen?.none &&
      (onAssets
        ? [...stateStarters(state.data), ...forScreen.none]
        : forScreen.none)) ||
    STARTERS[kind]
  const chips = (
    <div
      className={cn(
        'flex flex-wrap gap-1.5',
        placement === 'body' && 'justify-center',
      )}
    >
      {starters.map(({ icon: Icon, key, count }) => {
        const label =
          count === undefined
            ? t(
                `assistant.starter.${key}.label` as 'assistant.starter.findDocuments.label',
              )
            : t(
                `assistant.starter.${key}.label` as 'assistant.starter.retryFailed.label',
                counted(count),
              )
        const text = t(`assistant.starter.${key}.text`)
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(text)}
            title={text}
            className="flex items-center gap-1.5 rounded-full bg-tertiary px-3 py-1.5 text-[12.5px] text-secondary-foreground transition-colors cursor-pointer hover:bg-quaternary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon className="size-3.5 shrink-0 text-tertiary-foreground" />
            {label}
          </button>
        )
      })}
    </div>
  )
  if (placement === 'body') return chips
  return (
    <div className="flex flex-col gap-2">
      <StatusWord>{t('assistant.panel.onThisScreen')}</StatusWord>
      {chips}
    </div>
  )
}
