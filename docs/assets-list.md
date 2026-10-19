# The Assets list (CON-370, CON-371, CON-378)

`/assets` and `/campaigns/:id/assets` (`ContentList` → `AssetList` →
`AssetListRow`). The list describes what each document *offers* rather than
its storage record, and since CON-378 it leads with the ideas: which
documents still have some waiting, and what the next one is.

## Where the rows come from

Everything on this screen is the server's answer to one query,
`GET /api/content-bank/assets` (CON-374). The client never filters, counts or
sorts a list itself.

- **The URL is the query.** The page's search params use the endpoint's own
  keys (`?kind=pdf&tag=<id>,<id>&ideas=undecided`), parsed by
  `parseAssetListSearch` in `lib/assetFilter`. Two values are kept in words
  rather than instants, so a shared link means the same thing tomorrow:
  - `updated_after=7d` stays a preset;
  - a custom range is two days.
  `toRequestParams` turns both into absolute bounds in the viewer's time zone,
  at request time. The filter is per tab and never goes in `/api/settings`.
  The sort and the grouping are not in the URL: they are how this person
  reads the list, kept per device (`settingsStore.assetSort`,
  `assetGrouping`) and shared by the bank and every campaign's page.
- **Paging:** `useAssetList` fetches 50 rows at a time, and the list asks for
  the next cursor as its foot comes into view (an `IntersectionObserver` in
  `AssetList`). The previous rows stay on screen while a new question loads.
- **Not virtualised.** The group bands are `position: sticky` inside the
  list's own scroller, and a virtual window would not mount the band of a run
  that began above it. Rows are fifty to a page, so the DOM stays small.
- **Sorting** is a server parameter, chosen from the Sort menu (there are no
  column headers). The menu offers each field both ways, in pairs with an
  inset rule between them: recently / least recently updated, newest / oldest
  added, title A–Z / Z–A (`SORT_PAIRS`). Newest first is the default.
  Searching inside the documents adds Best match, which is then the default.
  The server's `-ideas_undecided` is not offered.
- **Grouping** is a server parameter too (`group=`, CON-379); see below.
- **On a campaign's page** the request carries `scope_campaign`. Totals and
  counts are then the campaign's, and Campaign is not offered as a field.
- **The rows are slim:** no `content`. So a note or a page no longer states its
  word count; the full asset stays at `GET /:id`.

## The view bar and grouping

Between the filter bar and the list (`AssetViewBar`):

- **"29 ideas in 6 documents are waiting for a verdict."** The ideas are the
  response's `ideas_undecided_total`, summed by the server over the whole
  match; the documents are `total`, the filtered count or all of them. The
  figure links to Ideas (the campaign's, on a campaign's page). With none
  waiting, the sentence is left out.
- **Which reading counts** is the server's (CON-380): one lens per context,
  the workspace's in the bank and the campaign's on a campaign's page. The
  counts, the next idea, the undecided total, the ideas filter and sort, the
  gist and the analysis status all read it. So on a campaign's page a document
  whose campaign lens hasn't run reads as not analysed, with no pill and no
  summary, even when its workspace lens is ready.
- **Group by:** Date added (the default), Campaign, Tag, Type, or No grouping.
  In the URL as `group` since CON-392, because a smart group stores it; with
  none in the address the device's preference (`settingsStore.assetGrouping`)
  decides, and choosing one updates both. `none` is ours and never sent. A campaign's own page has no
  Campaign grouping, and falls back to Date added there. The server's `ideas`
  grouping is not offered.
- **Sort:** as above.

The server orders rows by group first, adds `group_key` to each row, and
answers `groups`: every group's key and count over the whole match, in display
order. So a band says how many it holds even when its rows run onto the next
page.

- **Date added** groups are Today, Past week, Past month and Earlier: disjoint
  bands, unlike the `updated` presets.
- **Tag** lists a document once per tag, so the same row can appear under two
  bands, and `groups` counts appearances while `total` counts documents.
- A band is drawn whenever the list is grouped, even for a single group: it is
  what says the list is grouped, and by what.
- Bands are `<h2>`s, sticky, and fold on a click. What is folded is kept per
  device (`settingsStore.collapsedAssetBands`), never in `/api/settings`.

## The filter sentence

