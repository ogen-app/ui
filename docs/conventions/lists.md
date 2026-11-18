# Server-driven lists & filters

Conventions for the Campaigns, Assets, Ideas and posts lists, their filters, smart groups and selections. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **The Campaigns list reads one batched query, never one per card.**
  `useCampaignSummaries` (`["campaigns","summaries"]`) returns a slim
  `PostSummary` per post for the whole workspace; `CampaignCard` runs the same
  `lib/campaignReadiness` rules over it. Never reintroduce a per-card fetch —
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
  filters are **a sentence you edit** — one
  `components/smartFilter/FilterSentence` over a per-list model and sentence
  vocabulary (`lib/smartFilter`; CON-391 for Ideas, CON-392 for Assets): one
  catalogue sentence per field and operator, clauses in a fixed order, joined
  by `formatListParts`, and on Assets the type is the subject ("Showing
  PDFs, in …"). Never assemble a clause from fragments. Both lists have
  smart groups through the same `SavedViewsMenu` and `useSavedViews(surface)`,
  on the workspace page only. Both pages use the post page's scroll frame
  (CON-392): `PageHeader` sticky inside one `ScrollArea`, the whole page
  scrolling under it, `PageBottomFader` along the bottom, and group
  bands pinning at the header's foot through `page-primitives/pinnedBands` —
  always at least one band ("No grouping"), in the page's own colour, capped
  behind the header while pinned. The campaign layout hands both sections
  their whole page. Bulk delete is
  `POST /api/ideas/bulk-delete` in batches of 500, and select-all is
  `ids_only`, capped at 5,000. An analysed idea's words are read-only (409
  `idea_read_only`); only its campaign may change.

- **A campaign's posts list and calendar read one filter** (CON-472):
  `lib/postFilter`, the endpoint's own params (`status`, `platform` — the
  post's platform sqid —, `post_type`, `scheduled=yes|no`,
  `scheduled_after`/`scheduled_before` as days, `tz` only beside a date), in
  the address of both pages and carried across WEEK/MONTH and the bare
  calendar redirect. The sentence is the Ideas one on a third model; the
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
  ticked (CON-486). The sentence counts the days on screen, idea slots hide
  under a filter, and the Not scheduled panel reads the same filter.
  Foundation's voices, audiences, facts and series tick the same way
  (`useLibrarySelection`), as something to ask about: their bar clears, and
  on facts it also REMOVEs, asking first through `RemoveFactsDialog` — the
  row's trash asks the same way. A fact selection is held against the rows
  the tab and search show.
  Ticks clear when the filter in the **address** changes — the assistant's
  `set_filter` and its UNDO included — and on the calendar when the day or
  view the user chose does, not when the computed range shifts (CON-482). An
  assistant `select` ticks only the rows the list holds and reports how many
  (`useAssistantRequest` returning a count), which is what the rail's
  "Selected 2 posts" says — on a calendar the server keeps only the posts on
  screen (CON-486); the posts list marks a filter the assistant set until it
  changes (`viewContextStore.assistantFilter`).
