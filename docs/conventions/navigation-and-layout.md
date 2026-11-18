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
  `lib/campaignScope` (`placeLink`), and every place is one of three kinds:
  **filtered** (a page for all campaigns and a page for one — Overview,
  Strategy, Ideas, Assets, Posts, Analytics, Activity, Settings, and Calendar
  while the workspace calendar is on), **campaign only** (Calendar while it is
  off: with no campaign chosen the row opens the campaign cards at
  `/campaigns?pick=<place>`, and a workspace with exactly one campaign goes
  straight to it — as Posts does, since `/posts` would be that campaign's list
  without ADD POST), and **workspace only** (the Inbox).
  **Strategy for all campaigns is the Foundation** (`/foundation/*`), and
  both levels hold the same two things, with no headings over them. For all
  campaigns, the hub in the page's column and, in a fixed-width column beside
  it (under it when the page is too narrow), one timeline
  (`strategy/CampaignTimeline` — a plan, not a status list; the Overview's
  cards already report progress). For one, what it commits to, then the
  Foundation as it has it (`strategy/FromTheWorkspace`): the voice, audience
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

- **The right sidebar never stores which panel is open.** It persists one
  remembered choice per screen (`panelMemory` in `settingsStore`) and derives
  the rest: ask `selectActivePanel`, never `panelMemory` directly. A route makes
  its panels reachable by calling `usePanelScope('post')`
  — that is the *only* write navigation is allowed, and it's why routes no
  longer close their own panels on unmount. Never add such a cleanup effect
  back; it would save the side effects of navigating instead of the user's
  choice. New panels go in `PANEL_SCOPE` (`lib/rightPanel.ts`), which won't
  compile until they say which screen they belong to. The assistant is the
  rail's floor — open on first run, closing another panel reveals it rather
  than collapsing the rail, and navigating never closes it. See
  `docs/technical-decisions.md#panel-memory`. **The calendar's settings and
  unscheduled posts are not rail panels**: they are the calendar's own drawer
  (`CalendarDrawer`, `settingsStore.calendarDrawer`), rendered by the two
  calendar pages beside the column and under the bar over the page, so opening
  one never puts the assistant away and both can be open at once. One choice
  for every calendar, so it is still open on the next grid.

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

- **There are no centred columns.** The content column is `max-w-content`
  (740px) against the page's left gutter, under the header's title — never
  `mx-auto`. `PageActionBar` centres itself on that column, not on the page.
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
    (`useStickyColumns`). It carries the page's gutters. Strategy for all
    campaigns, with its timeline sticky.
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
  rule. Bottom-centre: the commit, on `PageActionBar`. The assistant is not a
  corner of the page: it opens from Ask Ogen at the far end of the top bar
  (`TopBar`), which belongs to the app rather than the page — the floating
  bottom-right trigger is gone. Bottom-left and bottom-right stay empty. A bar
  belongs to **editor** screens only (post, asset, brief, settings) — a list has creation, not
  commit, so `ADD CAMPAIGN` stays top-right. The bar must anchor to the
  *content column*, not the scroller (it would scroll away) and not the
  viewport (it would drift off the column when the right rail opens); pages
  using one leave `PAGE_ACTION_BAR_INSET` at the bottom of their content.

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
  filter again. `]` hides the rail rather than closing its panel
  (`settingsStore.rightRailHidden`), so the panel memory survives and `]`
  again brings back what was showing. `shouldIgnoreAppShortcut` allows Alt and
  AltGr on `[`, `]` and `?`, because those keys need them on German and
  Nordic layouts, and never ⌘. The sheet (`ShortcutsSheet`) lists its rows by
  hand, so a key added to `lib/shortcuts` and not to the sheet is a sheet that
  lies.