Since CON-392 the filter reads as **a sentence you edit** — the Ideas page's
(CON-391), one `smartFilter/FilterSentence` over the Assets model
(`smartFilter/assetModel`) and its sentence vocabulary
(`smartFilter/useFilterVocabulary`):

> **[All assets 24 ▾]** Showing *PDFs or web pages*, in *Hotel de Russie*,
> tagged *Gartner*, updated *in the last 30 days* **+ add a detail** · 6 of 24 ·
> Clear · Save as group

- **The type is the subject.** Kept, it names what is listed ("Showing PDFs,
  in …"); left out, the sentence falls back to "Showing assets that aren't
  PDFs". With nothing chosen it reads "Showing all assets".
- **Clauses, in a fixed order:** type, campaign, tag, title, status, updated,
  ideas, text — each one catalogue sentence per field and operator
  (`content.sentence.clause.*`), values joined with "or", clauses joined by
  `formatListParts`.
- **A clause's panel:** the question, a two-word switch (tagged / not
  tagged…), a find field for long lists, the values with the response's
  `facets` (disjunctive per field, shown for the kept operator only; zero
  dimmed), Remove this detail and Done. "Updated before" takes a day: the
  endpoint reads no preset as an upper bound.
- **+ add a detail** offers the starters, or, once something is typed, both
  searches — *mentioning "…"* (inside the documents) and *with "…" in the
  title* — with counts, then every tag or campaign whose name matches.
- **Keyboard:** `/` starts a detail from anywhere, ↑↓ move, ↵ picks,
  Backspace on an empty detail removes the last clause, Esc closes.
- **No results:** `NoMatches` asks the server what removing each clause would
  leave, and offers the best removal, with the count, as the primary action.
  This is state, not an `Explainer`.

## Smart groups

The workspace page's Views dropdown opens the sentence's line (CON-392): All
assets, then the groups (`/api/saved-views`, surface `assets`, CON-393), each
with its `total`. A group is the address saved — the filter, `sort` and
`group`, canonical (`assetViewQuery`) — never a list of documents. Open, the
button names it; edited, it says so and the line ends with Save changes (when
`can_edit`), Save as new… and Revert. Clear is hidden while a group is open.
A campaign's page has none. The counts sit under the list's key
(`ASSET_VIEWS_KEY`), so whatever refreshes the list refreshes them.

## Selection

Select all is a checkbox at the start of the Group by / Sort line, lined up
horizontally with the rows' checkboxes — where it sits on Ideas. It selects **every match**, not the rows
loaded so far, by asking `ids_only=true` with the same parameters (without
`group`). It shows a dash while some are selected, and clicking it when all
are clears the selection. Bulk tag and bulk delete then act on all N, and the
delete confirmation names N.

- A row's checkbox shows on hover and focus, and on every row once anything
  is selected.
- Changing the filter empties the selection; changing the sort or the
  grouping does not.
- Delete is one request per id (the API has no bulk delete). `useDeleteAssets`
  runs six at a time and refetches once at the end.

## A row

Four columns, three of them fixed: the checkbox; the text, capped at its
measure (`72ch` plus the indent under the icon) so widening the window never
re-wraps it; the pill alone (160px), 48px after the text so the count reads
with the next idea's name; a spacer that takes the slack; then what the
document belongs to (168px, plus 40px kept clear for the bin) at the far edge:
its campaigns, one to a line with their mark, then 10px below them its tags. A
document in no campaign shows nothing there for it. Below the `@4xl` container
width the campaigns and tags fold under the title on one wrapping line,
campaigns first, the spacer goes, and the pill's column (200px) keeps the bin's
room instead.

- **Kind:** a bare 28px Hugeicons mark before the title (`AssetKindMark`),
  from the row's `kind`, stroke 1.25, in muted ink (`--kind-*` in
  `index.css`, CON-382): PDF brick, document blue, spreadsheet and CSV green,
  slides terracotta, all at one lightness and each over 4.5:1; web pages,
  recordings, notes and anything else neutral grey, their glyphs being
  distinct enough. Only the four file types people already know by colour
  get one, and none of them may outshout the teal idea counts. An image puts
  its thumbnail there instead. The checkbox is top-aligned with the mark.
- **Title:** an `<h3>`, written as words (`listTitle`): URL-encoding decoded, a
  file's extension dropped, underscores and hyphens read as spaces, and a
  page's " - InfoQ" suffix dropped when the row shows its domain.
