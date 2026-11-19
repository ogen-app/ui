# Posts

Conventions for the post editor, scheduling, platforms, post types, sources, first comments, planned posts and threads. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **The post editor autosaves through the Query cache** (`usePost.changeDoc`,
  600ms debounce, generation-counter guarded, flush-on-unmount). Campaign forms
  autosave similarly. Prefer these patterns over new local edit stores.

- **Unscheduling a post is a `cancel`, not a status `PUT`** — see
  `lib/postStatusMachine.ts` and `docs/technical-decisions.md#cancel-vs-transition`.
  Getting this wrong can publish a post the user thought was cancelled.

- **Scheduling a post is a `schedule`, not a status `PUT`** — it goes through
  `POST /api/posts/:id/schedule` (server validates the date and routes
  auto/manual); the PUT path skips date validation. `scheduled_at` is locked
  while `scheduled`/`published` (`canEditScheduledAt`). See
  `docs/technical-decisions.md#schedule-endpoint`.

- **A platform is identified by `zernio_id`, never by its sqid** (CON-292). The
  catalogue is the operator's now — rows are added and enabled in Harbor, and a
  sqid is minted there, so it cannot be known at build time and nothing is filed
  under it. It addresses a *row*; `zernio_id` names a *network*, and every table
  we own is keyed by it: `lib/platformDictionary`, `lib/platformMedia`,
  `PLATFORM_FOLDS`, the preview's `RENDERERS`, the auto-publish allowlist,
  `supportsSequence`. Code holding a sqid — `post.platform_id`, a campaign's
  `target_platforms[].id`, an analytics key — translates through
  **`usePlatformCatalog().resolve`**, which takes either; that hook is the only
  place the two meet, and it is a hook because the translation needs the fetched
  list. **The dictionary is a gate, not a fallback**: `buildPlatformViews` drops
  a row this build ships no support for (and says so in dev), because a network
  with no mark, no preview, no fold and no media rules is broken in five places
  rather than merely plain. So support ships first and the operator's toggle
  comes after — that is what makes a launch need no deploy. What "support" means
  is the checklist in [`docs/platform-support.md`](./docs/platform-support.md);
  the silent one is `lib/platformMedia`, where a missing row means *no* image
  checks rather than permissive ones. **Post types are the other way round**
  (CON-311): the row's `supported_post_types` is the vocabulary, and the
  dictionary's `postTypes` only words it — a slug it does not list is offered
  under the row's own `post_types` label (`withOperatorPostTypes`) rather than
  dropped, because Harbor's selector was inert while this was an intersection.
  Read post types off a view or `resolve`, never off `getPlatformByZernioId`,
  which knows only the build's half.

- **A post's permalink survives publication and is not frozen with the rest**
  (CON-165). `published_url` is on `PostPayload` and must stay there: the PUT
  assigns it unconditionally, so an autosave that omits it clears the link on
  every published post. It is deliberately outside CON-251's content lock —
  recording a link is a post-publish act — which is what lets
  `PublishedUrlDialog` save one Zernio cannot verify, on a post that has
  already published as well as one about to. That path must always pass the
  typed URL through; it used to discard it, and nothing in the product asks for
  it a second time.

- **A post's sources are the same rule, one field over** (CON-233). `POST` and
  `DELETE /api/posts/:id/assets` own `used_asset_ids`, and `postToPayload`
  omits it — so the editor's autosave can no longer write the field at all,
  which is the point: it used to, and a keystroke inside the 600ms debounce
  cloned the pre-attach list and its flush undid the attach. Attach and detach
  through `attachToPost`/`detachFromPost` (`lib/postSources`), never through
  `changeDoc` alone — but keep painting through `changeDoc`, because a cache-only
  edit is dropped by that same clone. Two consequences worth knowing: a save's
  *response* is no longer evidence about the set either (it carries the row as
  the server read it, before any attach that landed since — hence
  `withHeldSources` in `lib/postCache`, applied at all three write sites in
  `usePost`), and both endpoints answer **409 while the post is `scheduled` or
  `published`**, sources being locked content under CON-251. Note
  `published_url` is in that same payload and is listed rather than omitted
  (CON-165): the server defaults it away on silence and *preserves*
  `used_asset_ids`, so the two fields are opposites and a builder that treats
  them alike is wrong about one of them.

