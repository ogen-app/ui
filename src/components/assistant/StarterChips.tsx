import {
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  ListChecksIcon,
  MagicWandIcon,
  MegaphoneIcon,
  NotePencilIcon,
  PaperclipIcon,
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
  const starters = kind === 'campaign' ? CAMPAIGN_STARTERS : POST_STARTERS
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
