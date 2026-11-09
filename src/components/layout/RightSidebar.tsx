import type { ReactNode } from 'react'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { HelpPanel } from '@/components/help/HelpPanel'
import { CalendarSettingsPanel } from '@/components/campaigns/calendar/CalendarSettingsPanel'
import {
  NotScheduledPanel,
  WorkspaceNotScheduledPanel,
} from '@/components/campaigns/calendar/NotScheduledPanel'
import { useFeatureFlag } from '@/config/featureFlags'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
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
function PanelLayer({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
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
 * The app's right sidebar — the third column: a single slide-in container
 * hosting the assistant, the help centre, and the panels belonging to
 * whichever screen is open (calendar settings, not-scheduled posts, the post
 * editor's four). One panel shows at a time and the container stays open while
 * they swap. The assistant and help are opened from the top bar's Ask AI and
 * Support (`RailButtons`); a screen's own panels from that screen.
 *
 * What shows is *derived*, never stored: the settings store remembers one
 * choice per screen, and `selectActivePanel` picks the one this screen can
 * serve — so a remembered panel that belongs elsewhere falls back to the
 * assistant instead of opening the rail onto an empty layer. See
 * `lib/rightPanel`.
 */
export function RightSidebar() {
  const remembered = useSettingsStore(selectActivePanel)
  const campaignId = useSettingsStore((s) => s.campaignId)
  const scope = useSettingsStore((s) => s.scope)
  const close = useSettingsStore((s) => s.closeRightPanel)
  const helpEnabled = useFeatureFlag('help-center')

  // Help remembered from a browser where the flag was forced on stays shut
  // rather than opening the rail onto a layer that is not mounted.
  const activePanel = remembered === 'help' && !helpEnabled ? null : remembered
  const isOpen = activePanel !== null
  const assistantActive = activePanel === 'assistant'

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
            {/* Mounted only behind its flag, and then always — like the
                assistant — so a pasted `#help/<key>` link opens it. */}
            {helpEnabled && (
              <PanelLayer active={activePanel === 'help'}>
                <HelpPanel showing={activePanel === 'help'} onClose={close} />
              </PanelLayer>
            )}
            {/* The calendar's two panels, in the version the calendar
                underneath calls for. They are the same two panels over the same
                preferences either way; what differs is whose posts the
                not-scheduled list holds, and whether the day rows can name a
                campaign's publishing days.

                The two branches are gated differently on purpose. The
                campaign's stays mounted on `campaignId` alone, which outlives
                the scope, so leaving the calendar fades the panel out rather
                than making it vanish mid-transition. The workspace's is gated
                on the scope, because the alternative — mounting wherever no
                campaign has been visited — would pull the whole workspace's
                posts on app boot for a panel nobody has opened. While the
                workspace calendar is on screen the route is already running
                that query, so the panel's own read costs nothing. */}
            {campaignId && (
              <>
                <PanelLayer active={activePanel === 'calendarSettings'}>
                  <CalendarSettingsPanel
                    campaignId={campaignId}
                    onClose={close}
                  />
                </PanelLayer>
                <PanelLayer active={activePanel === 'notScheduled'}>
                  <NotScheduledPanel campaignId={campaignId} onClose={close} />
                </PanelLayer>
              </>
            )}
            {campaignId === null && scope === 'calendar' && (
              <>
                <PanelLayer active={activePanel === 'calendarSettings'}>
                  <CalendarSettingsPanel onClose={close} />
                </PanelLayer>
                <PanelLayer active={activePanel === 'notScheduled'}>
                  <WorkspaceNotScheduledPanel onClose={close} />
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
    </>
  )
}
