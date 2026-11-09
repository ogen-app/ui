import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { HelpCircleIcon } from '@hugeicons/core-free-icons'
import { Logo } from '@/components/Logo'
import { useFeatureFlag } from '@/config/featureFlags'
import { cn } from '@/lib'
import type { GlobalPanel } from '@/lib/rightPanel'
import {
  selectAnyRunning,
  selectAnyUnread,
  useAssistantStore,
} from '@/stores/assistantStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'

/**
 * The top bar's right end: **Ask AI** and **Support**, the two things every
 * screen can open in the right column.
 *
 * Each one opens its panel, closes it if it is the one showing, or replaces
 * the other — they share the column's floor (`lib/rightPanel`), so there is
 * never a help article stacked under a conversation. A screen's own panel
 * (the calendar's, the post editor's) is opened from that screen and sits on
 * top of either.
 *
 * Ask AI replaces the floating mark that sat in the bottom-right corner. It
 * keeps that mark's two jobs: the logo draws itself while any thread is
 * working, and a dot says a thread finished somewhere you are not looking —
 * threads run on across navigation, so this is how you know.
 *
 * Support is the help centre, so it exists only while `help-center` is on.
 */
export function RailButtons({ compact }: { compact: boolean }) {
  const { t } = useTranslation()
  const helpEnabled = useFeatureFlag('help-center')
  const active = useSettingsStore(selectActivePanel)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const isBusy = useAssistantStore(selectAnyRunning)
  const hasUnread = useAssistantStore(selectAnyUnread)

  return (
    <div className="flex items-center gap-1">
      <RailButton
        panel="assistant"
        active={active === 'assistant'}
        onToggle={toggle}
        label={t('nav.askAi')}
        compact={compact}
        icon={<Logo variant="mark" className="size-4" loading={isBusy} />}
        badge={
          // Shown whenever a thread is waiting, including while the panel is
          // open: with the rail on the thread list, or on another thread, the
          // button is still the only thing saying something landed elsewhere.
          // Reading a thread is what clears it, not opening the rail.
          hasUnread && (
            <span
              aria-label={t('nav.assistantFinished')}
              className="absolute right-1 top-1 size-1.5 rounded-full bg-accent"
            />
          )
        }
      />
      {helpEnabled && (
        <RailButton
          panel="help"
          active={active === 'help'}
          onToggle={toggle}
          label={t('nav.support')}
          compact={compact}
          icon={
            <HugeiconsIcon
              icon={HelpCircleIcon}
              size={16}
              strokeWidth={1.5}
              aria-hidden
            />
          }
        />
      )}
    </div>
  )
}

function RailButton({
  panel,
  active,
  onToggle,
  label,
  compact,
  icon,
  badge,
}: {
  panel: GlobalPanel
  active: boolean
  onToggle: (panel: GlobalPanel) => void
  label: string
  compact: boolean
  icon: ReactNode
  badge?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(panel)}
      aria-pressed={active}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(
        'relative flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-secondary text-primary-foreground'
          : 'text-secondary-foreground hover:bg-secondary hover:text-primary-foreground',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center',
          // The mark is the assistant's own colour while its panel is up —
          // the one thing on the bar saying which column is open.
          active && panel === 'assistant' && 'text-accent',
        )}
      >
        {icon}
      </span>
      {!compact && <span>{label}</span>}
      {badge}
    </button>
  )
}
