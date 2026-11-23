import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import {
  DEFAULT_GROUP,
  isGrouping,
  isSort,
  type AssetGrouping,
  type AssetSort,
} from '@/lib/assetFilter'
import { SETTINGS_STORE_PERSIST_KEY } from '@/stores/constants'
import { isFeatureEnabled } from '@/config/featureFlags'
import { isCalendarDrawer, type CalendarDrawer } from '@/lib/calendarDrawer'
import { DEFAULT_POST_TAB, isPostTab, type PostTab } from '@/lib/postTabs'
import { DEFAULT_ASSET_TAB, isAssetTab, type AssetTab } from '@/lib/assetTabs'
import {
  rememberVisit,
  sanitizePostsPlaces,
  type PostsPlace,
  type PostsView,
} from '@/lib/postsPlace'

/**
 * Local-only settings stored in localStorage
 * These settings are device/browser specific and do NOT sync across devices
 */
export type LocalSettings = {
  // UI State
  sidebarCollapsed: boolean

  /**
   * Whether the assistant — the right rail's floor — is open. Open on first
   * run, and closing it is remembered from then on. Read it through
   * `selectActivePanel`.
   */
  assistantOpen: boolean

  /**
   * Whether help (CON-173) is open on top of the assistant. It *replaces*
   * whatever the rail was showing and closing it gives that back, so it is a
   * flag beside `assistantOpen` rather than a value of it. One fact however far
   * the reader moves: the panel follows the page. Read it through
   * `selectActivePanel`, which ignores it while the help-center flag is off.
   */
  helpOpen: boolean

  /**
   * Which of the calendar's two panels is open in its drawer, or `null`. One
   * choice for every calendar, the workspace's and each campaign's, so it is
   * still open on the next grid you go to — they are the same two panels over
   * the same preferences.
   *
   * Not the right rail: the drawer is the calendar's own, beside the
   * grid and under the bar over the page, so it never takes the assistant's
   * place and both can be open at once.
   */
  calendarDrawer: CalendarDrawer | null

  /**
   * The post editor's side-column tab. One choice for every post, so reading
   * the checks on one post and stepping to the next keeps the checks open.
   * The editor's own, beside the post — it never takes the assistant's place.
   */
  postTab: PostTab

  /** The asset page's side-column tab, one choice for every asset. */
  assetTab: AssetTab

  // Modal/Dialog State
  lastOpenedModals: Record<string, string> // modal ID -> last opened timestamp

  /**
   * Ids of `<Explainer>` notes the user has closed for good. Device-local on
   * purpose: it is display noise, not data, and the shared `/api/settings`
   * table is the wrong home for it.
   */
  dismissedNotes: string[]

  /**
   * Campaign id -> where the user last was in that campaign's posts. See
   * `lib/postsPlace`; read it through `selectPostsPlace` / `selectCalendarPlace`
   * rather than the map directly.
   *
   * Unbounded, and it doesn't matter: an entry is three short strings and a
   * workspace has campaigns in the dozens. A deleted campaign leaves one
   * behind that nothing will ever ask for again.
   */
  postsPlace: Record<string, PostsPlace>

  /**
   * The Assets list's group bands the user has folded, as `grouping:key`
   * (`ideas:answered`, `tag:<id>`). Device-local display state, like the
   * explainers: folding "All answered" on a laptop says nothing about how a
   * teammate wants to see the list. A band nobody can reach any more (a deleted
   * tag) leaves a short string behind that nothing reads.
   */
  collapsedAssetBands: string[]

  /**
   * How the Assets list is grouped (CON-378). One choice for the bank and
   * every campaign's page, so moving between them keeps it, and kept per
   * device like the folded bands — it is how this person likes to read the
   * list, not a fact about the workspace.
   */
  assetGrouping: AssetGrouping

  /**
   * The Assets list's sort, or null for the default (newest first; Best match
   * while searching inside the documents). Kept like the grouping: per
   * device, shared by the bank and every campaign's page, never in the URL.
   */
  assetSort: AssetSort | null
}

/**
 * What the right rail can show: the assistant, and help over it. The post
 * editor's panels are tabs in the editor's own side column and the calendar's
 * are its own drawer.
 */
export type RightPanel = 'assistant' | 'help'

