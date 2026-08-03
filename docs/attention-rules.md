# Attention rules

The rule set behind the **"Needs attention"** rail on the Campaign Overview
screen (CON-120). This file is the contract: a rule exists here before it exists
in code, and `src/lib/campaignReadiness.ts` implements exactly what is listed
below — nothing more, nothing else.

## What the rail is for

One glance, one question: *what does this campaign need from me right now?*

- It is a **to-do list, not a report.** Every item names something the user can
  act on, and links to the one place where they can act.
- **Absence is the reward.** No items → the card keeps its place, but it is
  retitled for the verdict rather than the section: *"You're all set"* and one
  line of body copy — no badge, the title is the status. Reaching zero is an
  achievement and
  should read like one, not like an empty table. Never fill it with per-area
  "all good" rows — the empty state is one card, not a checklist of things that
  are fine.
- It **aggregates**: `"3 posts failed to publish"`, never three rows of one post
  each. The rail says how much and where; the section says which.
- It **does not duplicate a module.** If the whole story is already legible in
  the Brief/Content/Setup card, it does not also need a rail row — a rail row
  earns its place by being time-sensitive or by pointing somewhere the user
  would not otherwise look.

## Classification

Every rule carries four labels.

### Severity — how the row reads and where it sorts

| Severity | Meaning | Dot |
| --- | --- | --- |
| `alert` | Already wrong. Something failed, or a moment passed unused. Value is being lost right now. | `bg-destructive` |
| `risk` | Not wrong yet, but it will be, on a known clock (hours/days). | `bg-chart-5` |
| `todo` | A gap with no deadline. The campaign is simply not finished being set up. | `bg-chart-5` |
| `info` | Quality/hygiene nudge. Safe to ignore forever. Shown last, and first to be cut when the list is long. | `bg-senary-foreground` |

Sort order is severity first (`alert` → `risk` → `todo` → `info`), then the
catalogue order within a severity. Catalogue order encodes the sequence a user
would naturally work through, so it is a product decision, not an accident —
keep new rules in a deliberate position rather than appending.

### Family — the area of the product it belongs to

`delivery` (D) · `connectivity` (C) · `drift` (X) · `setup` (S) ·
`content` (K) · `hygiene` (H).

### Source — where the truth comes from

