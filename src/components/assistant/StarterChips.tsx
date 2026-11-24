import {
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
import type { TFunction } from 'i18next'
import {
  subjectCampaignId,
  type CampaignStarter,
  type CampaignState,
  type CampaignStateRead,
  type ThreadSubject,
} from '@/types/assistant'
import { useCampaignAssistantState } from '@/hooks/useCampaignAssistantState'
import type { ViewScreen } from '@/lib/viewContext'
import { counted } from '@/lib/intl'
import { periodName } from '@/lib/goalPeriod'
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
  | 'triageUndecided'
  | 'onlyDrafts'
  | 'moveThese'
  | 'askAboutThese'
  | 'whyFits'
  | 'similarIdeas'
  | 'draftIt'
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
/**
 * `one` is a selection of a single item, where "these" questions about a
 * set make no sense (CON-481); `focused` is a list with one of its items
 * open, which is what "this one" means.
 */
type ScreenStarters = {
  none: Starter[]
  selected?: Starter[]
  one?: Starter[]
  focused?: Starter[]
}

// The CON-465 boards' (CON-481).
const IDEAS: ScreenStarters = {
  none: [
    { icon: SparkleIcon, key: 'triageUndecided' },
    { icon: IntersectIcon, key: 'mergeDuplicates' },
    { icon: MagnifyingGlassIcon, key: 'findIdeas' },
  ],
  selected: [
    { icon: StackIcon, key: 'compileSelected' },
    { icon: NotePencilIcon, key: 'draftSelected' },
    { icon: IntersectIcon, key: 'whatShare' },
  ],
  one: [
    { icon: MagnifyingGlassIcon, key: 'findSimilar' },
    { icon: NotePencilIcon, key: 'draftSelected' },
  ],
  focused: [
    { icon: ChartBarIcon, key: 'whyFits' },
    { icon: IntersectIcon, key: 'similarIdeas' },
    { icon: NotePencilIcon, key: 'draftIt' },
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

/** What a ticked set of a Foundation list can be asked (CON-482). */
const FOUNDATION_SELECTED: Starter[] = [
  { icon: QuestionIcon, key: 'askAboutThese' },
]

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
  selected: FOUNDATION_SELECTED,
}

const FOUNDATION_FACTS: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'expiredFacts' },
    { icon: ArrowClockwiseIcon, key: 'renewFact' },
    { icon: NotePencilIcon, key: 'addFact' },
  ],
  selected: FOUNDATION_SELECTED,
}

const FOUNDATION_SERIES: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'ourSeries' },
    { icon: NotePencilIcon, key: 'makeSeries' },
    { icon: MegaphoneIcon, key: 'runInCampaign' },
  ],
  selected: FOUNDATION_SELECTED,
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
  // The CON-467 board's (CON-482): a filter to set, and moves for a selection.
  none: [{ icon: FunnelIcon, key: 'onlyDrafts' }, ...CAMPAIGN_STARTERS],
  selected: [
    { icon: CalendarBlankIcon, key: 'moveThese' },
    { icon: SealCheckIcon, key: 'checkBrandSelected' },
  ],
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

/** How many of the campaign's own starters lead the screen's. */
const LEADING_CHIPS = 2

const STATE_ICON: Record<CampaignStarter['kind'], Icon> = {
  fill: CalendarBlankIcon,
  draft: NotePencilIcon,
  calendar: WarningCircleIcon,
  sources: PaperclipIcon,
}

/**
 * The campaign's starters (CON-483), worded here — the chip and the message it
 * sends alike — from their kind and figures (CON-511): "Fill April", "Draft 20
 * posts". The message is the user's, so it reads in their language too. A
 * starter sent without its figures falls back to the state's, and then to
 * the server's English chip and sentence; one with none of them is left out.
 */
function campaignStarterChips(
  t: TFunction,
  read: CampaignStateRead | null | undefined,
) {
  if (!read) return []
  const { state } = read
  return read.starters.flatMap((starter) => {
    // Without its figures, the server's own words still make a chip; with
    // neither, there is nothing to offer.
    const words = starterWords(t, starter, state) ?? {
      label: starter.label ?? '',
      says: starter.instruction,
    }
    if (!words.label || !words.says) return []
    return [
      {
        key: `state-${starter.kind}`,
        icon: STATE_ICON[starter.kind],
        label: words.label,
        text: words.says,
      },
    ]
  })
}

/** A starter's chip and message, from its figures; null when it has none. */
function starterWords(
  t: TFunction,
  starter: CampaignStarter,
  state: CampaignState,
): { label: string; says: string } | null {
  switch (starter.kind) {
    case 'fill': {
      const period = starter.period ?? state.goal?.period
      const count = starter.count ?? period?.left
      if (!period || !count) return null
      const name = periodName(period)
      return {
        label: t('assistant.campaignState.starter.fill', { period: name }),
        says: t('assistant.campaignState.starterSays.fill', {
          ...counted(count),
          period: name,
        }),
      }
    }
    case 'draft': {
      const count = starter.count ?? state.goal?.room
      if (!count) return null
      return {
        label: t('assistant.campaignState.starter.draft', counted(count)),
        says: t('assistant.campaignState.starterSays.draft', counted(count)),
      }
    }
    case 'calendar': {
      const count = starter.count ?? state.calendar?.total
      if (!count) return null
      return {
        label: t('assistant.campaignState.starter.calendar', counted(count)),
        says: t('assistant.campaignState.starterSays.calendar'),
      }
    }
    case 'sources': {
      const count = starter.count ?? state.sources?.notReady
      if (!count) return null
      return {
        label: t('assistant.campaignState.starter.sources', counted(count)),
        says: t('assistant.campaignState.starterSays.sources'),
      }
    }
  }
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
  const focusKind = useViewContextStore((s) => s.page?.focus?.kind)
  const hasSelection =
    !!selection && ('allMatching' in selection || selection.ids.length > 0)
  const single =
    !!selection &&
    'ids' in selection &&
    (selection.count ?? selection.ids.length) <= 1
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
  // On a campaign's screens, over a thread already going, the chips lead
  // with what the campaign's numbers suggest (CON-483).
  const campaignScreen =
    placement === 'footer' &&
    !hasSelection &&
    !focusKind &&
    !!screen?.startsWith('campaign.') &&
    subject?.kind === 'campaign'
  const campaignState = useCampaignAssistantState(
    campaignScreen && subject ? subjectCampaignId(subject) : undefined,
  )
  const leading = campaignScreen
    ? campaignStarterChips(t, campaignState.data).slice(0, LEADING_CHIPS)
    : []
  const starters =
    (hasSelection && single && forScreen?.one) ||
    (hasSelection && forScreen?.selected) ||
    (focusKind && forScreen?.focused) ||
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
      {[
        ...leading,
        ...starters.map(({ icon, key, count }) => ({
          key,
          icon,
          label:
            count === undefined
              ? t(
                  `assistant.starter.${key}.label` as 'assistant.starter.findDocuments.label',
                )
              : t(
                  `assistant.starter.${key}.label` as 'assistant.starter.retryFailed.label',
                  counted(count),
                ),
          text: t(`assistant.starter.${key}.text`),
        })),
      ].map(({ icon: Icon, key, label, text }) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onPick(text)}
          title={text}
          className="flex items-center gap-1.5 rounded-full bg-tertiary px-3 py-1.5 text-xs text-secondary-foreground transition-colors cursor-pointer hover:bg-quaternary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon className="size-3.5 shrink-0 text-tertiary-foreground" />
          {label}
        </button>
      ))}
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
