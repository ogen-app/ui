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
import type { ThreadSubject } from '@/types/assistant'

type Starter = { icon: Icon; label: string; text: string }

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
  {
    icon: SparkleIcon,
    label: 'Generate a content plan',
    text: 'Generate a content plan for this campaign.',
  },
  {
    icon: NotePencilIcon,
    label: 'Add a few posts',
    text: 'Add a few Threads posts in the current phase for the upcoming weeks.',
  },
  {
    icon: MagicWandIcon,
    label: 'Improve the brief',
    text: 'Improve the campaign brief — make the tone more technical and benchmark-driven.',
  },
  {
    icon: SealCheckIcon,
    label: 'Review consistency',
    text: 'Is the brief consistent? Review it and suggest improvements.',
  },
  {
    icon: CalendarBlankIcon,
    label: 'Move the end date',
    text: 'Move the campaign end to the beginning of next month.',
  },
  {
    icon: ArrowsClockwiseIcon,
    label: 'Redistribute drafts',
    text: 'Redistribute the drafts and unpublished posts across the campaign timeline.',
  },
  {
    icon: ChartBarIcon,
    label: 'Quick overview',
    text: 'Give me a quick overview of this campaign and how the content is distributed.',
  },
  {
    icon: ListChecksIcon,
    label: 'Check posts vs brief',
    text: 'Do the posts follow the brief? Flag any that drift.',
  },
]

const POST_STARTERS: Starter[] = [
  {
    icon: ScissorsIcon,
    label: 'Tighten the opening',
    text: 'Tighten the opening — one claim, no throat-clearing.',
  },
  {
    icon: SlidersHorizontalIcon,
    label: 'Change the tone',
    text: 'Rewrite this in a plainer, more direct tone.',
  },
  {
    icon: TextAaIcon,
    label: 'Make it shorter',
    text: 'Cut this down to about half its length without losing the argument.',
  },
  {
    icon: PaperclipIcon,
    label: 'Work in an asset',
    text: 'Work the key numbers from the attached assets into this post.',
  },
  {
    icon: MegaphoneIcon,
    label: 'Add a call to action',
    text: 'End this with a call to action that matches the campaign brief.',
  },
  {
    icon: QuestionIcon,
    label: "What's missing?",
    text: "What's missing from this post before it goes out?",
  },
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
  const starters = kind === 'campaign' ? CAMPAIGN_STARTERS : POST_STARTERS
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {starters.map(({ icon: Icon, label, text }) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(text)}
          title={text}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors cursor-pointer hover:bg-tertiary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon className="size-4 shrink-0 text-tertiary-foreground" />
          {label}
        </button>
      ))}
    </div>
  )
}