- **Facts:** one line, "94 pages · added 2 days ago", then a chip with a clock,
  "published last year", when the source's metadata said when
  (`published_at`). They are two facts, so both show (`rowDates`), each with
  its exact date as the tooltip. No kind word: the mark already says it. A
  page names its domain, a recording its duration; a partial read adds its
  status.
- **Summary:** the analysis gist, two lines at most; during a Text mentions
  search, where it matched instead (`MatchSnippet`).
- **The idea line** (`rowState`):
  - With ideas waiting: the next one by name (`next_idea`, the best-fit
    undecided idea, chosen by the server since CON-385) and "and N more", one
    link under one underline, opening the asset on its undecided pile.
    Hovering or focusing the line opens a light card after it, 416px wide and
    lifted by a shadow, listing all of the asset's ideas best fit first, so
    the row's own idea heads it (`lib/ideaFit`'s `byFit`: unscored
    last, then oldest first, as the server picks `next_idea`). Each idea is
    its score on a track (`FitTrack`: a pill on a 64px line from pale sage at
    100 to pale sand at 10, its 2px ring the line's colour where it sits, a
    dashed empty line when unscored), its title at 12.5px, its verdict as a
    mark alone on the right (the pill's marks and colours; a postponed idea
    whose day has come is undecided again; the word is the mark's name and
    tooltip), and up to two lines of its note. The list stops at five and a
    half ideas and scrolls past that, every idea included (no "and N more"),
    with the rail's edge fades (`SurfaceFader`): the foot while anything is
    below, the head once anything has scrolled above. The card stays open
    while the pointer is on it, so it can be scrolled. Opening downward, the card's first title is level with the
    row's idea line; when the line sits in the lower part of the screen the
    card opens upward and its last line is level with it instead, or its foot
    when the list scrolls. The ideas
    come from the same reading as the counts (the workspace's lens in the
    bank, the campaign's on a campaign's page), read from `GET /:id/analyses`
    only on first hover.
  - Reading: "Reading this file." with a spinning icon while ingest or
    analysis runs. No pill and no summary yet.
  - Failed: "We couldn't read this file." with the reason worded from
    `failure_code` (`ingestFailureMessage`), then "Upload it again, or delete
    it." Nothing re-runs a PDF, so there is no retry.
  - Read with no ideas: "Read, but no post ideas came out of it." with
    Analyse again (`POST …/analysis/retry`).
  - Never analysed, or the analysis failed or was skipped: nothing, rather
    than a claim of "no ideas".
- **Tags:** rounded chips in their own column.
- **Ideas:** the verdict pill (`VerdictPill`), at 1.2× its first size.
  - One segment per verdict, icon and count, always in the order Undecided ·
    Yes · Not now · No. Verdicts with no ideas are left out. Undecided is the
    only teal, so a row with no teal is finished.
  - The tooltip, which is also the pill's accessible name, spells the counts
    out. A segment opens the asset page on that pile (`?verdict=`).
- **Campaign:** at the top of the far-edge column, above the tags, each with
  its `CampaignMark` and cut short rather than wrapped. On a campaign's own
  list only the others are named. A document in no campaign says nothing:
  "No campaign" is the filter's word, not the row's.
- **Bin:** an 18px `Delete02Icon`, no box, at the row's top-right on the
  checkbox's line. It shows on hover or focus only, and on touch screens, and
  goes through `DeleteDocumentsDialog`. The bin and the checkbox fade in
  (opacity, ease-out, 200ms; none with reduced motion).

## The asset page's piles

Above the ideas, the asset page shows the same verdicts with their words as filters (`AssetIdeaList`), driven by `?verdict=`. Choosing "No" is the one way to see the answered-no ideas again. Choosing the active pile again clears the filter.

## Wireframes

### Ideas first (CON-378)

The wireframe CON-378 was built from, with illustrative data. Its numbered
notes are the decisions above.

![Ideas first](assets-list/ideas-first.png)

### The smart filter (CON-371)

![The flow: field, operator, value, token, stepping back](assets-list/filter-1-flow.png)
![Typing without choosing a field](assets-list/filter-2-free-text.png)
![The value step, field by field](assets-list/filter-3-value-step.png)
![Filters applied](assets-list/filter-4-applied.png)
![Nothing matches](assets-list/filter-5-no-matches.png)