type SettingsState = LocalSettings & {
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  /** Show the panel, or close it if it is the one showing — Ask Ogen, Help and `]`. */
  toggleRightPanel: (panel: RightPanel) => void
  /** Show the panel, never closing it — for buttons that mean "open". */
  openRightPanel: (panel: RightPanel) => void
  /** Close what is showing: help drops back to what it covered, the assistant closes the rail. */
  closeRightPanel: () => void

  /** Open the calendar's drawer on this panel, or close it if it is showing. */
  toggleCalendarDrawer: (panel: CalendarDrawer) => void
  /** Open the calendar's drawer on this panel — for buttons that mean "open". */
  openCalendarDrawer: (panel: CalendarDrawer) => void
  closeCalendarDrawer: () => void

  setPostTab: (tab: PostTab) => void
  setAssetTab: (tab: AssetTab) => void

  recordModalOpened: (modalId: string) => void

  /** Close an explainer permanently. Idempotent. */
  dismissNote: (id: string) => void

  /** Fold an Assets group band, or unfold it if it is folded. */
  toggleAssetBand: (band: string) => void

  setAssetGrouping: (grouping: AssetGrouping) => void

  setAssetSort: (sort: AssetSort) => void

  /**
   * Record that the user is looking at this campaign's posts, arranged this
   * way. Called by the views themselves, on every anchor change — the fold is
   * identity-stable when nothing moved, so a re-render is not a write.
   *
   * The list passes no anchor; it has none, and keeps the calendar's.
   */
  rememberPostsPlace: (
    campaignId: string,
    visit: { view: PostsView; anchor?: string },
  ) => void

  // Reset all settings to defaults
  resetAllSettings: () => void
}

const DEFAULT_SETTINGS: LocalSettings = {
  sidebarCollapsed: false,
  // The assistant is the product, not a utility drawer: a first run that hides
  // it behind a button in the corner buries the thing the app is for.
  assistantOpen: true,
  helpOpen: false,
  calendarDrawer: null,
  postTab: DEFAULT_POST_TAB,
  assetTab: DEFAULT_ASSET_TAB,
  lastOpenedModals: {},
  dismissedNotes: [],
  postsPlace: {},
  collapsedAssetBands: [],
  assetGrouping: DEFAULT_GROUP,
  assetSort: null,
}

/** The panel the right rail is showing, or `null` when it is closed. */
export const selectActivePanel = (
  state: Pick<LocalSettings, 'assistantOpen' | 'helpOpen'>,
): RightPanel | null => {
  // Help remembered open in a build (or a browser) where it is off would open
  // the rail onto a layer nothing renders.
  if (state.helpOpen && isFeatureEnabled('help-center')) return 'help'
  return state.assistantOpen ? 'assistant' : null
}

/** Help goes on top; the assistant takes help away, or it would open underneath. */
const open = (panel: RightPanel): Partial<LocalSettings> =>
  panel === 'help'
    ? { helpOpen: true }
    : { assistantOpen: true, helpOpen: false }

/** One level at a time: help gives back what it covered, the assistant closes the rail. */
const close = (state: SettingsState): Partial<LocalSettings> => {
  const active = selectActivePanel(state)
  if (active === 'help') return { helpOpen: false }
  return { assistantOpen: false, helpOpen: false }
}

/**
 * The keys the rail was stored under while it also hosted the post editor's
 * panels. Read once, on rehydration, so nobody who had closed the assistant
 * finds it open again.
 */
type LegacyRail = {
  panelMemory?: unknown
  rightRailHidden?: unknown
}

function rehydrateAssistantOpen(
  saved: Partial<LocalSettings> & LegacyRail,
): boolean {
  if (typeof saved.assistantOpen === 'boolean') return saved.assistantOpen
  const memory = saved.panelMemory
  // Never stored at all: the first run, so the first-run default.
  if (typeof memory !== 'object' || memory === null)
    return DEFAULT_SETTINGS.assistantOpen
  // A rail put away with `]` was showing nothing, so it comes back closed.
  return (
    (memory as { assistantOpen?: unknown }).assistantOpen === true &&
    saved.rightRailHidden !== true
  )
}

/**
 * The raw entry for one campaign, or `undefined` — the identity is what makes
 * this safe to subscribe to. Both readers derive from it outside the store, so
 * that the default (which reads the clock, and so is a fresh object every time)
 * is never what a subscriber is comparing against. See `hooks/usePostsPlace`.
 */
