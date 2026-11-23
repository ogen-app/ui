# Server-driven lists & filters

Conventions for the Campaigns, Assets, Ideas and posts lists, their filters, smart groups and selections. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **The Campaigns list reads one batched query, never one per card.**
  `useCampaignSummaries` (`["campaigns","summaries"]`) returns a slim
  `PostSummary` per post for the whole workspace; `CampaignCard` runs
  `overviewModel` over it — the Overview's own stage, figures and rules, so a
  row can't disagree with the screen it opens. What the Overview reads per
  campaign (phase windows, the server's problems) the row goes without. Never reintroduce a per-card fetch —
  that was the N+1 CON-152 removed. See
  `docs/technical-decisions.md#batched-summaries`.

- **The asset list is the server's answer to the URL, a page at a time**
  (CON-371/374). `GET /api/content-bank/assets` filters, counts (`facets`),
  sorts and pages; the client never narrows, counts or re-sorts a list of
  assets, and nothing may load "every asset" to look something up — ask the
  query instead (`checksum=` for duplicates, `ids_only=true` for a whole
  match or a whole-bank pin, `scope_campaign` + `facets` for a campaign's
  tally). The Assets pages keep their filter in search params named exactly as
  the endpoint's (`lib/assetFilter`), so the address is the request. Rows are
  slim — no `content` — and live under `ASSET_LIST_KEY` (`['assets','list']`),
  which anything changing what a row shows must invalidate: idea verdicts,
  analysis events and campaign membership already do. **Grouping is the
  server's too** (CON-378/379): `group=` orders rows by group, each row
  carries `group_key`, and `groups` counts each group over the whole match,
  so a band never counts its loaded rows. The undecided total above the list
  is `ideas_undecided_total`, never a sum of rows. The grouping and the sort
  are in the address since CON-392 — a smart group (`/api/saved-views`,
  surface `assets`) stores both — and fall back to the device's preference
  (`settingsStore.assetGrouping`, `assetSort`) when the address names none.
  Dates travel as the server takes them: a preset as `updated=7d`, a custom
  range as days, both read in `tz`. The list is deliberately
  not virtualised, because its sticky group bands need the rows above the
  window to exist. See [`docs/assets-list.md`](./docs/assets-list.md).

- **The Ideas list is the server's answer to the URL too** (CON-388/389),
  by the Assets rules: `GET /api/ideas` filters, counts (`facets`, `piles`),
  groups and pages, and the page's search params are the endpoint's own
  (`lib/ideaFilter`) — with the pile, sort and grouping in the address as
  well, because a **smart group** (`/api/saved-views`, surface `ideas`) is
  that address saved, minus the pile. Never count or pile ideas on the
  client: the rail's figure is a `pile=waiting&limit=1` read. Both lists'
  filters are built from **one catalogue sentence per field and operator**
  over a per-list model and vocabulary (`lib/smartFilter`; CON-391 for Ideas,
  CON-392 for Assets), clauses in a fixed order — never a clause assembled
  from fragments. On every list — Ideas, Assets, the posts lists — each clause is a **pill** (`FilterPills`, `inline`) in the
  list's head line, after Filter, with `+ Add` and the clause panels
  (`FilterParts`); with nothing chosen the line is Filter alone, never
  "Showing all …"; a choice of three or more reads
  as its first value and how many more ("that are CSVs +9"), its full words
  the pill's name and tooltip.
  Both lists have smart groups through the same `SavedViewsMenu` and
  `useSavedViews(surface)`, on the workspace page only — as **Views at the
  line's end**, before Group and Sort, the open group's name leading the
  pills and closed there; there is no "All ideas" to pick. Both pages use the post
  page's scroll frame (CON-392): `PageHeader` sticky inside one `ScrollArea`,
  the whole page scrolling under it, `PageBottomFader` along the bottom.
  The campaign layout hands both sections their whole page.
  **The two lists are cards** (design/ideas-cards, `page-primitives/listCards`):
  two text sizes (14/20 read, 12/16 glanced at), a 4px rhythm, each card its
  own hairline-bordered surface 4px from the next, one 20px mark on the title
  line (an idea's fit as a ring on the red → yellow → green scale,
  `FitRing`, the number on hover). **Two strips, and only these pin**: the
  page header carries the tabs (the only counts) after the title and the
  page's add action (ADD IDEA lays the capture field over the whole header
  row, 4px past it on every side, with the assistant's send button; with no
  ideas yet it is simply open; Assets has one tab, Documents, and after it
  the ideas its documents hold still to answer), and **the list's head** is one line directly
  under it — the box over the boxes, Filter and the pills, then Views, Group
  and Sort ending flush with the cards' edge, all four controls in one voice
  and as tall as a pill so wrapping pills leave them on the first row — or
  the selection and its actions in their place. Group heads are their own surface, a step
  lighter than the page and quieter than a card, each with its own box, and
  scroll with their cards: a stack of pinned bars was too much header.
  **Selection is the mail-client pattern**: boxes always
  shown, faint until hovered; the head box takes the cards loaded and a
  half-ticked head box clears; a group's box fills its group; Shift extends
  a range; widening to every match is a separate, named step ("Select all
  46 ideas in …"); ticks survive switching piles and the head says how many
  are elsewhere. The actions sit in the head rather than in a floating bar.
  Bulk delete is
  `POST /api/ideas/bulk-delete` in batches of 500, and select-all is
  `ids_only`, capped at 5,000. An analysed idea's words are read-only (409
  `idea_read_only`); only its campaign may change.

