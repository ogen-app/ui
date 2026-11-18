# Known stubs & gaps

Conventions for what is live, flagged off or still waiting on the API or on content. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

**The universal assistant waits on the API's merge, and on five API
follow-ups** (CON-451). The UI (#227–#234) replaces endpoints the backend stack
removes, so the two ship together, and neither has had a live pass yet. Until
the follow-ups land: every pack sends typed results now (assets CON-460,
foundation CON-461, repair CON-462, analytics CON-463, workspace CON-464,
ideas CON-465), though the facts ledger is still unbuilt; the posts list doesn't say what it was
sorted on, so its card shows reach and rate on every row; a reloaded thread infers an offer's
state instead of reading it; and a tagging below the offer threshold isn't
among the assets pack's results, so only one run from an offer shows UNDO. Idea slots are in the week view only.

Inviting teammates is live end to end (People, in Workspace Settings; the
emailed link lands on `/invite?token=…`, which is public, and accepting either
creates the account or adds the workspace to one that already exists) ·
**multi-workspace is live, unflagged** — [ogen#109](https://github.com/ogen-app/ogen/pull/109)
merged 2026-08-14; the `multi-workspace` flag and its off-branch were deleted
once the client was re-tested against the shipped API (CON-147) ·
dark mode is scaffolded but empty · **a calendar card's picture is a
15-minute presigned `cover_url`** on the list row (CON-247, signed by CON-368),
so the post lists refetch inside the window and a cover that fails is dropped
rather than drawn broken; `calendar-card-images` is on and waits to be deleted
(`docs/technical-decisions.md#calendar-card-media`) ·
**a Content-Bank image has no thumbnail** —
images upload, store as `IMG` and open on their own screen (CON-246), but the
server renders no smaller copy, so the list's preview cell draws the full file
scaled into 40px; `thumbnail_url` is preferred wherever it appears, so nothing
here changes when that job lands. That cost now lands on the media card's
picker too (`AddFromAssetsModal`, a grid of them — see *A bank image reaches
a post as a copy* under Conventions) · **the React Compiler lint rules are warnings, not errors** —
`react-hooks` v7 reports 123 of them against code that predates it, and each is
a judgement call about a component rather than a mechanical fix
([`docs/quality-tooling.md`](./docs/quality-tooling.md)) · **i18n converts whole screens in some
places and only islands in others.** Converted whole: the auth screens,
sidebar, Profile, Workspace Settings, the campaign calendar (its week, month
and list views, the cards, both rail panels and the posts table), the
analytics surfaces (the workspace dashboard, the campaign composition, a
post's own numbers and the three view mappers behind them), Brand (the
Overview, all five sections, the three editors and the routes — plus the two
tables behind them, `lib/brandSections` and the starters, which now carry
behaviour only), `/workspaces`,
`/invite`, `/plans` with the Plan & billing card, Activity, the post's Quality
panel and checks-bar digest (CON-440), the assistant panel (CON-451), and the flag-gated Tasks. Islands
only: the post editor (`posts.*` — status and
publish labels, the published link, sources, notes, quality, versions,
duplicate and the performance card), the Campaigns list (the archive drawer and
its Danger Zone, the posts toolbar and the empty state) and the Content Bank
(the image screen, the tagging and selection dialogs, the delete confirmation,
the upload refusals and the list and page chrome). Everything else is
still hard-coded English (CON-174) · **English is the only released language**: Spanish is
translated and tested but gated by `enabled: false` in `i18n/config.ts`, so the
picker shows one option.

**The workspace calendar is on** (`workspace-calendar`, switched on 2026-11-16
so Calendar under "All campaigns" is a calendar rather than a request to pick
one; the paragraph's last sentences are why it was off, and the range is still
what it lacks). It
is the campaign's calendar with the filter taken off, and deliberately the same
components: both grids, the card, the rung ladder and the toolbar take the
campaign as an argument, and `null` is what says there isn't one. Three things
follow from that null and they are the whole difference — the cards name their
campaign (`CardFields.campaign`, stamped by the view rather than switched by
the user), nothing on the grid creates a post, and the view switch has no LIST
segment because the table is a campaign's. Its rows come from
`useWorkspacePosts` — `GET /api/posts`, which existed all along and which
`useAssetUsage` and the auto-publish allowlist already read, under a key every
post write invalidates. What it waits on is a **range**: that endpoint takes no
parameters, so the grid pulls the whole workspace's hydrated posts however few
weeks are showing (`docs/open-questions.md` P4). Not a correctness problem and
not why the flag is off — the flag is off because a calendar that opens slowly
is worse than one that isn't offered, and nobody has tried it on a large
workspace yet.

**Brand from what you have is live, unflagged** (CON-400; the
`brand-distill` flag was deleted 2026-10-23). The hub's offer reads a brand off the website, a document or seven
questions (`/api/brand/distills`, CON-399, merged in ogen#230), the run
lives at `/foundation/read/:runId` for its whole life, and the review commits
only what is kept. Two rules to keep: **the review is the client's until the
commit** (`stores/brandDistillStore`, `sessionStorage`, keyed by `proposalId`
so a gap-question round's child run inherits it), and **the disclaimer is the
one thing a commit replaces**, so it is sent only on an explicit pick
(`lib/brandDistill.buildCommit`). Uploads from the offer carry
`purpose=brand_source`. Still owed: the live pass against the merged API — a
website read end to end, a document read with an upload in flight, the
questions route, a gap-question round carrying a drop to the child run, a
commit with a skipped duplicate, and `no_usable_sources` on a JS-only site.

**Calendar preferences are one set per user, shared by every calendar**
(`calendar.<userId>`). They used to be per campaign as well; see
`docs/technical-decisions.md#user-scoped-settings` for why that was the wrong
axis. Nothing was migrated, so the change reads as a one-off reset.

**Two operator-tunable server limits are mirrored on the client with nothing to
sync them** (CON-292). `platform_global_limits` is a single row an operator can
edit in Harbor, and no REST endpoint serves it — so `MAX_ALT_TEXT_CHARS`
(`lib/assetStatus.ts`) and `MAX_THREAD_POSTS` (`lib/threadSequence.ts`) are
copies that match the seed today and cannot notice when it changes. Lower
`max_thread_segments` to 10 and the editor keeps cutting at 25, then the publish
is rejected. The fix is for both to ride along on `GET /api/platforms`; until
then, changing one is a coordinated change rather than a config edit.
`MAX_VIDEO_UPLOAD_BYTES` is *not* one of these — it is deliberately ours and
below the server's ceiling, so it wins on purpose. The same ticket left the six
existing platforms' constraint jsonb untouched, so `lib/platformMedia.ts`'s
override table cannot be retired either, and an operator editing Instagram's
image cap changes nothing the editor checks.

**The help centre waits on content, not on an endpoint** (`help-center`,
CON-173). The drawer, its triggers and the `#help/<key>` deep link are built;
`services/help` serves fixtures. There is no API in the way — articles live in
the Sanity project `getogen.com` already runs, and the app reads the **public
`production` dataset** — so switching on is: seed `production`, register the
app's origins for CORS (**without** credentials; it only ever reads), and
replace the two functions in `services/help/index.ts` with the GROQ query. The
starter articles were bootstrapped into the private `staging` dataset, which a
browser cannot authenticate against, and that is the whole of why the flag is
off. Three things to keep hold of when it lands. Help content must **never** go
through `services/api/http.ts` — every request in there carries
`credentials: 'include'`, and Sanity is a third party. An article is identified
by a language-independent `key` and cross-linked by reference rather than by
title, so a translation cannot break a link; the catalogue holds only the
drawer's own chrome (`help.*`), because prose is content and belongs in the
CMS. And the trigger is the feature's only presence on ordinary screens, so it
reads the flag and passes it to `useHelpTopicMap({ enabled })` — an
unconditional read would open a cross-origin request from the post editor for a
drawer that cannot be opened, which fixtures hide right up until the deploy
that swaps them out.

**The Profile marketing-email switch is built but flagged off**
(`email-preferences` in `config/featureFlags.ts`). CON-155 shipped the server's
token-gated unsubscribe pages, not a session-authenticated one, so
`GET`/`PUT /api/users/:id/email-preferences` still has to be written. The
contract is in `services/api/emailPreferences.ts` and asserted by its test.
Flip the flag when the handler answers. See
`docs/technical-decisions.md#email-preferences`.
