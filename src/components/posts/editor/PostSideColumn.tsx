import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BooksIcon,
  ClockCounterClockwiseIcon,
  DevicesIcon,
  GaugeIcon,
  GearSixIcon,
  ListChecksIcon,
  NotePencilIcon,
  type Icon,
} from '@phosphor-icons/react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RailPanelEmbeddedProvider } from '@/components/page-primitives/RailPanel'
import { POST_TABS, type PostTab } from '@/lib/postTabs'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

const ICON: Record<PostTab, Icon> = {
  settings: GearSixIcon,
  preview: DevicesIcon,
  checks: ListChecksIcon,
  quality: GaugeIcon,
  sources: BooksIcon,
  notes: NotePencilIcon,
  history: ClockCounterClockwiseIcon,
}

/**
 * What a tab still says while closed: how many things on it stop the post
 * publishing, or should be looked at. Drawn as the warning dot, counted in
 * the tab's name.
 */
export type PostTabBadge = { warn?: number }

/**
 * The post editor's side column: one strip of tabs over the one tab on show.
 *
 * Everything about the post that is not the post — its settings, how it will
 * look, whether it passes, what it reads from, what the team said, what it
 * used to be — lives here, beside the writing column, so the right rail is
 * left to the assistant and Ogen can help with any of it. They used to be
 * four rail panels that took the assistant's place.
 *
 * The tab is one remembered choice for every post (`settingsStore.postTab`):
 * reading the checks on one post and stepping to the next keeps the checks
 * open. Only the tab on show is mounted, so a tab that fetches (History) costs
 * nothing until it is opened.
 */
export function PostSideColumn({
  badges,
  children,
}: {
  badges: Partial<Record<PostTab, PostTabBadge>>
  /** The body of the tab on show, picked by the caller from `postTab`. */
  children: ReactNode
}) {
  const { t } = useTranslation()
  const tab = useSettingsStore((s) => s.postTab)
  const setTab = useSettingsStore((s) => s.setPostTab)

  return (
    <aside className="flex w-[24rem] shrink-0 flex-col border-l border-border bg-primary xl:w-[27rem]">
      <div
        role="tablist"
        aria-label={t('posts.editor.tabs.label')}
        className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3 lg:px-6"
      >
        {POST_TABS.map((id) => (
          <TabButton
            key={id}
            id={id}
            label={t(`posts.editor.tabs.${id}`)}
            selected={id === tab}
            badge={badges[id]}
            onSelect={() => setTab(id)}
          />
        ))}
      </div>
      <div
        role="tabpanel"
        id={`post-tab-${tab}`}
        aria-labelledby={`post-tab-button-${tab}`}
        className="relative min-h-0 flex-1"
      >
        <RailPanelEmbeddedProvider value>{children}</RailPanelEmbeddedProvider>
      </div>
    </aside>
  )
}

/**
 * Icon-only, open or closed, with the name on hover and read aloud. The open
 * tab says what it is by its filled icon and its panel's own content — a
 * printed name only pushed the strip wider than the column.
 */
function TabButton({
  id,
  label,
  selected,
  badge,
  onSelect,
}: {
  id: PostTab
  label: string
  selected: boolean
  badge?: PostTabBadge
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const Glyph = ICON[id]
  const warn = badge?.warn ?? 0
  const name = warn
    ? t('posts.editor.tabs.withWarnings', { label, count: warn })
    : label

  const button = (
    <button
      type="button"
      role="tab"
      id={`post-tab-button-${id}`}
      aria-selected={selected}
      aria-controls={`post-tab-${id}`}
      aria-label={name}
      onClick={onSelect}
      className={cn(
        'relative flex size-9 shrink-0 items-center justify-center rounded-button text-sm outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'bg-secondary text-foreground'
          : 'text-tertiary-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <Glyph weight={selected ? 'fill' : 'regular'} className="size-5" />
      {warn > 0 && (
        <span
          aria-hidden
          className="absolute top-1 right-1 size-2 rounded-full bg-warning ring-2 ring-primary"
        />
      )}
    </button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{name}</TooltipContent>
    </Tooltip>
  )
}
