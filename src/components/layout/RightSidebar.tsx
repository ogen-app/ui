import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { CalendarSettingsPanel } from '@/components/campaigns/calendar/CalendarSettingsPanel'
import { NotScheduledPanel } from '@/components/campaigns/calendar/NotScheduledPanel'
import {
  selectAnyRunning,
  selectAnyUnread,
  useAssistantStore,
} from '@/stores/assistantStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

const PANEL_WIDTH = 'w-120'

/**
 * Portal target for the post editor's settings form. The form needs the
 * editor's `usePost` instance (one autosave pipeline per post), so the post
 * route renders it and portals it into this layer.
 */
export const POST_SETTINGS_PORTAL_ID = 'right-sidebar-post-settings'

/**
 * Portal target for the post editor's preview. Same reason as the settings
 * form: it renders the live `usePost` document, so the post route owns it and
 * this layer only hosts it.
 */
export const POST_PREVIEW_PORTAL_ID = 'right-sidebar-post-preview'

/**
 * Portal target for the post editor's quality assessment. Hosted here like
 * the two above, but for a different reason: the panel compares the stored
 * score against the live document's `updated_at` to say whether it has gone
 * stale, so it has to read the route's `usePost` rather than fetch its own.
 */
export const POST_QUALITY_PORTAL_ID = 'right-sidebar-post-quality'

/**
 * Portal target for the post editor's version history. Hosted here for the
 * same reason as its siblings — it is scoped to one post, and the post route
 * is what knows which one.
 */
export const POST_VERSIONS_PORTAL_ID = 'right-sidebar-post-versions'

/**
 * One stacked content layer inside the sidebar. Inactive layers stay mounted
 * and fade out (opacity only), so switching panels cross-fades and the AI
 * assistant keeps running invisibly.
 */
function PanelLayer({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!active}
      className={cn(
        'absolute inset-0 transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {children}
    </div>
  )
}

/**
 * The app's right sidebar: a single slide-in container hosting the AI assistant
 * and the panels belonging to whichever screen is open (calendar settings,
 * not-scheduled posts, the post editor's four). One panel shows at a time and
 * the container stays open while they swap; the floating trigger in the
 * bottom-right corner shifts left while it is open.
 *
 * What shows is *derived*, never stored: the settings store remembers one
 * choice per screen, and `selectActivePanel` picks the one this screen can
 * serve — so a remembered panel that belongs elsewhere falls back to the
 * assistant instead of opening the rail onto an empty layer. See
 * `lib/rightPanel`.
 */
export function RightSidebar() {
  const activePanel = useSettingsStore(selectActivePanel)
  const campaignId = useSettingsStore((s) => s.campaignId)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const close = useSettingsStore((s) => s.closeRightPanel)

  const isOpen = activePanel !== null
  const assistantActive = activePanel === 'assistant'

  // Any thread working flips the trigger's logo into its line-drawing
  // animation, and a thread that finished while the user was elsewhere leaves
  // a dot — threads run on across navigation, so the trigger is how you know.
  const isBusy = useAssistantStore(selectAnyRunning)
  const hasUnread = useAssistantStore(selectAnyUnread)

  return (
    <>
      <div
        className={cn(
          'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
          isOpen ? PANEL_WIDTH : 'w-0',
        )}
      >
        <div className={cn(PANEL_WIDTH, 'h-full bg-primary flex flex-row')}>
          <div className="w-px self-stretch bg-border shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 min-h-0 relative">
            {/* Never unmounts — assistant processes continue while hidden. */}
            <PanelLayer active={assistantActive}>
              <AssistantPanel onClose={close} />
            </PanelLayer>
            {/* Both are campaign-scoped — calendar preferences are stored per
                campaign, and the not-scheduled list is that campaign's. */}
            {campaignId && (
              <>
                <PanelLayer active={activePanel === 'calendarSettings'}>
                  <CalendarSettingsPanel campaignId={campaignId} onClose={close} />
                </PanelLayer>
                <PanelLayer active={activePanel === 'notScheduled'}>
                  <NotScheduledPanel campaignId={campaignId} onClose={close} />
                </PanelLayer>
              </>
            )}
            <PanelLayer active={activePanel === 'postSettings'}>
              <div id={POST_SETTINGS_PORTAL_ID} className="h-full" />
            </PanelLayer>
            <PanelLayer active={activePanel === 'postPreview'}>
              <div id={POST_PREVIEW_PORTAL_ID} className="h-full" />
            </PanelLayer>
            <PanelLayer active={activePanel === 'postQuality'}>
              <div id={POST_QUALITY_PORTAL_ID} className="h-full" />
            </PanelLayer>
            <PanelLayer active={activePanel === 'postVersions'}>
              <div id={POST_VERSIONS_PORTAL_ID} className="h-full" />
            </PanelLayer>
          </div>
        </div>
      </div>
      <Button
        variant="container"
        size="excluded"
        onClick={() => toggle('assistant')}
        aria-label="Content Strategist"
        aria-expanded={assistantActive}
        style={{ zIndex: ZIndex.navigation }}
        className={cn(
          // `size-12` and `bottom-4` are shared with PageActionBar, so the
          // trigger and a page's commit bar sit on one line across the bottom
          // of the app. 16px from the right is half a step inside the content
          // gutter's 24px — the one deliberate break-out, because this is the
          // only control on screen that belongs to the app and not the page.
          'fixed bottom-4 size-12 rounded-none shadow-lg bg-primary justify-center',
          'transition-[right,color] duration-300 ease-in-out',
          // The logo mark inherits its fill via currentColor.
          isOpen ? 'right-[calc(30rem+1rem)]' : 'right-4',
          assistantActive
            ? 'text-accent'
            : 'text-primary-foreground hover:text-accent',
        )}
      >
        <Logo variant="mark" className="size-8" loading={isBusy} />
        {hasUnread && !assistantActive && (
          <span
            aria-label="The assistant has finished"
            className="absolute top-2 right-2 size-2 rounded-full bg-accent"
          />
        )}
      </Button>
    </>
  )
}