- **The posts lists read one filter** (CON-472), a campaign's and the
  workspace's alike: `lib/postFilter`, the endpoints' own params (`status`,
  `platform` — the post's platform sqid —, `post_type`, `scheduled=yes|no`,
  `scheduled_after`/`scheduled_before` as days, `tz` only beside a date), in
  the list's address. **The calendars have no filter for now** (2026-11-23):
  they draw every post, their address carries none, and an assistant
  `set_filter` on `campaign.calendar` lands on the campaign's list
  (`destinationFor`). `GET /api/posts` takes the same params plus
  `campaign_id`, so the workspace's pages add a Campaign field
  (`campaign_id`/`campaign_id_not`), offering the live campaigns and every
  platform and post type they take; a campaign's list drops it from the
  address (`parseCampaignPostListSearch`), which already names the campaign. The pills are the Assets ones on a third model
  (`PostsFilterBar`: Filter, then the pills, ending "3 of 21"); the
  endpoint answers the whole match, unpaged and without facets, so the
  values carry no counts and the table still sorts on the client. A filtered
  read nests under `campaignPostsKey`, so post writes refresh it, but only
  the unfiltered list is patched and folds in streamed drafts. Every row
  ticked on the list goes to the assistant as `allMatching` plus the filter;
  the calendar sends the days on screen as its `window` (`calendarRange`),
  the cards in them as `visible`, and its ticks — a card's corner box, read
  through `CalendarSelectionContext` — as the selection. The calendar keeps
  its toolbar while posts are ticked; the bulk bar floats over the grid's
  foot, and a month day too busy for cards says how many of its posts are
  ticked (CON-486).
  Foundation's facts tick the same way (`useLibrarySelection`), as
  something to ask about: the bar clears and REMOVEs, asking first through
  `RemoveFactsDialog` — the row's trash asks the same way. A fact selection
  is held against the rows the tab and search show. Voices, audiences and
  series have no ticks and no bar (2026-11-23): each is a plain card that
  opens its entry, deleted from the entry's Danger Zone, and the list ends
  with a `NewCard`.
  Ticks clear when the filter in the **address** changes — the assistant's
  `set_filter` and its UNDO included — and on the calendar when the day or
  view the user chose does, not when the computed range shifts (CON-482). An
  assistant `select` ticks only the rows the list holds and reports how many
  (`useAssistantRequest` returning a count), which is what the rail's
  "Selected 2 posts" says — on a calendar the server keeps only the posts on
  screen (CON-486); the posts list marks a filter the assistant set until it
  changes (`viewContextStore.assistantFilter`).

- **The posts list is a header, a filter line and a table — nothing between.**
  Both lists, a campaign's and the workspace's, sit in `PostsListFrame`:
  ADD POST in the header's top-right (on the workspace list it asks which
  campaign in a modal), then Filter and its pills, then the table. There is
  no count line: the pills end "3 of 21" while a filter narrows the list, and
  with none there are no pills to say anything. **Group by** ends the line
  (`PostsGroupMenu`): by status, in the order a post moves through them, or —
  on the workspace's list — by campaign, by name; `group` sits in the address
  beside the filter, survives it, and is never sent. The table draws a head
  per group (`VirtualTable`'s `groupOf`), which folds it; the rows under each
  keep the table's sort. The bulk bar floats over the list's foot, as on the
  calendar. **What is wrong with a post is one column of marks** after Status
  (`lib/postWarnings`): read off the list payload alone — a failed or missed
  publish, no platform, no account it can publish as, outside its campaign's
  platforms or post types (CON-483), written without sources (CON-484) — and
  pressing a mark opens the drawer that says each in words. The editor's
  Quality checks need a fetch per post and stay in the editor, so a clean row
  is not a promise the post will publish. A filter that leaves nothing is the
  shared `smartFilter/NoMatches`: a washed sketch of the list, the
  illustration, and the one removal that brings the most back.
