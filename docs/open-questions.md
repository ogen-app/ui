# What the front end is waiting on from the API

Two lists, and the split is the point.

**§1 is open** — nobody has answered it, or nobody owns it. These are the rows
worth a planning call, and most of them cost a sentence to close.

**§2 is tracked** — answered, specced and sitting in Linear. Nothing here is a
question; the table exists so that "what is the client blocked on" is one read
rather than twelve flag comments. A row here needs a *schedule*, not a
decision.

The file was one undifferentiated list until 2026-09-06, and it read as though
a costed backend ticket and an unanswered design question were the same kind of
thing. They are not, and conflating them is how a real question gets lost among
work that is already moving.

**This is an index, not a second copy of the argument.** The reasoning lives
where the code is: the flag's doc comment (`src/config/featureFlags.ts`), the
contract doc, or the Linear issue. When an entry closes, delete the row — a
stale question is worse than no list, because it sends someone to re-answer
something that already has an answer.

Last reviewed 2026-09-18.

---

## §1 — Open

Nothing here has an owner. Each row is either a decision somebody has to make,
or work everyone agrees about that nobody has raised.

| # | Ask | Why it is still open |
| --- | --- | --- |
| **B3** | **A `suspended` flag** on the resources a downgrade makes read-only. | **Which** to suspend was decided 2026-09-16: **the most recent survives** — newest-first by `created_at` up to the new tier's allowance, the rest suspend. Still open because nothing implements it and it has no ticket. The rule has to be applied *by the server*: the client must never work it out by counting against a limit, or it picks a different victim than the server did and a different one per tab. |
| **S4** | **A stable `code` on each upload result**, beside the prose `error` it already carries. | Agreed 2026-09-16 as backend work; **no ticket yet**. `POST …/assets/upload` answers 201 and words every refusal as English prose — some of it Go, verbatim: `imageprobe: unsupported media type: text/plain; charset=utf-8`. With no code to switch on, the client matches the sentence to translate it (`lib/uploadError`). That degrades safely — an unrecognised message falls through to the fallback, minus the package prefix — but a rewording server-side silently drops a refusal back to untranslated English. One enum field closes it for good. |
| **I1** | **`/api/ideas` — the whole module.** No table, no endpoint, no column. The client is built and usable against a `localStorage` stub; the contract is written out in full in `services/api/ideas.ts` (five calls) and the two rules the server has to own are asserted on both sides of the seam. Open rather than tracked because there is no ticket and nobody has raised it: the module was built to find out whether triage this shape is faster, and it is, which is the argument for the table. Two decisions go with it — whether a verdict is its own endpoint (it is here, so a decision cannot ride along with an edit) and **what a *yes* leads to**, which is nothing today and wants `POST /api/ideas/:id/promote` rather than the client creating a post and hoping the link survives. Blocks the `ideas` flag, which stays off while the stub is per browser — a shared backlog shared with nobody is a worse lie than an unbuilt page. |
| **X2** | **`updated_by` exists nowhere**, so "who edited this" is unanswerable. | Named as out of scope in CON-285 and never raised on its own. **Deferred 2026-09-16** — wanted eventually, not now. Kept here rather than deleted because it is the reason a whole class of feed entry — teammate activity — cannot be built at any price, and because the column's value is the history it accumulates: the day it is added is the day that history starts. |

## §2 — Tracked

Answered and owned. Listed so the client's blockers are visible in one place.

