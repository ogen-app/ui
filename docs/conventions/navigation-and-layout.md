# Navigation & page layout

Conventions for the rail, the campaign filter, page headers and layouts, the right sidebar, screen corners, explainers and keyboard shortcuts. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **The nav is one menu, and the campaign is a filter over it.** The rail's
  rows never change: Overview, Strategy, Ideas, Assets, Posts, Calendar,
  Analytics, then Activity and Settings at its foot, in that order
  at every scope (`layout/nav/NavPlaces`). The campaign is chosen above the
  page, in `CampaignSwitcher` on the top bar, and changes **where a row leads,
  never which rows there are** — the rail used to be two menus, the
  workspace's and a campaign's, and moving between them rewrote the list under
  the pointer. Where each row goes under each filter is one table,
  `lib/campaignScope` (`placeLink`), and every place is one of two kinds:
  **filtered** (a page for all campaigns and a page for one — Overview,
  Strategy, Ideas, Assets, Posts, Calendar, Analytics, Activity, Settings;
  in a workspace with exactly one campaign Posts goes straight to it, since
  `/posts` would be that campaign's list without ADD POST) and **workspace
  only** (the Inbox). No row asks you to pick a campaign first any more:
  Calendar was the last, until the workspace calendar.
  **Strategy for all campaigns is the Foundation** (`/foundation/*`), and
  both levels hold the same two things, with no headings over them. For all
  campaigns, the hub in the page's column and, in a fixed-width column beside
  it (under it when the page is too narrow), the Campaigns card
  (`strategy/StrategyCampaigns` — each campaign's dates, rate, channels and
  voice: a plan, not a status list; the Overview's cards already report
  progress). The swimlane timeline it replaced is parked.
  For one, the same two columns: what it
  commits to and then the Foundation as it has it in the main one, and its
  phases (`CampaignPhasesCard`) beside it, sticky, where the Campaigns card is
  one level up. The campaign's cards are being brought into the hub's card
  grammar one at a time — a heading, then `LineItem` rows — the phases first.
  The Foundation as it has it (`strategy/FromTheWorkspace`): the voice, audience
  and series it *chooses*, and the guardrails and facts it only *reads*, as
  the hub's own cards opening the workspace's section — they apply to every
  campaign, so an edit belongs where it visibly does. A card about a
  Foundation section leads with that section's hued glyph wherever it is
  (`brand/BrandSectionGlyph`); a campaign's own cards have none. There is no Foundation row and no `g f`;
  `g t` is Strategy at both levels.
  Switching campaign keeps you on the same place (`scopeLink`). The address is
  the filter wherever it has one; on a workspace-only page the last choice is
  kept per tab (`stores/campaignScopeStore`, `sessionStorage` for the reason
  the active workspace is) so the next filtered row comes back filtered — read
  it through `useCampaignScope`, which drops an id that is no longer an active
  campaign here. A module is a new `PlaceId`, a row in `NavPlaces` and its
  links in `campaignScope`; a route the table doesn't know shows no row active.
  A row's figure (Ideas' undecided count, Activity's unread) is the
  workspace's, so it shows only while no campaign is chosen.

- **Posts is a list and the Calendar is a calendar — they are two
  destinations, not three views of one.** The toolbar's switch was WEEK /
  MONTH / LIST, which said the table is a way of looking at a week; it is not,
  it has no range at all. So the segmented control offers the two
  granularities and appears only on the calendar, the list keeps the half of
  the toolbar that is about the posts (how many, and ADD POST), and both
  screens can create one. Moving between them is two rows of the rail. The
  memory still records which of the two you were last on, because the post
  editor's back arrow has to land where you came from
  (`lib/postsPlace`) — `PostsPlace.view` keeps `'list'` for exactly that, and
  `granularity` is what the entry points naming *the calendar* read.

- **Documents are Assets, and Assets is a module rather than a section of
  Foundation.** `/assets` for all campaigns, `/campaigns/:id/assets` for one, one
  `ContentPage` behind both (`campaign === null` is the workspace bank). It was
  `/content-bank`, then Foundation's `sources` section, and the move back out
  is the same observation twice: every other thing in Foundation is written
  once and revisited rarely, and this is a working list somebody has open all
  day. So Foundation's hub has no documents card, `lib/brandSections` has no
  `sources` entry, and the campaign's Foundation row is gone with the
  `InheritedBrand` band it used to carry — a campaign's inherited voice and
  audience are read on Strategy, and the guardrails are read in the workspace's
  Foundation. Assets is **unflagged**, which also stops the bank disappearing
  when `brand-materials` is off.

- **The right rail is the assistant's, with help over it.** It holds the
  assistant, and its state is `settingsStore.assistantOpen`: open on first
  run, closed only by a click, and that choice remembered. Navigating never
  closes it. **Help is the one other layer** (CON-173): opened from Help
  beside Work with Ogen, it goes on top of whatever the rail was showing and
  closing it gives that back (`settingsStore.helpOpen`, ignored while the
  `help-center` flag is off), and its article follows the page. Ask what
  shows with `selectActivePanel`, never the two flags directly. A screen's
  own panels don't go in the rail — each one put the assistant away to show
  something about the page, and needed the rail to know which screen was under
  it. The post editor's settings, preview, checks, quality, sources, notes and
  history are tabs in the editor's own side column
  (`components/posts/editor/PostSideColumn`, the tab in
  `settingsStore.postTab`); the calendar's settings and unscheduled posts are
  the calendar's own drawer (`CalendarDrawer`, `settingsStore.calendarDrawer`),
  rendered by the two calendar pages beside the column and under the bar over
  the page. Both open alongside the assistant, and each is one choice for
  every post or every calendar. See `docs/technical-decisions.md#panel-memory`.

- **Explanatory copy goes in `<Explainer>`**, which the user can close for
  good (`settingsStore.dismissedNotes`, device-local — display noise doesn't
  belong in the workspace-wide `/api/settings`). The rule that makes it safe:
  an Explainer holds **teaching only** — never a count, warning, validation
  message, or link the user needs while working, because all of it disappears
  for anyone who closes the note. Check the screen still reads correctly with
  the Explainer deleted. See `docs/technical-decisions.md#explainers`.

- **A page header names the place, and the switcher names the scope.** The
  title is the place's name at both levels — "Strategy", never "Spring launch
  Strategy" — because the campaign is already in the bar above. Headers are
  solid, with no gradient. A list or grid keeps its header pinned (its actions
  steer it); a document (`PageHeader`'s `scrollAway`: Strategy, Overview,
  Analytics, Activity, Settings, Profile) lets it scroll away, and the top bar
  takes over its title after the switcher — "Strategy", which scrolls back
  up (`stores/pageCrumbStore`). Only the title: the bar deliberately does not
  follow which card is being read.
  **The calendar is the one exception:** its heading is the range on screen
  ("16–22 November 2026"), with its controls on the same row
  (`calendar/CalendarHeader`) — the grid already says it is a calendar.

- **There are no centred columns.** The content column is `max-w-content`
  (740px) against the page's left gutter, under the header's title — never
  `mx-auto`. `PageActionBar` spans that column, not the page.
  Full-screen flows outside the app frame (auth, `/plans`, checkout) are the
  exception.

- **A page that is more than one column of cards uses one of two layouts**
  (`page-primitives`), never a hand-rolled grid. Both switch on the page's own
  width (a container query, because the right rail takes its width out of the
  page), share the 16px gap and the 60rem switch, and set
  `--container-content` to 100% inside, so a card's `max-w-content` means its
  column — which is why that token lives in a plain `@theme` block rather than
  the inline one.
  - **`PageColumns` — main content and a side column.** The main column
    stretches; the `aside` keeps a preset width beside it and goes under it,
    full width, when the page is too narrow. Each column spaces its own cards,
    so pass the cards, not a wrapper. `masonry` flows the main column's cards
    into as many columns as fit — only for peer cards with no order (the
    Foundation hub), because masonry reads down each column first.
    `stickyAside` keeps the side column on screen while the main one is read
    — under a `scrollAway` header only, since it pins 16px from the top — and
    one taller than the screen is never cut off or given its own scroll: it
    rides up until its foot shows, by the asset page's rule
    (`useStickyColumns`). It carries the page's gutters. Strategy at both
    levels: the Campaigns card sticky for all campaigns, the phases for one.
    Activity, with Needs you sticky beside the day cards: the live
    warnings (`workspaceWarnings`, alert and risk only), never unread
    notifications, which the feed marks read on sight.
  - **`PageGrid` — a dashboard.** Cards in rows, each in a `GridCell` asking
    for a named share: `full`, `wide` (⅔), `half`, `narrow` (⅓) of a six-track
    grid from 60rem; from 40rem every share short of `full` is a half, so a
    wide + narrow row becomes two halves before it stacks; under 40rem, one
    column. A card that doesn't fit starts the next row. **Source order is
    reading order at every width**, so write the cards in order of
    importance — the narrow stack follows from it — and never reach for
    `grid-auto-flow: dense` or masonry here, both of which move cards out of
    it. Rows are one height by default (`rows="stretch"`, content at the top);
    `rows="start"` keeps each card's own height and leaves the gap. **A
    dashboard card bounds what it shows** — the next few, the top few with
    "+2 like this", SHOW MORE — and links to the whole list, or one long card
    stretches every card beside it. Its header is `OverviewCard`'s: glyph,
    title, count or status, then one chevron or one action on the right. A
    cell whose card renders nothing is not drawn. No gutters, so it nests in
    a `PageColumns` column. The campaign Overview.
  - **Neither is "fully fluid"** (cards choosing their own widths and
    wrapping like words): the rows would be whatever the window makes them.
    Wrapping by width is for tiles inside a card (`StatTile`), not for a page.

- **Screen corners have fixed jobs — top is about the object, bottom is about
  the work** (CON-178). Top-left: where you are and how you get back.
  Top-right: **views only** — anything that opens or switches a representation,
  never anything that changes the document. Top-centre (`PageHeader`'s `center`
  slot): passive status, in practice just `SaveStatus`, non-interactive by
  rule. Bottom: the commit, on `PageActionBar` — a white 56px band with a
  rule on top, the height of the rail's account row so the two read as one
  band, its buttons on the left and the main one black (`defaultInverted`),
  the others `outline`. The assistant is not a
  corner of the page: it opens from Work with Ogen at the far end of the top bar
  (`TopBar`), which belongs to the app rather than the page — the floating
  bottom-right trigger is gone. A bar
  belongs to **editor** screens only (asset, brief, settings) — a list has creation, not
  commit, so `ADD CAMPAIGN` stays top-right, and so do the Assets list's ADD
  and the posts list's `ADD POST`. The bar must anchor to the
  *content column*, not the scroller (it would scroll away) and not the
  viewport (it would drift off the column when the right rail opens); pages
  using one leave `PAGE_ACTION_BAR_INSET` at the bottom of their content.
  **The post is the exception.** Its editor is a writing column beside a
  column of tabs (`PostSideColumn`), and its commit sits in its own 48px bar
  over the writing column (`PostBar`), level with the tab strip: ←, the post's
  title (never a bare "Posts", which said nothing) and ‹ n of N › on the left;
  publish timing, status, a bordered ⋮ for the rest, and the one move forward
  last, in the corner, on the right. Not in the bar over the page — that one
  is the app's, and a post's SCHEDULE beside Ask Ogen fought it for the
  corner — and not floating at the foot of the page over a fade. The tabs are
  an icon over a one-word name, and the first is an Overview: the settings,
  then one line from each other tab saying whether it is worth opening — a
  label alone never got Quality or Notes opened. Every settings value starts
  with a 16px mark (logo, picture, icon, or the warning in its place) so the
  column of values reads straight down.

- **A control that doesn't govern the whole page doesn't go in the corner.**
  The top-right rule above says what *may* sit there, not that every view
  switch must. Analytics' period sits in a scope bar above the cards
  (`WorkspaceScopeBar`) because it does not reach the all-time lessons card,
  and the platform marks sit beside it because the two are read together. What
  makes that safe is that the cards answer back — `SectionCard`'s `scope`
  prints one line under the heading when the period does *not* reach it. A card
  silently ignoring a control above it is worse than not offering the control.
  The platforms reach all three reads since CON-289: a repeatable `platform`
  (Zernio slugs, the union), multi-select on screen, and **nothing chosen is
  sent as no parameter**, never as every slug — so a selection that grows to
  cover every connected platform collapses back to empty, and a platform
  connected later is counted in a view that says it is the whole workspace.

- **The app's keys are one listener and one table** (CON-394).
  `useAppShortcuts`, mounted once in `_authenticated`, owns `[` (the menu —
  ⌘B still works), `]` (the right rail), `o` (the assistant, composer
  focused), `?` (the sheet) and `g` then a letter; `/` stays with the filter
  sentence. Where a letter goes is `lib/shortcuts.ts`, and inside a campaign
  `g i/a/n/s` go to the campaign's own sections, which is the nav's campaign
  filter again. `]` is the same toggle as Ask Ogen, since the rail is the
  assistant's. `shouldIgnoreAppShortcut` allows Alt and
  AltGr on `[`, `]` and `?`, because those keys need them on German and
  Nordic layouts, and never ⌘. The sheet (`ShortcutsSheet`) lists its rows by
  hand, so a key added to `lib/shortcuts` and not to the sheet is a sheet that
  lies.