- **A post's first comment is presence-aware but restated** (CON-360/361,
  shipped unflagged). `first_comment` and `first_comment_delay_minutes`
  have no endpoint of their own, so unlike `used_asset_ids` the autosave is
  their only writer and `postToPayload` sends them; the CON-251 lock accepts a
  restated value. `first_comment_status` and its three siblings are the
  workers' and never sent. The limit is the post-type rule's
  `max_first_comment_chars` (`0` = the type takes none), and a comment on such
  a type is **kept and blocked**, not cleared — the server's publish gate
  refuses it, and clearing would lose the text a switch back wants.

- **A post's type is a default, not a question.** *Auto*
  is the empty `platform_post_type` every post is **already** created with —
  `useAddPost` sends a campaign and a date and nothing else — so the feature
  stores nothing and waits on no endpoint; it reads a state that already existed
  as an intention rather than as an omission. While a post is automatic the
  format is derived on every render from the body and the attachments
  (`lib/postTypeAuto`), and the slug is written to the record on the way **out
  of `draft`** — every edge, not just the committing ones. That boundary is the
  server's and not a judgement call: `requirePlatformIfNotDraft` refuses a PUT
  carrying an empty type under any other status, so a post that crossed it still
  automatic could not be saved again at all. Hence `canBeAutomatic`, read in both
  directions — the picker offers *Auto* only to a draft, and the transition out is what pins. Pinning is one-way:
  reopen to draft and the post keeps the slug it resolved to.
  The ladder is `text-post → image-post → carousel → video → reel → short →
  thread`, loosest first, bounded by what the *campaign* enables — Auto can only
  land somewhere the picker would have offered. It never chooses Story, Article
  or Link post (editorial decisions the content cannot imply) nor a
  `whitelist_only` type (no rule to test). **`thread` is a rung wherever the
  post-type rule says `segmented`** — the server's own answer, which replaced a
  hard-coded list of chain-capable networks here. The ladder is also what a *pinned* thread demotes through
  when its body comes to one message (`demotedFrom`), with the chain rung
  barred so it cannot resolve straight back. See
  `docs/technical-decisions.md#auto-post-type`.

- **A planned post is a post with theses and no body** (CON-449). `planned`
  can only become `draft`, and only by gaining a body — the server moves it,
  so it has no button. Ideas are never posts: on the week calendar an idea
  with a target date is a dashed IDEA slot (`/api/ideas/slots`) that isn't
  counted, and COMPILE / DRAFT (`/api/ideas/compile`, `/api/ideas/draft`) turn
  ideas into planned posts or finished drafts, one per platform, through one
  form (`ideas/IdeaPostForm`) on the selection bar and the slot (CON-470).
  **Unscheduled is the default**: a post is dated only by a day the user
  chose or one planned on its idea, and the server has no way to leave a
  planned one undated, so the form says which rather than asking — and how
  many of the ideas have a day (CON-485). The form presets its platforms
  from the ideas' `plan`, each with the type the plan names, says what each
  "how many" choice makes, and names a single idea. Unscheduled drafts land
  in the calendar's Not scheduled panel — compact rows, "Platform · Type ·
  from N ideas" (`idea_count`), with a count and a drag hint — marked on top
  for the tab (`justWrittenStore`), the assistant's drafts as well as the
  list's; a draft lets go of the mark once it has a date. The toast's SHOW
  opens it, one toast per campaign when the drafts went to several. A
  drafted or compiled row says why it has its day (`dateFrom`: the idea's
  plan, or the day chosen). Deleting a post refreshes the ideas. "Used" is a
  fact, not a verdict: an idea carries `post_count`, the row says "Used in N
  posts", the opened idea lists them (MADE INTO: two lines a row, the whole
  row opening the post, a loading and an emptied state), and
  `used=used|unused` is a clause, facet and grouping like any other.

