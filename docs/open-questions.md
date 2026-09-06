# Open questions for the back end

Every place the front end is waiting on a decision, an endpoint or a field —
in one list, so nobody has to reconstruct it from twelve flag comments before a
planning call.

**This file is an index, not a second copy of the argument.** The reasoning for
each entry lives where the code is: in the flag's doc comment
(`src/config/featureFlags.ts`), in the contract doc, or in the Linear issue.
Each row says what is being asked, what it holds up, and where to read the
detail. When an entry closes, delete the row — a stale question is worse than
no list, because it sends someone to re-answer something that already has an
answer.

Three kinds of entry, and they need different things from a reader:

- **Decision** — the capability exists; somebody has to choose. Cheapest to
  close and usually the thing actually blocking a flag.
- **Endpoint** — the client is written against a contract the server does not
  yet serve. Costed work, tracked in Linear.
- **Degraded** — it ships and works, but a field arrives empty or a surface
  states a coverage it would rather not. Nothing is blocked; the answer just
  makes it better.

Last reviewed 2026-09-06.

---

## Activity & notifications

The notification substrate shipped under CON-242 (table, REST, durable SSE
stream, a curated producer set). What is left is producers and two rulings.
Detail: the `activity` flag comment, [`activity.md`](./activity.md), CON-285.

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| A1 | Decision | **Does `post.publish_failed` fan out to the workspace?** CON-285 FR8 says yes (`post.*` are Exceptions → "members with access to the subject"); the shipped producers emit to `post.CreatedBy` only. Turning Activity on as it stands *narrows* who hears about a failure, because the Phase 1 entry it replaces was workspace-wide. `notify.EmitToUsers` already exists. | `activity` |
| A2 | Decision | **Should `post.published` be emitted at all?** CON-224 said it must not be; CON-242 wired it anyway. It is the highest-volume event in the product — three posts a day across five channels is fifteen "it worked" rows — and under FR8 it would go workspace-wide, multiplying that by the member count. The day's report already carries the count. The client cannot filter it: the badge count comes from the server. | `activity` |
| A3 | Endpoint | The **daily report** (`GET /api/activity/report/:date`, `GET /api/activity/reports`, both `tz`-parameterised) and the **remaining twelve producer types**, including the net-new `post.manual_publish_due` sweep. | `activity` |
| A4 | Degraded | **Copy arrives as prose.** CON-285 FR7 asks for `type` + `vars`; CON-242 ships a server-rendered `title`/`body`. The client renders from `type` + `data` where it knows the type and falls back to the server's English where it doesn't, so a row whose type this build predates is untranslatable. | — |
| A5 | **Bug** | **`eventhub` leaks subscriber slots, and both streams die when 10 are held.** The cap is 10 per user across `/api/events` *and* `/api/notifications/stream`. Reproduced on the local API 2026-09-06: 328 connects against 318 disconnects, with exactly ten ids connected and never released — saturated six minutes after boot and still saturated 39 hours later, 1283 × `429 eventhub: subscriber limit exceeded for user`. The client is behaving (`lib/streamConnection` backs off to 30s and retries, matching the log cadence); the slots are not being reclaimed. **A user in this state gets no live updates and no notifications at all**, and it cannot be verified out of because the stream never opens. Restarting the API clears it. | live updates, notifications, **A6** |
| A6 | Endpoint | **SSE replay across a reconnect is still unverified** — `Last-Event-ID` / `?since=` advancing, and `mark-all-read`'s `before` bound. Both need a stream that opens, so they are blocked on A5. What *is* verified: `seq` comes back non-zero (ogen#139 is in), and keyset paging on the REST list is exact. | `activity` |

A1 and A2 are the two that decide whether Activity reads as better or worse
than what it replaces. Raised on CON-285 on 2026-09-06 with the client's
answer: **workspace-wide for both recipients, which makes dropping
`post.published` the only tolerable option.**

## Analytics