export const selectPostsPlaceEntry =
  (campaignId: string) =>
  (state: SettingsState): PostsPlace | undefined =>
    state.postsPlace[campaignId]

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, _get) => ({
        // Initial state
        ...DEFAULT_SETTINGS,

        // Sidebar actions
        setSidebarCollapsed: (collapsed) => {
          set({ sidebarCollapsed: collapsed })
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        // Right rail: the assistant, and help over it. Every write is a click.
        toggleRightPanel: (panel) => {
          set((state) =>
            selectActivePanel(state) === panel ? close(state) : open(panel),
          )
        },

        openRightPanel: (panel) => set(open(panel)),

        closeRightPanel: () => set((state) => close(state)),

        toggleCalendarDrawer: (panel) => {
          set((state) => ({
            calendarDrawer: state.calendarDrawer === panel ? null : panel,
          }))
        },

        openCalendarDrawer: (panel) => set({ calendarDrawer: panel }),

        closeCalendarDrawer: () => set({ calendarDrawer: null }),

        setPostTab: (tab) => set({ postTab: tab }),

        setAssetTab: (tab) => set({ assetTab: tab }),

        // Modal tracking actions
        recordModalOpened: (modalId) => {
          set((state) => ({
            lastOpenedModals: {
              ...state.lastOpenedModals,
              [modalId]: new Date().toISOString(),
            },
          }))
        },

        dismissNote: (id) => {
          set((state) =>
            state.dismissedNotes.includes(id)
              ? state
              : { dismissedNotes: [...state.dismissedNotes, id] },
          )
        },

        toggleAssetBand: (band) => {
          set((state) => ({
            collapsedAssetBands: state.collapsedAssetBands.includes(band)
              ? state.collapsedAssetBands.filter((b) => b !== band)
              : [...state.collapsedAssetBands, band],
          }))
        },

        setAssetGrouping: (grouping) => set({ assetGrouping: grouping }),

        setAssetSort: (sort) => set({ assetSort: sort }),

        rememberPostsPlace: (campaignId, visit) => {
          set((state) => {
            const prev = state.postsPlace[campaignId]
            const next = rememberVisit(prev, visit)
            // `rememberVisit` hands back the same object when nothing moved,
            // and this is what that is for: the calendar records on every
            // render of every anchor, so an unconditional `set` would notify
            // every subscriber — the sidebar and the post header among them —
            // on navigations that changed nothing.
            if (next === prev) return state
            return { postsPlace: { ...state.postsPlace, [campaignId]: next } }
          })
        },

        // Reset all settings — this brings closed explainers back, which is
        // the only way to see one again.
        resetAllSettings: () => {
          set({ ...DEFAULT_SETTINGS })
        },
      }),
      {
        name: SETTINGS_STORE_PERSIST_KEY,
        // Persist all state except transient modal open states
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          assistantOpen: state.assistantOpen,
          helpOpen: state.helpOpen,
          calendarDrawer: state.calendarDrawer,
          postTab: state.postTab,
          assetTab: state.assetTab,
          lastOpenedModals: state.lastOpenedModals,
          dismissedNotes: state.dismissedNotes,
          postsPlace: state.postsPlace,
          collapsedAssetBands: state.collapsedAssetBands,
          assetGrouping: state.assetGrouping,
          assetSort: state.assetSort,
        }),
        // Rehydration is the one place a stored value — a remembered calendar
        // anchor, an option this build no longer has — arrives from outside
        // this build, so it is the one place that has to distrust them.
        merge: (persisted, current) => {
          const stored = (persisted ?? {}) as Partial<LocalSettings> &
            LegacyRail
          // The old rail keys are read once and dropped, not carried in state.
          const {
            panelMemory: _panelMemory,
            rightRailHidden: _rightRailHidden,
            ...saved
          } = stored
          return {
            ...current,
            ...saved,
            assistantOpen: rehydrateAssistantOpen(stored),
            helpOpen: saved.helpOpen === true,
            calendarDrawer: isCalendarDrawer(saved.calendarDrawer)
              ? saved.calendarDrawer
              : null,
            postTab: isPostTab(saved.postTab)
              ? saved.postTab
              : DEFAULT_POST_TAB,
            assetTab: isAssetTab(saved.assetTab)
              ? saved.assetTab
              : DEFAULT_ASSET_TAB,
            postsPlace: sanitizePostsPlaces(saved.postsPlace),
            collapsedAssetBands: Array.isArray(saved.collapsedAssetBands)
              ? saved.collapsedAssetBands.filter(
                  (band): band is string => typeof band === 'string',
                )
              : [],
            // A grouping this build no longer offers (the old `ideas`) falls
            // back to the default rather than asking the server for it.
            assetGrouping: isGrouping(saved.assetGrouping)
              ? saved.assetGrouping
              : DEFAULT_GROUP,
            // A sort no longer offered (most undecided first) goes back to
            // the default.
            assetSort: isSort(saved.assetSort) ? saved.assetSort : null,
          }
        },
      },
    ),
    {
      name: SETTINGS_STORE_PERSIST_KEY,
    },
  ),
)
