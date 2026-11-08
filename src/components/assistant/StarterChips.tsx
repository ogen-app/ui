import {
  ArchiveIcon,
  ArrowsClockwiseIcon,
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
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { ThreadSubject } from '@/types/assistant'
import type { ViewScreen } from '@/lib/viewContext'
import { useViewContextStore } from '@/stores/viewContextStore'

/** `key` names the starter's label and draft under `assistant.starter`. */
type Starter = { icon: Icon; key: StarterKey }

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
  | 'askAssets'
  | 'ideasFromAssets'
  | 'summariseSelected'
  | 'planFromSelected'
  | 'tagSelected'
  | 'summariseIt'
  | 'askTheAsset'
  | 'ideasFromThis'
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

const ASSETS: ScreenStarters = {
  none: [
    { icon: QuestionIcon, key: 'askAssets' },
    { icon: LightbulbIcon, key: 'ideasFromAssets' },
  ],
  selected: [
    { icon: ListBulletsIcon, key: 'summariseSelected' },
    { icon: CalendarBlankIcon, key: 'planFromSelected' },
    { icon: TagIcon, key: 'tagSelected' },
  ],
}

const ASSET: ScreenStarters = {
  none: [
    { icon: ListBulletsIcon, key: 'summariseIt' },
    { icon: QuestionIcon, key: 'askTheAsset' },
    { icon: LightbulbIcon, key: 'ideasFromThis' },
  ],
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
  ],
}

const ACTIVITY: ScreenStarters = {
  none: [
    { icon: CalendarBlankIcon, key: 'yesterday' },
    { icon: ListBulletsIcon, key: 'thisWeek' },
  ],
}

const SETTINGS: ScreenStarters = {
  none: [
    { icon: PlugsConnectedIcon, key: 'connections' },
    { icon: QuestionIcon, key: 'autoPublish' },
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
  if (screen.startsWith('foundation')) return FOUNDATION
  if (screen === 'activity' || screen === 'campaign.activity') return ACTIVITY
  if (screen === 'settings' || screen === 'profile') return SETTINGS
  return null
}

const STARTERS: Record<ThreadSubject['kind'], Starter[]> = {
  campaign: CAMPAIGN_STARTERS,
  post: POST_STARTERS,
  workspace: WORKSPACE_STARTERS,
}

export function StarterChips({
  kind,
  onPick,
  disabled = false,
}: {
  kind: ThreadSubject['kind']
  onPick: (text: string) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const screen = useViewContextStore((s) => s.location.screen)
  const selection = useViewContextStore((s) => s.page?.selection)
  const hasSelection =
    !!selection && ('allMatching' in selection || selection.ids.length > 0)
  const forScreen = screenStarters(screen)
  const starters =
    (hasSelection && forScreen?.selected) || forScreen?.none || STARTERS[kind]
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {starters.map(({ icon: Icon, key }) => {
        const label = t(`assistant.starter.${key}.label`)
        const text = t(`assistant.starter.${key}.text`)
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(text)}
            title={text}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors cursor-pointer hover:bg-tertiary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon className="size-4 shrink-0 text-tertiary-foreground" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