| Source | Meaning |
| --- | --- |
| `client` | Derivable today from data the screen already fetches: `GET /campaigns/:id`, `GET /campaigns/:id/posts`, `GET /platforms`. |
| `server` | Needs data the API does not expose yet. Listed in [Asks for the backend](#asks-for-the-backend); not implemented until then. |
| `server-owned` | Client-computable, but the rule mirrors server behaviour (worker timing, publish validation) and should move server-side once the endpoint exists. Implement client-side meanwhile, and flag the duplication in code. |

### Clock — whether the rule depends on the current time

Time-dependent rules take `now` as an explicit parameter (never call
`Date.now()` inside a rule) so they are testable, and the screen must recompute
them on focus/refetch rather than trusting a long-lived memo.

## Catalogue

### Delivery — is content actually going out

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `failed-posts` | `alert` | any post `status = failed` | *N posts failed to publish* | posts | `client` | – |
| `manual-publish-due` | `alert` | `status = scheduled_for_manual_publishing` and `scheduled_at <= now` | *N posts are waiting for you to publish* | posts | `client` | ✓ |
| `auto-publish-overdue` | `alert` | `status = scheduled` and `scheduled_at < now - 15min` | *N posts missed their publishing slot* | posts | `server-owned` | ✓ |
| `not-published` | `alert` | any post `status = not_published` | *N posts were never published* | posts | `client` | – |
| `publish-blocked-soon` | `risk` | post publishing within 24h whose content fails its channel's publish validation | *N posts due today aren't valid for their channel* | posts | `server` | ✓ |
| `planned-today-unscheduled` | `risk` | `status ∈ {draft, ready_for_publish}` with `scheduled_at` within the next 24h | *N posts planned for today aren't scheduled yet* | posts | `client` | ✓ |
| `pipeline-gap` | `risk` | campaign live (`now` inside start/end) and nothing scheduled or published in the next 7 days | *Nothing scheduled for the next 7 days* | posts | `client` | ✓ |
| `slot-collision` | `info` | two or more posts on the same channel within 15 minutes of each other | *N posts share a slot on `<channel>`* | posts | `client` | – |

**Why the overdue cases split in two.** `manual-publish-due` is a task — the
user has to go and post it, and the row is the reminder. `auto-publish-overdue`
is a symptom — the publisher worker should have done it and did not, so the row
is a warning that something is stuck. Same data, different meaning, different
wording; do not merge them. The 15-minute grace on the auto case absorbs normal
worker latency and the in-flight window of a `cancel`; reconcile the number with
the worker's poll interval when the backend confirms it.

### Connectivity — can we publish at all

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `accounts-missing-blocking` | `alert` | a selected channel has **no connected publisher** *and* has posts scheduled | *`<channel>` has N scheduled posts but no connected account* | workspace settings | `client` | – |
| `account-inactive` | `alert` | a **connected** publisher for a selected channel has accounts and every one is `is_active = false` | *`<channel>`'s account is inactive* | workspace settings | `client` | – |
| `no-connected-channel` | `todo` | channels are selected and **not one** of them has a connected publisher | *No channel has a connected account* | workspace settings | `client` | – |
| `no-post-types` | `todo` | at least one channel is connected and **not one** connected channel has a `post_types` selection | *No post type selected for `<channels>`* | settings | `client` | – |
| `account-expiring` | `risk` | a connected account's credentials expire within 7 days | *`<channel>`'s connection expires in N days* | workspace settings | `server` | ✓ |

**Not a rule: an individual unconnected channel.** Selecting LinkedIn and
connecting it next week is a plan, not a defect; a campaign may deliberately run
on one of the five channels it has selected. The rule set only asks whether
*anything* can publish — `no-connected-channel` — and escalates a specific
channel to `accounts-missing-blocking` once posts are actually queued on it. The
review runs one way only: a connected channel the campaign did not select is
never mentioned.

`no-connected-channel` and `no-post-types` are a sequence, not an escalation
pair: nothing connected is the earlier gap and suppresses the later one.

`/platforms` cannot tell "never connected" from "was connected, now dropped" —
both arrive as `connected = false`. So `account-inactive` covers only the case we
can actually name: a publisher that *is* connected whose accounts are all
explicitly inactive. An empty `accounts` array means the payload didn't say, and
must not fire the rule.

### Drift — do the settings and the content still agree

A campaign is edited long after its posts are made: a channel is de-selected, a
post type is dropped, the dates move, the campaign type is switched. The posts
do not follow. Nothing in the product reconciles the two, so the mismatch is
invisible until something publishes where it shouldn't — **the publisher never
consults `target_platforms`**; it publishes the post's own `platform_id`.
De-selecting a channel changes the plan, not the queue.

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `channel-dropped-scheduled` | `alert` | posts scheduled on a channel no longer in `target_platforms` | *N posts are scheduled on `<channel>`, which is no longer a campaign channel* | posts | `client` | – |
| `channel-dropped` | `todo` | unscheduled open posts on a channel no longer in `target_platforms` | *N posts target `<channel>`, which is no longer a campaign channel* | posts | `client` | – |
| `scheduled-outside-window` | `todo` | `scheduled_at` outside the campaign's start/end | *N posts are scheduled outside the campaign dates* | posts | `client` | – |
| `post-type-dropped` | `todo` | a post's `platform_post_type` is not in its channel's selected `post_types` | *N posts use a post type the campaign no longer includes* | posts | `client` | – |
| `phase-orphaned` | `todo` | a post's `campaign_type_phase_id` is not a phase of the current campaign type | *N posts sit in a phase the `<type>` plan doesn't have* | posts | `client` | – |

Only **open** posts count. A published post on a de-selected channel is
history, not a problem — there is nothing to fix and no way to unfix it. Same
for the phase and post-type rules: they ask "what will go out wrong", not "what
went out under old settings".

`channel-dropped-scheduled` and `channel-dropped` are one escalation pair, per
channel: with a queue behind it the drift is an alert, without one it is
cleanup. A channel never produces both rows.

The whole family is suppressed while `target_platforms` is empty — a campaign
with no channels selected has *every* post adrift, and `channels` is the row
that says so.

**Not a rule: assets.** `use_assets` going false, or an asset leaving
`asset_ids`, does not invalidate a post that already used it — `used_asset_ids`
records what the post was built from, and that stays true. Drift needs a
*future* consequence to be worth a row.

### Setup — is the campaign configured

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `brief-empty` | `todo` | all four brief fields blank | *The brief is not filled in* | brief | `client` | – |
| `brief-partial` | `todo` | some brief fields blank | *Brief is missing: `<fields>`* | brief | `client` | – |
| `dates` | `todo` | `start_date` or `end_date` missing | *Campaign dates are not set* | settings | `client` | – |
| `channels` | `todo` | no `target_platforms` | *No channels selected* | settings | `client` | – |
| `post-target` | `info` | `estimated_post_count` unset while the campaign has content | *No post target set* | settings | `client` | – |

`brief-empty` and `brief-partial` are mutually exclusive, as are `channels` and
the connectivity rules — a campaign with no channels does not also get told its
channels are unconnected.

There is deliberately **no rule about content sources**. `use_assets = true`
with an empty `asset_ids` looks like an unfinished setup but is the *All assets*
mode, where an empty list means every ready asset (CON-118; see
`src/lib/campaignSources.ts`). A rule there would nag every campaign that chose
the broadest option.

### Content — is there enough of it, in the right places

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `no-posts` | `todo` | zero posts | *No posts yet* | posts | `client` | – |
| `ready-not-scheduled` | `todo` | any post `status = ready_for_publish` | *N posts are ready but not scheduled* | posts | `client` | – |
| `nothing-scheduled` | `todo` | drafts exist, nothing is scheduled or published, and `pipeline-gap` did not fire | *N drafts, nothing scheduled yet* | posts | `client` | ✓ |
| `channel-uncovered` | `todo` | a selected **and connected** channel has no posts | *No posts for `<channel>` yet* | posts | `client` | – |
| `behind-pace` | `risk` | share of the campaign elapsed exceeds share of planned posts published by more than 25 points | *Campaign is N% through, M% published* | posts | `client` | ✓ |

`no-posts` suppresses every other content rule, and `pipeline-gap` too — an
empty campaign gets one row, not six.

`pipeline-gap` suppresses `nothing-scheduled`: on a live campaign both say
"nothing is going out", and the risk row says it with a deadline attached.

`behind-pace` measures against `estimated_post_count` when there is one and
against the posts that exist otherwise, so it still means something before a
target is set. It only runs while the campaign is live.

`channel-uncovered` only counts channels that could publish today. Asking for
content on a channel with no connected account is asking for posts with nowhere
to go — `no-connected-channel` is the row that applies there.

**Not a rule: a phase with no content.** Phases come from the campaign type,
which is chosen in the brief; how the user distributes content across them is
editorial, and a type with no phases at all (evergreen) is a normal setup rather
than an empty plan. Only `phase-orphaned` survives, because a post pointing at a
phase the current type doesn't have is broken data, not a choice.

**Not a rule: progress against the target.** *"12 of 20 planned posts"* is a
number, not a task — there is nothing to fix, and it would fire on nearly every
healthy campaign. It lives in the Content module's total tile instead. Same test
for any future candidate: if the row would be true most of the time, it belongs
in a module, not the rail.

### Hygiene — quality nudges

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `campaign-ended-open-items` | `todo` | `end_date` passed and non-terminal posts remain | *Campaign ended with N unpublished posts* | posts | `client` | ✓ |
| `stale-drafts` | `info` | draft not updated in 14+ days | *N drafts untouched for two weeks* | posts | `client` | ✓ |
| `missing-media` | `info` | post on a channel that requires media has no `media_urls` | *N posts need an image for `<channel>`* | posts | `server` | – |

## Rules about the rules

1. **One row per rule per campaign.** A rule that would fire per channel or per
   phase aggregates its subjects into one row (`<channel>` placeholders are
   joined: *"No posts for Instagram, LinkedIn yet"*).
2. **Mutual exclusion is explicit.** Escalation pairs (`channel-dropped*`) and
   suppression parents (`no-posts`, `channels`) are named in the catalogue. A
   new rule must state which existing rule it defers to, if any.
3. **Cap the list.** Show at most 6 rows; if more fire, keep the highest
   severities and add a trailing *"SHOW N MORE"* row that expands the rest.
   `info` rows are cut first. **Collapsing must save at least two rows** — the
   button occupies a row itself, so a seventh item is simply rendered rather
   than hidden behind a "show 1 more". The button is the last row of the list,
   on the same 40px band, so it costs exactly what it replaces.
   With **no rows at all the card stays and says so** — see *Absence is the
   reward* above. A card that disappears reads as "not loaded yet", and the
   all-clear is the one answer the user came to this screen for.
4. **Labels are statements, actions are imperatives.** The label says what is
   true (*"3 posts failed to publish"*), the action says what to do
   (*"Review posts"*). Neither ends with a period. Counts are always written
   out with the noun pluralised.
5. **Exactly one destination.** If a rule needs two places to fix it, it is two
   rules.
6. **Pure and tested.** Rules live in `src/lib/campaignReadiness.ts` as pure
   functions of already-fetched data — no fetching, no stores, `now` injected.
   Every rule ships with a unit test for both the firing and the silent case.
7. **Server rules win.** When the backend starts returning a verdict for
   something we compute locally (publish validation, worker health), the local
   version is deleted, not kept as a fallback.

## Asks for the backend

Rules marked `server` are blocked on these. Roughly in value order:

1. **Per-post publish readiness.** A verdict on each post — `{ valid: bool,
   reasons: [...] }` — using the same validation the publisher runs. Unblocks
   `publish-blocked-soon`, the highest-value rule in this document: it is the
   difference between finding out at 9:00 that today's post is broken and
   finding out at 9:01 that it failed.
2. **Machine-readable platform constraints.** `Platform.constraints` is a free
   text blob today. Character limits, media requirements, and supported media
   types as structured fields would unblock `missing-media` and let the client
   pre-empt failures per channel.
3. **Publisher/job health for scheduled posts.** Enough to tell "the worker is
   behind" from "a cancel is in flight" from "this job was lost" — so
   `auto-publish-overdue` can say something true instead of implying blame.
4. **Credential expiry per connected account.** Unblocks `account-expiring`;
   also the only way to warn before a channel silently starts failing.
5. **Phase date windows.** `CampaignTypePhase` has `sequence` but no dates, so
   "phase 2 starts next week and has no content" is not expressible. With
   windows, an empty phase becomes a deadline worth a row instead of the flat
   gap this catalogue deliberately dropped.
6. **Optional: server-computed attention items** in
   `GET /campaigns/:id/overview`, with ids and severities mirroring this
   catalogue. Worth it once these rules are also needed outside this screen
   (campaign list badges, digest emails, the assistant). Until then, keeping
   them in `src/lib` is the cheaper place to iterate.
