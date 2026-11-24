# Campaigns & series

Conventions for campaign payloads, membership, archiving, post goals, phases, series and content formats. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **A campaign update is a whole-resource PUT, and the server defaults every
  field the payload omits.** Leaving `publishing_days` out does not preserve the
  campaign's publishing days — it resets them to all seven, same for the rest of
  the CON-181/182 columns. Always build the payload through `campaignToPayload`
  (`lib/campaignPayload.ts`), which round-trips the server's own values and
  takes only the fields you mean to change as overrides. Two fields are the
  exception, and the payload leaves them out on purpose: `use_assets` and
  `asset_ids` are presence-aware since CON-233, so omitting them is what
  preserves them — see the next bullet.

- **A campaign's documents are attached and detached, never restated**
  (CON-233). `POST /api/campaigns/:id/assets` unions ids in; `DELETE
  …/assets/:assetId` takes one out; both are a single atomic UPDATE of one
  column, both answer with the campaign, and both derive `use_assets` from the
  set they leave behind — so the client never computes that flag and never
  writes an empty list, which the server still reads as *every asset in the
  workspace*. This is why `campaignToPayload` omits the pair: an autosave that
  restated the set from the snapshot its form was built on would put a stale
  copy back over an attach that had just landed. It is also why
  `lib/campaignMembership` no longer has a write queue, a pre-write re-read or
  a whole-record PUT — the server serialises these across tabs and users, which
  is further than a queue in one tab could reach. The one thing that module
  still does by hand is the pre-CON-210 whole-bank state (`use_assets: true`
  over an empty set, meaning everything): the endpoints can only union and
  subtract, so an attach to a campaign in that state has to carry the bank
  along or it would silently narrow the campaign to the one new document.