The three dashboard endpoints are real and shipped (CON-237–239, merged
2026-08-27). Full field-by-field comparison:
[`analytics-contract.md`](./analytics-contract.md).

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| N1 | Decision | **Which timezone does `/learnings` bucket on?** The PRD says a fixed display timezone defaulting to UTC and the wire carries no offset, so every slot on the heatmap is labelled UTC. If the server buckets on a tenant timezone, every label is wrong by that offset — and a "best time to post" wrong by three hours is worse than no best time. **Put the zone on the wire either way.** | — |
| N2 | Endpoint | **A campaign dimension** — `campaign_id` on the dashboard reads, or a campaign column on the rows. Until then the campaign screen fetches one 100-row page of `/posts` and sums it client-side, which stops being complete past ~100 measured posts. | `campaign-analytics` |
| N3 | Endpoint | **A per-post series** — `GET /api/analytics/posts/:id/series` with a granularity. `post_analytics_snapshots` is written and retained and no endpoint reads it, so a post's own history has no source. | `campaign-analytics` |
| N4 | Degraded | **Three fields with no wire source**: per-post `matured`, the performers' `curve` and `typical`, and the `save_rate` / `follow_rate` criteria (`/performers` reports no saves or follows). Each surface states that where it would otherwise draw them. | — |
| N5 | Degraded | **`platform` on `/overview`**, and a ruling on whether an all-time lessons card should be narrowable at all. Only `/performers` takes a `platform`, and one slug rather than a set — so the scope bar's filter reaches one card of three, and the other two say so under their heading. Repeatable `platform` on both would let the marks go back to multi-select. | — |
| N6 | Degraded | **The usual-range band** answers `insufficient_history` for every tenant, so the verdict lines, the cone and the "usual range" key are absent and the previous-stretch delta is the whole comparison. Needs a tenant with enough history behind the long-retention rollup. | — |
| N7 | Degraded | **`account.avatar_url` is declared and always empty** and `display_name` mirrors `username`; enrichment from `social_accounts` is a server follow-up. Rows fall back to the initial plus the platform badge. | — |

## Publishing

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| P1 | Endpoint | **A thread publishes as one post.** `SubmitRequest` carries no `platformSpecificData`, so Zernio's `threadItems` is never sent. Needs that field in the submit path, the same body split implemented server-side, a home for the per-item media assignment, and `thread` added to the `threads` platform list. See the `thread-sequence` flag and CON-196/CON-284. | `thread-sequence` |
| P2 | Decision | **Attachment validation is counted per post, not per thread item**, so five images over three posts still warns "platform allows up to 4". Correct until the publisher splits — passed through as written. | `thread-sequence` |
| P3 | Endpoint | **The post list payload carries no thumbnail**, so a calendar card has never shown a picture: the card's only image source is `post.media_urls` and nothing writes it. Editor uploads land in `post_attachments`, whose thumbnails are 15-minute presigned URLs the client cannot persist. CON-247. | `calendar-card-images` |

## Assets

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| S1 | Endpoint | **A content-bank image has no thumbnail** — the server renders no smaller copy, so the list's preview cell draws the full file scaled into 40px. `thumbnail_url` is preferred wherever it appears, so nothing changes client-side when the job lands. | — |
| S2 | Endpoint | **The bridge that attaches a bank image to a post** (CON-16) — which is what the image alt text is being collected for. | — |
| S3 | Endpoint | **Campaign-scoped assets** (CON-210): assets move from workspace-wide to campaign-scoped, with the workspace bank staying on as workspace-wide knowledge storage (CON-211). | — |

## Account, billing & tiers

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| B1 | Endpoint | **Session-authenticated email preferences** — `GET`/`PUT /api/users/:id/email-preferences` behind `requireSelf`. CON-155 shipped the suppression engine, but every endpoint it exposes is public and token-gated: it verifies a signature lifted from an email footer, not a session. Contract in `services/api/emailPreferences.ts`, asserted by its test. | `email-preferences` |
| B2 | Endpoint | **The entitlements and billing reads** — `GET /api/entitlements`, `GET /api/tiers`, `POST /api/workspace/plan`, `GET /api/billing`, `POST /api/billing/portal`. CON-208 and CON-86 are done server-side, so the tiers and the counters exist; what is missing is a workspace-scoped REST read that puts them together. Contracts in `services/api/entitlements.ts`, `tiers.ts`, `billing.ts`, each asserted against the wire path. | `workspace-tiers` |
| B3 | Endpoint | **A `suspended` flag on the resources a downgrade makes read-only.** The server picks what suspends; the client must never work it out by counting against a limit, or it picks a different victim than the server did and a different one per tab. | `workspace-tiers` |

## Cross-cutting

| # | Kind | Ask | Blocks |
| --- | --- | --- | --- |
| X1 | Decision | **Event naming is mixed** — dotted (`zernio.sync.ok`) and snake_case (`post_cloned`) on `/api/events`, matched literally in `lib/eventRouting.ts`. The notification vocabulary settled on dotted, so the hub is the odd one out. | — |
| X2 | Endpoint | **`updated_by` exists nowhere**, so "who edited this" is unanswerable and teammate activity stays unexpressible. Named as out of scope in CON-285; recorded here because it is the reason a whole class of feed entry cannot be built. | — |

---

## Closing an entry

Answer it where the detail lives — the flag comment, the contract doc, the
Linear issue — and delete the row here. If the answer arrives as a shipped
endpoint, the flag it unblocks still gets rule 4 from CLAUDE.md before it
flips: **re-test the feature against the real thing**, because a UI built
against an assumed contract usually needs a pass.