**A thread is one body with breaks in it** (CON-196/CON-284). The chain is
**derived from the body** rather than composed in separate inputs: the editor
stays the one Markdown card every post type uses, and the breaks come out of the
words. A chain that comes to one message is not a failure — it publishes as an
ordinary post, and `demotedFrom` (`lib/postTypeAuto`) picks which one on the way
out of draft. Shipped unflagged on 2026-09-18; `thread` is offered on X and on
Threads wherever the publisher declares the slug.

**The split is the server's, and that is the whole shape of this feature.**
R1 (ogen#140) had the client author `thread_segments` message by message and
restamped `content` from the first of them; R2 (ogen#144, merged 2026-09-10)
inverted it, which is the model this client already had. `posts.content` is now
canonical — literally what the author typed, `---` lines and all — and
`thread_segments` is `platforms.SplitThread` run over it on every write. Four
rules follow, and each of them is a thing not to undo:

- **Never send `thread_segments`.** A write carrying it is ignored, so
  `postToPayload` omits it and nothing on the screen keeps it in step. Saving
  the body *is* saving the thread — which also means a calendar drag or an
  unschedule can no longer flatten a thread by omitting a field it knows
  nothing about.
- **Never re-implement the split.** `POST /api/posts/thread/preview` is the
  client's only account of where a body breaks (`useThreadPreview`), and
  `lib/threadSequence` now places files on the messages that come back rather
  than cutting any itself. The splitter it used to hold broke at every blank
  line and took `***` as a divider; the server breaks on a CommonMark thematic
  break — three or more of a single `-`, `*` or `_` alone on a line — and with
  no divider anywhere packs the body to the ceiling. Two implementations in two
  languages is exactly what R2's explicit-segments design exists to avoid.
- **A message can be too long.** In manual mode the ceiling is not applied at
  all, so an over-long message is reported (`max_content_chars` with a
  `segment`) rather than cut. Length verdicts come off `preview.errors`, never
  from a count taken here.
- **`segment_index` is optional and NULL means the root.** A file nobody moved
  needs no index written for it. The server still answers **422** to setting one
  on a post that is not a `thread`, on the upload and the PATCH alike, and that
  PATCH is presence-aware — never send `segment_index` alongside `position`.

The rest of the back end's half is unchanged from R1: the submit path fills
Zernio's `threadItems`, the post-type rule carries `segmented` (which replaced a
hard-coded list of chain-capable networks here), attachment validation counts
per message, and `thread` is on the Threads entry in `supportedPlatforms`, so
`aheadOfPublishers` is gone with the vocabulary gap it covered.

**The one thing that held this back was the divider, and it is fixed.** The
live run on 2026-09-16 found `platforms.isRuleLine` taking three or more
**hyphens** while the divider this app writes is `***` — BlockNote's Markdown
serialiser emits the default rule marker and normalises a typed `---` to it, so
no author could put a hyphen rule in the body, and every authored thread came
back from the preview endpoint as one message with a literal `***` in the middle
of it. ogen#156 (merged 2026-09-16) widened the test to the CommonMark thematic
break and, in the same commit, made `char_count` measure the *visible* text
(`FlattenSocialText`/`VisibleLen`, a port of `lib/socialText.ts`) rather than the
raw Markdown — so `**bold**` no longer spends 8 characters and the auto-split no
longer cuts through a markup run. Both halves were the ask; neither is
normalised on this side. The flag came out on 2026-09-18. See
`docs/technical-decisions.md#thread-sequence`.
