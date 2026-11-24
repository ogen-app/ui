import { QuestionIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { CampaignSwitcher } from '@/components/layout/CampaignSwitcher'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import {
  selectAnyRunning,
  selectAnyUnread,
  useAssistantStore,
} from '@/stores/assistantStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { usePageCrumbStore } from '@/stores/pageCrumbStore'
import { useFeatureFlag } from '@/config/featureFlags'
import { useHelpStore } from '@/stores/helpStore'
import { usePageHelpArticle } from '@/hooks/useHelp'

/**
 * The bar over the page: which part of the work — the campaign — on the left,
 * then, once a document's own header has scrolled away, its title,
 * and at its far end Ogen. 56px, the workspace cell's height, so the two
 * rules under them are one line across the frame.
 */
export function TopBar() {
  const { isMobile } = useSidebar()
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-primary pl-4 pr-6">
      {isMobile && <SidebarTrigger />}
      <CampaignSwitcher />
      <PageCrumbTrail />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Help />
        <WorkWithOgen />
      </div>
    </header>
  )
}

/**
 * A document's title once its own header has scrolled away
 * (`pageCrumbStore`), and the way back up to it. Only the title — the bar
 * does not follow which card is being read.
 */
function PageCrumbTrail() {
  const crumb = usePageCrumbStore((s) => s.crumb)
  if (!crumb) return null

  return (
    <button
      type="button"
      onClick={crumb.toTop}
      className="min-w-0 truncate rounded-button px-1 text-sm font-medium text-primary-foreground outline-none animate-in fade-in-0 duration-200 hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {crumb.title}
    </button>
  )
}

/**
 * Help for the screen you are on (CON-173), in the column beside the page. It
 * takes the assistant's place there rather than opening a second column, and
 * pressing it again gives the assistant back (`settingsStore.helpOpen`). The article is
 * the one the route names (`staticData.help`), and the panel follows the page
 * from then on (`HelpPanel`).
 *
 * White beside Work with Ogen's teal: help is a way of reading the screen, and
 * the bar keeps its one colour for the thing that does work.
 */
function Help() {
  const enabled = useFeatureFlag('help-center')
  return enabled ? <HelpButton /> : null
}

function HelpButton() {
  const { t } = useTranslation()
  const on = useSettingsStore(selectActivePanel) === 'help'
  const pageArticle = usePageHelpArticle({ enabled: true })

  return (
    <Button
      variant="outline"
      size="bar"
      active={on}
      aria-pressed={on}
      onClick={() => {
        if (on) useSettingsStore.getState().closeRightPanel()
        else useHelpStore.getState().open(pageArticle)
      }}
    >
      <QuestionIcon className="size-5" />
      {t('nav.openHelp')}
    </Button>
  )
}

/**
 * Opens the assistant in the column beside the page; pressing it while the
 * assistant shows closes it. Filled in the brand teal with Ogen's own mark in
 * white: it is the one coloured thing in the bar, because it is the one thing
 * in it that does work.
 * A thread working elsewhere draws the mark's loading stroke, and one that
 * finished while you were away leaves a dot until it is read.
 */
function WorkWithOgen() {
  const { t } = useTranslation()
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const on = useSettingsStore(selectActivePanel) === 'assistant'
  const busy = useAssistantStore(selectAnyRunning)
  const unread = useAssistantStore(selectAnyUnread)

  return (
    <Button
      variant="accent"
      size="bar"
      active={on}
      aria-pressed={on}
      onClick={() => toggle('assistant')}
    >
      {/* The mark's fill and the loading stroke are set here rather than left
          to `currentColor`, so nothing that recolours logos app-wide (the dev
          port tint does) turns this one away from white on the teal. */}
      <Logo
        variant="mark"
        loading={busy}
        className="size-5 shrink-0 [&_path:first-of-type]:fill-primary [&_path:last-of-type]:stroke-primary"
      />
      {t('nav.workWithOgen')}
      {unread && (
        <span
          aria-label={t('nav.assistantFinished')}
          className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-notification ring-2 ring-primary"
        />
      )}
    </Button>
  )
}