- **A campaign is archived or deleted — it has no status** (CON-156). `draft`
  and `active` both meant active and nothing ever showed either, so the client
  no longer models `status` at all and the server creates every campaign
  active. What replaced it is a lifecycle with its own endpoints: `POST
  …/:id/archive` and `…/unarchive` (204, idempotent, deliberately not a field on
  the PUT so archiving can't ride along with an edit), and `GET /api/campaigns`
  which returns the active set unless asked for `?archived=true`. The two lists
  are separate query keys — an archived campaign must never reach the sidebar
  or seed `useCampaign`. `DELETE` is a soft delete server-side, but that row is
  our safety net and not an undo: there is no restore anywhere, so never write
  copy that hints at one.
  **On screen the archive is a drawer, not a view.** It is a `Collapse` closed
  at the foot of the Campaigns list, below the active cards — deliberately no
  longer an icon in the top-right, because that corner switches between two
  ways of looking at the same work and this is a small pile at the end of the
  list. It renders only when there is something in it (the two exceptions, and
  why, are on the component). The `?archived=true` search param survives with a
  new job: it *opens* the drawer on arrival, which is what archiving redirects
  to, so the campaign that just left the list is seen landing in the pile
  rather than appearing deleted.
  **Archive and delete sit together in one Danger Zone**, and the card's copy
  is general — each button opens a modal carrying its own consequences, which
  is where someone about to act will actually read them. **The same two, and
  the way to Settings, also end the campaign's menu in the top bar**
  (`CampaignSwitcher`): someone who has opened a test campaign and wants rid of
  it reads the campaign's name, not the gear at the foot of the rail, and the
  Danger Zone is a scroll below that. **And each row of the Campaigns list
  has them behind three dots** (`CampaignCard`), laid over the row's corner
  as a sibling of its link, since a test campaign is most often got rid of
  from the list it clutters. All three open `useEndCampaign`'s modals, so the
  consequences are written once.

- **The campaign's `estimated_post_count` is a rate, not a total.** Since
  CON-182 it means "this many posts per `goal_cadence` period" (`week`/`month`),
  and the server backfilled every campaign to `month` — so an old total of 12 on
  a three-month campaign now plans 36 posts. Read it through `lib/postGoal`
  (`postGoalTotal`), never as a campaign total.

- **A campaign's phase windows are the server's, and the type locks once they
  are used** (CON-166). `GET /api/campaigns/:id/phases` answers each phase of
  the type with an inclusive window — the even split of the campaign dates
  (`derived`), a hand-edited plan (`manual`), or no dates yet
  (`unscheduled`) — and that split is what content generation plans into, so
  the client never works one out. `CampaignPhasesCard`, in Strategy's second
  column, only moves the boundary between two phases — from the
  "Ends [date]" button on each row but the last, whose end is the campaign's (`lib/phasePlan`), which keeps the plan back
  to back, and PUTs it **whole**; `DELETE` is "split evenly again". The query
  sits under the campaign's key, so every campaign save re-reads it — which is
  how a save the server answered with `phase_plan_reset: true` (a type change,
  or dates that left a phase no days) shows up. `type_locked` on the campaign
  is computed, not latched: it holds while any post has a phase, disables the
  picker, and a stale screen that sends a new type anyway gets 409
  `campaign_type_locked`, worded from the catalogue with the type put back and
  the rest of the form left dirty. A post's phase is `null`, never `""` — the
  server refuses the empty string, and a phase from another type is a 400.

**Series and content formats are two flags, and the split is the design**
(CON-264; both off, and both backed — `series` since CON-496/508 and
`content-formats` since CON-329 — each waiting only on its live re-test). The word people arrive with
is *content pillar*, which means at least four different things; what is modelled
is the **recurring named segment with a recipe** — the only reading a generator
can act on and the only one analytics can group by. A broad theme collapses into
it without a second table ("People who made an impact" is a series with a
person-shaped subject slot). Two lines to keep sharp. A **series is durable**,
re-read every time it produces a post, which is what makes it Foundation
material; an **idea is inventory**, captured and spent, which is why Ideas is its
own module. And a series carries **no tone** — how it sounds is the voice's job,
and a second place to say it is a conflict the generator would have to resolve.

The definition is the workspace's (`/foundation/series`) and the **run is the
campaign's**, which is where all the work happens: a campaign picks series up and
gives each one a rhythm on **Strategy**, in `CampaignSeriesCard` under the brand
card. That card was a band on the campaign's Foundation page until CON-305 —
PR #139 turned the documents into their own module and deleted the page out from
under it — and the reason Strategy is not the wrong home is arrangement rather
than distance: **the mix is derived, never typed** (`lib/seriesPlan`), and the
sentence stating it is printed **once**, by `SeriesShareLine` under the post goal
it is a share of. The card carries the per-series claims that sentence sums and
never the total. A campaign may define a series locally and promote it once it
proves it recurs, which is what fills the library from use.

Formats are a **vocabulary, not a library**: a fixed table in
`lib/contentFormats.ts` and a picker, with no page, no CRUD and no empty state. A
bare label already carries a recipe because the vocabulary is shared with the
model, which is why it needs no instruction field and why it is a separate flag —
it pays off in a workspace that has never opened the Series page. It is **not**
`platform_post_type`: that is the container (carousel, reel, thread), this is the
rhetorical shape, and the two never decide the same thing. Optional everywhere,
and nothing warns about a post without one. A post's format is
`content_format` on the post itself (CON-329): presence-aware on the PUT,
restated by `postToPayload` like the first comment, a 400 for `""` or an unknown
slug, and inside CON-251's lock — so the picker is disabled on a submitted post.

**Series are backed by the API** (CON-496/508): `/api/series` for the library
and each campaign's own, and a campaign's runs **attached, detached and
re-rhythmed one at a time, never restated**, for the reason CON-233 gives about
`asset_ids`. `services/api/series.ts` maps the wire onto `types/series`. A
rhythm is `{times, per, every?, weekday?}` — a day only at once a week — and
**what a run claims is the server's `seriesplan.Days`, ported** into
`lib/seriesPlan` (`seriesDays`): weeks are 7-day spans from the campaign's
start, months calendar months, `every` counts from the first period, a
weekday's part-week without that day gets nothing, and an undated campaign
claims nothing. No endpoint returns a claim, so when the two disagree the port
is the bug. Ideas and posts carry `series_id` (`SeriesMark`), which the post
PUT reads presence-aware and `postToPayload` leaves out; idea slots wait on it
(CON-512). Analytics by series is still to come. All of it — the marks, the
posts table's Series column and the calendar settings' series day included —
stays behind the `series` flag until the live pass. One move stays
deliberately open (CON-305 decision 1): series could be its own module,
`/series` and `/campaigns/:id/series` — a filtered place in the one menu, which
is what documents just did and what the nav rule would prefer over a card on
Strategy. `CampaignSeriesCard` takes a campaign and nothing else, so making
that move is a re-parent plus one place in `lib/campaignScope` rather than a
rewrite.

- **The campaign Overview is its time cards, with one list beside them.** The
  wide column holds the progress card from planning to closing — the stage
  and today's phase on the left, the day and the dates on the right, then a
  bar of published against scheduled (the last and next 30 days; the whole
  campaign against its goal when one is set, which is the lesser case) with
  the pace under its end, in the cards' own figures — then what goes out
  (this week; the first week while planning; the results once it is over)
  and, while it runs, the analytics page's own overview card narrowed to the
  campaign: reused, never a second set of stats drawn for the Overview. The
  narrow column is the one list of what wants the user, the server's problems
  and the client's rules together, held on screen while the time cards are
  read and scrolling inside itself when it is longer than the screen. A
  figure goes in a time card, a thing to do in the list, and anything that
  takes more than a glance belongs on the page the row links to. The columns
  answer to the page's width through a container query, and on a narrow page
  the list comes last.
  **The wide column ends with a door to every other place**, straight under
  the cards (`OverviewDoors`, from `lib/campaignDoors`) — no card is stretched
  to the list's height any more: the rail's glyph and name, and one line saying whether
  that part is set — a tick, an open ring for what wants something first, no
  mark where there is nothing to finish. Read across it is the campaign's
  checklist; it reads only what the Overview already holds, plus one count of
  the campaign's waiting ideas. Settings rides on its heading row.
