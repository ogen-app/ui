import { useTranslation } from 'react-i18next'
import { CampaignSwitcher } from '@/components/layout/CampaignSwitcher'
import { Logo } from '@/components/Logo'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import {
  selectAnyRunning,
  selectAnyUnread,
  useAssistantStore,
} from '@/stores/assistantStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

/**
 * The bar over the page: which part of the work — the campaign — on the left,
 * and at its far end Ogen. 56px, the workspace cell's height, so the two
 * rules under them are one line across the frame.
 */
export function TopBar() {
  const { isMobile } = useSidebar()
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-primary pl-4 pr-3">
      {isMobile && <SidebarTrigger />}
      <CampaignSwitcher />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <AskOgen />
      </div>
    </header>
  )
}

/**
 * Opens the assistant in the column beside the page; pressing it while the
 * assistant shows closes it. Inverted, with Ogen's own mark: it is the one
 * dark thing in the bar, because it is the one thing in it that does work.
 * A thread working elsewhere draws the mark's loading stroke, and one that
 * finished while you were away leaves a dot until it is read.
 */
function AskOgen() {
  const { t } = useTranslation()
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const on = useSettingsStore(selectActivePanel) === 'assistant'
  const busy = useAssistantStore(selectAnyRunning)
  const unread = useAssistantStore(selectAnyUnread)

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggle('assistant')}
      className={cn(
        'relative flex h-9 items-center gap-2 rounded-button bg-primary-foreground px-3 text-sm font-medium text-primary outline-none transition-colors',
        'hover:bg-primary-foreground-elevated aria-pressed:bg-primary-foreground-elevated',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary',
      )}
    >
      <Logo variant="mark" loading={busy} className="size-5 shrink-0" />
      {t('nav.askOgen')}
      {unread && (
        <span
          aria-label={t('nav.assistantFinished')}
          className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-primary"
        />
      )}
    </button>
  )
}