| # | Waiting on | Ticket | Blocks |
| --- | --- | --- | --- |
| A4 | **Copy arrives as prose.** FR7 asks for `type` + `vars`; CON-242 ships a server-composed `title`/`body`. We render from `type` + `data` where we have a key and fall back to English where we don't — so a Spanish workspace reads English for any type this build predates. | CON-285 FR7 | — |
| N2 | **A campaign dimension** on the dashboard reads. Until then the campaign screen sums one 100-row page client-side, which stops being complete past ~100 measured posts. | **CON-288** | `campaign-analytics` |
| N3 | **A per-post series** — `GET /api/analytics/posts/:post_id`, returning per-metric running totals on an age-since-publish axis. **Written and in review** (ogen#130); re-test the client against it when it merges, per CLAUDE.md rule 4. | CON-250 | `campaign-analytics` |
| N5 | **A repeatable `platform` filter** on all three reads, so the scope bar's control reaches more than one card of three and the marks can go back to multi-select. | **CON-289** | — |
| N7 | **`account.avatar_url` is declared and always empty**, `display_name` mirrors `username`. Rows fall back to the initial plus the platform badge and fill in on their own. | **CON-287** | — |
| P1 | **A thread publishes as one post** — `SubmitRequest` carries no `platformSpecificData`, so `threadItems` is never sent. The client is already built behind the flag. | CON-284 (BE), CON-196 (FE) | `thread-sequence` |
| P2 | **Attachment validation counted per post rather than per item** — deferred deliberately. Until the publisher splits, "platform allows up to 4" is a true statement about what gets submitted; a client-side per-item count would be a more precise lie. | folded into CON-284 | `thread-sequence` |
| P3 | **No thumbnail on the post list payload**, so a calendar card has never shown a picture. | CON-247 | `calendar-card-images` |
| S1 | **A content-bank image has no thumbnail**, so the list's preview cell downloads the full file to draw it at 40px. Raised on the image service rather than as its own issue: it is one more output of a pipeline that already writes a normalized derivative. `assetPreview` prefers `thumbnail_url` already, so the client changes nothing when it lands. | CON-281 | — |
| S2 | **The bridge that attaches a bank image to a post.** Both sides were built expecting it — `asset_files`' columns are named to match `post_attachments` for the field copy, and the alt text CON-246 collects has no other consumer. The client picker wants CON-210 first, so it is scoped against a campaign rather than the workspace. | **CON-290** | — |
| S3 | **Campaign-scoped assets**, with the workspace bank staying on as workspace-wide knowledge storage (CON-211). | CON-210 | — |
| B1 | **Session-authenticated email preferences.** CON-155 shipped the suppression engine, but every endpoint it exposes verifies a signature lifted from an email footer, not a session. | CON-155 | `email-preferences` |
| B2 | **The entitlements and billing reads** — `/entitlements`, `/tiers`, `/workspace/plan`, `/billing`, `/billing/portal`. The tiers and counters exist (CON-208, CON-86); the workspace-scoped REST read that puts them together does not. | CON-243 | `workspace-tiers` |

## Closed since the last review

Kept for one cycle so nobody re-raises them, then deleted.

- **A5 — the `eventhub` subscriber leak.** Fixed and merged: ogen#142 (2026-09-08)
  made the cap self-healing — at the limit the hub now evicts the user's
  **oldest** subscription and admits the new one, so a reload always opens a
  stream — and added a hard **30-minute connection lifetime** as the backstop
  that reclaims what a dead client left behind. ogen#152 (2026-09-14) raised the
  per-user cap **10 → 30**, because the ten were counted across both streams and
  every device: at two streams per tab, `activity` on made ten *five tabs*, and
  past the cap evict-oldest does not settle, it rotates. The permanent 429
  lockout is gone, and a persistent reconnect loop now means a real outage
  rather than this bug. **Two consequences are ours, not the server's**, and
  neither is written down yet: a clean close mid-session is now *expected*
  periodically, and ogen#152 added a frame announcing it —
  `event: recycle`, `data: {"reason":"lifetime"}`, deliberately **without an
  `id:` line** so it does not advance the replay cursor. Nothing in
  `lib/streamConnection.ts` listens for it, so every recycle still runs the full
  recovery path and shows *"Catching up…"* when nothing was down — twice an hour,
  per tab. Handling it is the last of this, and it is client work.
- **N4 — the three fields with no wire source.** `matured` and the performers'
  `curve`/`typical` are served by CON-250 under other names (`still_counting`,
  and a per-platform p25/p50/p75 curve), so they are a renaming pass on this
  side rather than an ask. `save_rate` and `follow_rate` were **deleted from
  the client** on 2026-09-06: `/performers` reports neither, so
  `availableCriteria` filtered both out of every render they ever had, and
  keeping them meant carrying a vocabulary and two translations for questions
  the product could not ask. Saves are worth re-adding if the field reaches the
  ranked rows; follows per post is not merely unserved but doubtfully
  attributable.
- **A6 — SSE replay across a reconnect.** Verified 2026-09-07 against the
  running API, and it did **not** need CON-286 fixed first: restarting the API
  reclaims every leaked slot, which buys a clean window to test in. Replay
  behaves in all five cases (ascending, strictly above the cursor, live-only
  without one, live-only rather than a 400 on an unparseable one, silent on a
  cursor ahead of the log), and `mark-all-read`'s `before` bound is inclusive
  and excludes what arrived after it. Both are as documented, so nothing here
  was an ask. What the trip did leave is a client test — the cursor seam in
  `stores/notificationStreamStore.test.ts` — and a sharper CON-286: its
  proposed fix is already in the code, and the slot is held by a writer
  goroutine that never returns rather than by a release that was never
  deferred. **Live push is still unverified**, and needs a producer that can be
  triggered locally rather than a stream that opens.
- **N1 — the bucketing zone on the `/learnings` heatmap.** Settled by a
  convention rather than a field: **the back end works in UTC and the client
  renders local**, which makes the heatmap's existing `18:00 UTC` labels
  correct as written rather than a hedge. The `heatmap.tz` field asked for on
  CON-239 is no longer wanted — it existed to make the assumption verifiable,
  and a stated convention does that for free. Note this does **not** unlock
  converting the grid into the reader's zone: an aggregate over a year of posts
  cannot recover the offset that applied on each post's own date, so those slots
  stay labelled UTC no matter what the wire says. See the doc comment on
  `lib/analyticsLearningsView`.
- **N6 — the usual-range band answers `insufficient_history` for every
  tenant.** Not a missing field but a missing *sample*: the rollup behind it has
  no tenant past the thresholds (3 posts per platform, 8 settled posts, 96h to
  settle). `lib/analyticsOverviewView` reads the field rather than today's
  absence, so the band appears on its own when one crosses. Resolved as **our**
  work rather than the server's — seed a workspace with synthetic history and
  exercise the band, cone and verdict lines end to end.

---

## Closing an entry

Answer it where the detail lives — the flag comment, the contract doc, the
Linear issue — and move the row to *Closed since the last review*, or delete it
if it has been there a cycle. If the answer arrives as a shipped endpoint, the
flag it unblocks still gets rule 4 from CLAUDE.md before it flips: **re-test the
feature against the real thing**, because a UI built against an assumed
contract usually needs a pass.
