# Attention rules

The rule set behind the **"Needs attention"** rail on the Campaign Overview
screen (CON-120). This file is the contract: a rule exists here before it exists
in code, and `src/lib/campaignReadiness.ts` implements exactly what is listed
below — nothing more, nothing else.

## What the rail is for

One glance, one question: *what does this campaign need from me right now?*

- It is a **to-do list, not a report.** Every item names something the user can
  act on, and links to the one place where they can act.
- **Absence is the reward.** No items → the card does not render at all. Never
  fill it with "all good" rows.
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

`delivery` (D) · `connectivity` (C) · `setup` (S) · `content` (K) ·
`hygiene` (H).

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
| `scheduled-outside-window` | `todo` | `scheduled_at` outside the campaign's start/end | *N posts are scheduled outside the campaign dates* | posts | `client` | – |
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
| `accounts-missing` | `todo` | a selected channel has no connected publisher and **no** scheduled posts | *No connected account for `<channel>`* | workspace settings | `client` | – |
| `account-expiring` | `risk` | a connected account's credentials expire within 7 days | *`<channel>`'s connection expires in N days* | workspace settings | `server` | ✓ |

`accounts-missing-blocking` and `accounts-missing` are the same gap at two
temperatures: without scheduled posts it is setup work, with them it is a queue
of guaranteed failures. Only one may fire per channel.

`/platforms` cannot tell "never connected" from "was connected, now dropped" —
both arrive as `connected = false`, which is `accounts-missing`. So
`account-inactive` covers only the case we can actually name: a publisher that
*is* connected whose accounts are all explicitly inactive. An empty `accounts`
array means the payload didn't say, and must not fire the rule.

### Setup — is the campaign configured

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `brief-empty` | `todo` | all four brief fields blank | *The brief is not filled in* | brief | `client` | – |
| `brief-partial` | `todo` | some brief fields blank | *Brief is missing: `<fields>`* | brief | `client` | – |
| `dates` | `todo` | `start_date` or `end_date` missing | *Campaign dates are not set* | settings | `client` | – |
| `channels` | `todo` | no `target_platforms` | *No channels selected* | settings | `client` | – |
| `assets-expected` | `todo` | `use_assets = true` and no `asset_ids` | *Assets are enabled but none are attached* | assets | `client` | – |
| `post-target` | `info` | `estimated_post_count` unset while the campaign has content | *No post target set* | settings | `client` | – |

`brief-empty` and `brief-partial` are mutually exclusive, as are `channels` and
the connectivity rules — a campaign with no channels does not also get told its
channels are unconnected.

### Content — is there enough of it, in the right places

| ID | Severity | Trigger | Label | Action → | Source | Clock |
| --- | --- | --- | --- | --- | --- | --- |
| `no-posts` | `todo` | zero posts | *No posts yet* | posts | `client` | – |
| `ready-not-scheduled` | `todo` | any post `status = ready_for_publish` | *N posts are ready but not scheduled* | posts | `client` | – |
| `nothing-scheduled` | `todo` | drafts exist, nothing is scheduled or published, and `pipeline-gap` did not fire | *N drafts, nothing scheduled yet* | posts | `client` | ✓ |
| `empty-phases` | `todo` | a phase of the campaign type has no posts | *No content in phase(s): `<names>`* | posts | `client` | – |
| `channel-uncovered` | `todo` | a selected channel has no posts | *No posts for `<channel>` yet* | posts | `client` | – |
| `behind-pace` | `risk` | share of the campaign elapsed exceeds share of planned posts published by more than 25 points | *Campaign is N% through, M% published* | posts | `client` | ✓ |

`no-posts` suppresses every other content rule, and `pipeline-gap` too — an
empty campaign gets one row, not six.

`pipeline-gap` suppresses `nothing-scheduled`: on a live campaign both say
"nothing is going out", and the risk row says it with a deadline attached.

`behind-pace` measures against `estimated_post_count` when there is one and
against the posts that exist otherwise, so it still means something before a
target is set. It only runs while the campaign is live.

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
2. **Mutual exclusion is explicit.** Escalation pairs (`accounts-missing*`) and
   suppression parents (`no-posts`, `channels`) are named in the catalogue. A
   new rule must state which existing rule it defers to, if any.
3. **Cap the list.** Show at most 6 rows; if more fire, keep the highest
   severities and add a trailing *"+N more"* row. `info` rows are cut first.
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
   windows, `empty-phases` becomes time-aware instead of a flat gap.
6. **Optional: server-computed attention items** in
   `GET /campaigns/:id/overview`, with ids and severities mirroring this
   catalogue. Worth it once these rules are also needed outside this screen
   (campaign list badges, digest emails, the assistant). Until then, keeping
   them in `src/lib` is the cheaper place to iterate.
