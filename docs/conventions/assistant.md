# The universal assistant

Conventions for the assistant rail, its threads, view context, offers, UI actions and every pack's result cards. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **There is one assistant, with one thread per scope** (CON-444/450/451).
  Every turn is `POST /api/assistant` with `{instruction, viewContext}`;
  threads are `workspace | campaign:<id> | post:<id>` and their history is
  `GET /api/assistant/threads/:scope/messages`. The per-subject
  `/api/{posts,campaigns}/:id/assistant` streams are gone server-side — never
  reintroduce a call to them. The campaign layout and the post editor bind
  their threads on arrival; every workspace-level screen binds the workspace
  thread through `useWorkspaceThread`, and only on the way *out* of a
  campaign, so browsing the thread list isn't interrupted. The campaign and
  post assistants are *packs* behind the one endpoint, and their events still
  stream through it.
  **The thread list is the server's** (CON-459): `GET /api/assistant/threads`
  through `useAssistantThreads`, every thread the *workspace* has — threads
  are shared, not one member's — merged under the tab's live copies by
  `lib/assistantThreads`. Never put threads in browser storage, and never in
  the store as a copy of the list: the store holds only what this tab has open.
  A row has no close: the history survives, so it would come back on the next
  read. A workspace switch calls the store's `reset()`, because clearing the
  Query cache doesn't reach it.

- **A turn carries what the user sees, as references only** (D3). The
  location is read once off the router (`useViewLocation`, mapping the deepest
  route through `lib/viewContext`'s `SCREENS` — **a new route the assistant
  should know needs a row there**, and a detail screen a row in `FOCUS`). A
  screen adds its selection, filter, window or visible rows through
  `useAssistantPage` (`useListAssistantPage` for a list); the store is
  token-guarded so a screen unmounting late can't wipe its successor's page.
  The scope is always the thread's; the screen is wherever the user is. A
  whole match goes out as `allMatching` plus the filter — the list endpoint's
  own query string — never as ids, and `buildViewContext` applies the
  server's caps. The composer's chip says what goes with the next message;
  its × sends that one message with the screen alone.

- **What a turn changed is refreshed from its `touched[]`**
  (`lib/assistantTouched`), never from per-subject rules: `refreshSubject()`
  is gone. A turn that never reached `complete` refreshes its whole subject
  (`subjectTouches`). A kind the server starts sending needs a case there.

- **The assistant's replies follow one grammar** (approved 2026-11-08,
  `components/assistant/blocks.tsx`). A box means it waits on the user — only
  an offer or a choice is bordered (`PendingBox`); results, answers and history
  are a small-caps status word, a headline and hairline rows (`ResultBlock`).
  Every generating result ends on one sources slot (`SourcesLine`): teal names,
  or amber "Not grounded" in the same place, followed by why — worded here
  from the grounding's `reason` (`no_sources`, `chosen`, `none_relevant`,
  CON-484), the server's `note` only for a reason this build lacks. Each name
  links its asset (CON-474), and a source also names the analysis and idea it
  came by, which nothing links yet. A tool that sends no `grounding` (a draft from pasted
  text) gets no sources slot at all, never "Not grounded". The user's message is a light
  fill, so the one dark thing in the rail is the next action. A finished turn
  under ten seconds leaves no timing behind. Labels — tool steps included — are
  worded at render time from the stored tool and input (`stepLabel`), never
  stored as sentences — and a finished step that sends `tool_result.step`
  (what it read or made, as counts and a name, CON-476) is worded from that
  instead, which lives only on the stream, so a reloaded thread's steps fall
  back to the tool's own label. The empty thread's centred starters are
  deliberately unchanged, except that on the Assets list its line says the
  chips lead with what the bank has waiting; starters themselves follow the
  screen and the selection (`StarterChips`), and in a thread already going
  they sit over the composer under ON THIS SCREEN. **An offer's card can say
  what it draws on and makes** (`proposal.card`, CON-476): a verb for the
  confirm, meta after the headline, detail rows by `kind`, sources with their
  kind's mark (`AssetTypeBadge`), a footnote, and a widen line that asks
  again with the server's instruction. Those words are the server's, like the
  summary, so they stay English in another language until CON-490 sends the
  facts behind them; only the row labels, the dates (from `start`/`end`) and
  the marks are ours. A confirmed offer says when (`answeredAt`, or the
  stored answer's own time). Outside the rail the same fact is the record's: a post's
  or idea's `grounding_mode` is drawn by `NotGroundedMark` — a hollow amber
  ring and the words, never a glyph alone — in the posts list's own column
  before Status, on its own line under a calendar card's title (budgeted by
  `cardRungs` as `notGrounded`), beside an idea's verdict, and on the post's
  Sources card as a sentence (CON-469/484) — only `exploratory` is marked,
  and `null` (nobody generated it) is unknown, never "not grounded". The
  Sources card says a grounded post is grounded, on that page only.
  draftPost's card is DRAFTED with a row per draft and its day — "not
  scheduled" only when none has one — enrichBrief's is BRIEF with a row per
  field, and revisePost's says its length before and after.

- **Offers run exactly as proposed** (CON-446). Bulk work, generating more
  than three items, the calendar and anything external arrive as offers
  (`proposal_created`). Confirming from the card is `POST
  …/proposals/:id/confirm`, streamed into a reply turn of its own with **no
  user turn** — the server records the answer as a `Confirmed: <summary>` /
  `Dismissed: <summary>` turn, which history draws as the resolved line, and
  which `settleHistory` reads to settle a reloaded thread's offers. That
  prefix is the server's fixed wording; change both ends together. A typed
  "yes" runs the same stored offer, and the composer says so while one waits.
  UNDO calls `…/actions/:id/undo` with the result's `undoId`; a 409 says why
  in its `reason` — `already_undone`, or `changed_since` with how many of how
  many (`undoRefused`), which a tag job draws as CAN'T UNDO.
  **A confirm re-checks first** (CON-467/482): an offer whose ground moved
  runs nothing and **stays open**, resolving `stale` with `reasons` and the
  fresh offer of what still holds (`replacedBy`; its card's `replaces`) —
  the same whether the yes was typed or clicked. The card is NOTHING RAN in
  amber with what changed, and the fresh offer is drawn under it as FRESH
  OFFER, not in its own turn. A yes after an offer's expiry resolves
  `expired`, and an open card also lapses on its own timer (`useLapsed`):
  EXPIRED, with ASK AGAIN, which sends the summary as a new message. A 409
  says which in its `reason` (`offer_expired`, `offer_answered`,
  `offer_replaced`); a server before CON-482 is still read off its fixed
  `Things changed since the offer: ` opening. **A resolved line ticks only
  what ran** (`ResolvedLine ran`), and a confirmed one says "Checked again —
  nothing changed" above it, because every confirm re-checks (CON-502 asks
  for a signal). A run that did part of the job carries `made` of `total`,
  `notMade` (with each miss's own `platform`) and a `retryProposalId`;
  `OfferOutcome` is PARTLY DONE "9 of 12 made" with what wasn't, and RETRY N
  confirms the retry offer — never drawn as a card of its own while it waits,
  ASK AGAIN once it has lapsed — and a retry that made the rest is DONE over
  both runs, found through the turn's `resolved` offers and the retry's
  `retryOf`. **A reloaded thread settles its offers from the server's
  `offers`** on each model turn (status, choice, expiry, `replaced_by`, links)
  rather than pairing them with answers by summary, which is kept only for a
  server that sends none. A choice's options are named buttons: the one
  marked `recommended` (at most one) dark with the tag and its `why`, the rest
  outlined; answered, it says "Chose: …". **An option can ask for a value**
  (`input`, CON-484): the card takes it in place — "Import a page" with a
  link field and IMPORT — and the confirm carries it; its button only
  focuses the field. A 409 `input_required` leaves the offer open and says
  so on the card.

- **The assistant can change the screen** (D5). A turn's `ui_action`s are
  applied in order when it completes (`useAssistantUiActions` registers the
  applier with the router; `lib/assistantUiActions.destinationFor` maps screen,
  campaign and focus to a route — keep it in step with `SCREENS`). A filter
  lands as the list's search params, which is why those pages name their
  params as the endpoint does. Ticking rows and opening a smart group are the
  list's own state, so the list picks the request up with
  `useAssistantRequest`. Each applied action keeps the address it replaced, for
  UNDO / BACK. `open_add_source` (CON-474) lands on Assets — the campaign's
  or the workspace's — with `add=upload|page|source`, by its `via` (CON-484):
  the upload dialog, the web page's, or ADD CONTENT offering both. It opens
  once and leaves the address, and the file or link is always the user's to
  give. While the user stays there and adds nothing, the page says the
  assistant opened it, with BACK — the same UNDO as the rail row
  (`stores/addSourceRequestStore`). Once the source is read the server
  offers the waiting request again (`assistant.offer.created` on
  `/api/events` reloads an open thread, `reloadHistory`), recorded as a
  "Source ready: “…”" turn — its fixed wording, drawn as a divider — and the
  fresh offer is an ordinary card. The assets pack's `import` is an
  IMPORTING card reading its asset live; `distill` says the run is queued
  (its ideas wait on CON-504).

- **The assets pack's results are cards** (CON-460). `complete.results.assets`
  holds each tool's last output in the turn — `ask` (what was searched, with
  page citations), `analysis`, `compare`, `campaign` (with its `undoId`) —
  and the core `listSavedViews` sits beside it as `results.savedViews`; the
  turn keeps them as `assets` and `AssetsResults` draws one card each. A
  follow-up that only reads (search wider, another lens, settle a
  disagreement) is sent on the click; one that writes (analyse) fills the
  composer. A smart group's OPEN goes through `applyScreenAction`, the same
  applier a turn's `ui_action`s use — always to the **workspace's** list,
  since smart groups load nowhere else, and the card says so inside a
  campaign. Each group is named by its stored filter in the list's own
  sentence (`useSavedViewText`, through `lib/smartFilter`'s
  `orderedTokens`, which `FilterPills` reads too). `readAssetsState`
  answers "how does the bank stand" as `results.assets.state`, in the REST
  endpoint's own shape (`parseAssetsState`). The Assets list's suggestions lead with
  what is waiting, read from `GET /api/content-bank/assets-state`
  (`useAssetsState`) — the same counts the assistant reads — and each shows
  only when its count is above zero.

- **The brand tools' results are cards too** (CON-461).
  `complete.results.foundation` holds each tool's last output keyed by **tool
  name**, and the brand check is `results.repair.checkBrand`; the turn keeps
  them as `foundation` and `FoundationResults` draws them. A family of tools
  fills one card (`addVoice` / `updateVoice` / `removeVoice` → the voice
  card), and the key that is present is the change it reports — there is no
  separate field. **An update says what it changed** (CON-477): `changes`
  is one row per field — the old value struck through, then the new one, or a
  list's lines added and removed — and the field is the server's slug, worded
  from the catalogue, never by the model; the card no longer restates the
  whole record and has no OPEN. Each fact tool (`addFact`, `updateFact`,
  `renewFact`, `removeFact`) is its own result. A bulk `editBrand` logs one
  undo id per change, so its UNDO asks for each and says "N of M undone" when
  only some came back; its headline is what it `made` ("Removed 6 facts"),
  and `kept` says what it left alone and why. `getBrand` runs before every
  edit, so what it read (`brand`: voices with their counts, the facts total,
  the look, the templates) is drawn only when the turn did nothing else —
  the expired facts, the templates on the Templates screen, the palette on
  the Look screen, a voice summary's "Read from" — by the screen the question
  came from (the asking user turn's `view`). The brand check is drawn with
  `FindingRow`/`FixActions`, the calendar's grammar, and IGNORE dismisses
  against each finding's own campaign, since one check can span several. A
  distill card reads its run live (`useDistillRun`), because the turn's copy
  is a snapshot; a failure with no sentence is worded as the read's own screen
  words its code. Series cards link to the campaign that runs them, where the
  rhythm is set. The brand tools touch `voice`, `audience`,
  `guardrails`, `series` and `brand_distill`, which `refreshTouched` maps onto
  the brand, series and readings keys — a kind it doesn't map refreshes
  nothing. A voice's rules are worded by the library's own `rulesLine`.

- **The repair pack's results are cards, and its findings are ignored by
  key** (CON-462). `complete.results.repair` holds each tool's last output:
  `checkCalendar` replays as the turn's `findings` (it also streams as
  `calendar_findings`, and the streamed copy wins), and `reviewCampaign`,
  `optimiseCalendar`, `applyCalendarMoves` and the post fixes
  (`changePostType`, `unschedulePosts`, `deletePosts`, each naming its posts
  since CON-478) are `RepairResults` — and so are the campaign pack's
  `briefReview` / `postsReview`, which answer in the review's shape. A
  finding offers 0..N fixes — the first as its button, the rest as "or …",
  all in one bordered-capitals style — and says what it costs (`detail`); its
  number is amber when it `blocksPublishing`. **A fix whose offer carries its
  own `card` or `options`** (a delete naming its posts, a type put back, a
  move's free slots) opens that offer under the row through `ProposalCard`
  instead of running on the click. Fix offers also arrive as the turn's
  `proposals`; `AssistantReply` hides those (and the optimise plan's, drawn
  inside the plan) from its list, and the row reads its fix's status from
  them: a confirmed one says "Fixed" with no buttons, which a reloaded thread
  settles from its "Confirmed: …" turn by summary. **What is ignored is the
  campaign's list**, `GET …/findings/dismissed` (`useDismissedFindings`,
  through `useIsIgnored`), so an IGNORE reaches every turn and survives a
  reload; IGNORE (`POST …/findings/:key/dismiss`) and RESTORE (`DELETE`, the
  store's `restoreFinding`) write it at once. The ignored ones sit behind
  "N ignored on this campaign · SHOW", each with RESTORE, and a review never
  says the brief and posts agree when its findings were only ignored. **The
  Overview's Warnings card carries the server's problems**
  (`useCampaignProblems`, read off `GET /api/campaigns/:id/overview`), and
  drops the client rules they cover (`post-type-dropped`,
  `scheduled-outside-window`, and since CON-468's `platform_not_targeted`
  `channel-dropped` — not its scheduled twin, whose alert says the posts
  still publish; `lib/serverCheckedRules`) once they have arrived, and only
  while the last read of them succeeded. A removed platform
  leaves its unpublished posts where they were — flagged, never deleted —
  and that finding is how they surface, with `enable_platform` among its
  fixes; but **a post already scheduled there blocks the assistant's
  removal** (CON-483): the offer turns into a choice, UNSCHEDULE N, THEN
  REMOVE or REMOVE LATER, with the card's footnote saying why. Removing a
  platform on Strategy doesn't ask, which is why the client keeps
  `channel-dropped-scheduled`. **A post outside its campaign's platforms or
  post types is flagged outside the rail** (`lib/campaignTarget`,
  `OutsideCampaignMark`): a warning row in the post's Quality checks, a mark
  on the calendar card and in the posts list. The campaign pack's result
  says what a platforms change `added` and `removed` — REMOVED "Facebook is
  off the campaign", with "no posts on it" or the posts it left by name
  (`kept`, "and N more") and how many it unscheduled first, which UNDO
  doesn't put back — and Strategy strikes what the assistant removed
  through, under a band saying so, until the page reloads
  (`stores/assistantRemovalStore`, cleared by its UNDO). A raised `goal`
  says its rate with the campaign's total, with UNDO (`campaign_goal`).
  The budget guard's options are ordinary choices, each with its cost line
  and the recommended one's `why`, and a choice card's footnote says why an
  option isn't offered; its "replace the weakest drafts" deletes for good
  and has no UNDO, and `OfferOutcome` draws it as one REPLACED card — both
  lists, the removed by score, and where the goal period stands — with the
  turn's own drafts card left out. Ideas saved instead say the days they
  target, with OPEN and UNDO (`ideas_created`). **Every campaign turn
  carries what it read** (`state`, `starters`; also
  `GET /api/campaigns/:id/assistant-state` through
  `useCampaignAssistantState`, re-read when a campaign turn completes): a
  reply cites the parts it says it relied on (`cites`, CON-511) in one quiet
  line ("Read from the campaign · April 14 of 20 · 2 conflicts · 4 of 8
  sources ready"), in its order, with a SOURCES card when it cites the
  sources, and a campaign's screens lead ON THIS SCREEN with its starters,
  worded here — chip and message alike, in the user's language — from their
  kind, `count` and `period`; the server's English `label` and
  `instruction` are only a fallback. A period is named from its data
  (`lib/goalPeriod`): a month as the month, a week by its days. A draft the
  REPLACED card lists without a score takes it when `assessment.completed`
  lands (`stores/freshScoreStore`). The Overview runs no
  assistant, so each of a problem's fixes — the first a bordered button, the
  rest "or …" — sends `<fix>: <problem>` to the campaign's thread, never a raw
  key, which answers with that finding's fixes as offers; a fix that is only a
  post to open is a link, a problem with no fix offers IGNORE alone, and FIX
  WITH OGEN in the header asks for all of them. Nothing on the Overview is
  folded behind SHOW MORE.

- **The analytics pack's results are cards, and every card cites its
  filters** (CON-463, drawn as CON-479 has them). `complete.results.analytics`
  holds each tool's last output, and every read is `{applied, data, summary}`:
  `applied` is what the read was actually narrowed to, and the card's last
  line prints it in the **scope bar's own words** — period · platforms ·
  campaign, the period as the picker names it (`applied.preset` →
  "Last 28 days", `lib/analyticsWindow`) and "All platforms" / "All campaigns"
  spelled out, so a card says what the screen says. A read no dates narrow
  (best times, decay, the publisher's cadence, lessons) cites "All time"; the
  cadence Ogen counts cites its weeks. `summary` is the server's reading of
  the rows — best times' best, runner-up and weakest slot (average
  interactions, a **count**), decay's half-life per platform, the weekly
  cadence, the followers' biggest day — and the cards draw it rather than
  ranking rows here. Figures are Plex Mono. `comparePeriods` is two columns
  and the server's change by its `unit`: points for a rate, the count for
  posts, a percent otherwise, a fall in amber. `services/api/assistantAnalytics`
  parses them; `AnalyticsResults` draws them. `moreLikeThese` makes **ideas,
  not posts**: the trail (post → idea → analysis → asset and its passages,
  `TrailRows`) is drawn on the **offer** (`card.trail`) and again on the
  result, since a confirmed offer collapses to one line, and an idea's asset
  opens at its passage on its analysis's lens (CON-487); OPEN lands on the server's `filter` on Ideas, and a run that saved
  none draws no DONE card. A post cited as a source (`kind: 'post'`) is named,
  never linked.
  **The dashboard's period, platforms and campaign are its address**
  (`lib/analyticsSearch`: `window` or `from`+`to`, `platform`,
  `campaign_id`), which is what `set_window` lands on. A campaign's Analytics
  tab is the same dashboard (`analytics/AnalyticsDashboard`) with the campaign
  fixed by its path and no picker, its period and platforms in its own
  address, never a `campaign_id`. It sends its window as the dashboard
  does, with its campaign. A `set_window` from it lands on the tab the action
  names (CON-498): the same tab, another campaign's tab for another campaign,
  and `/analytics` (screen `analytics`) for the whole workspace. The window the page sends carries the
  campaign and the picker's `preset`, and is what the composer's chip and the
  thread's markers say on either dashboard, through one wording
  (`assistant/useWindowWords`): a window the page sent is named as sent (it
  already holds only what the page counted, and a marker is history), and one
  the assistant set (`counted`) only by the platforms the page counts, its
  period as it lands (`offeredPeriod`). A set_window row names only what
  `changed`, offers BACK, and shows before → after — after a navigate too,
  where `before` is the window the dashboard opened with (CON-497/507); a
  navigate to the same route and campaign and its window are one row, worded and drawn by
  what moved from that opening window; the scope bar tints what the assistant
  changed (`stores/analyticsHighlightStore`) until the user's next touch. A
  set_window whose dates are only the period on screen resolved keeps the
  period a preset, and a preset the picker doesn't offer lands as its dates.

- **The workspace pack's results are cards** (CON-464, drawn as CON-480 has
  them). `complete.results.workspace` holds each tool's last output:
  `activityReport` (a day or up to 31 days: four tiles — published,
  scheduled, didn't go out, ideas decided — with every zero kept, the failed
  posts by title and reason, the days that had something, each opening
  `/activity/:date`, which days had nothing, and on a quiet run when the next
  post goes), `workspaceSetup`, `weeklyDigest`, `emailWeeklyDigest`,
  `postHistory` and `setAutoPublish` (with its `undoId`; it touches
  `auto_publish`, which refreshes the allowlist). A span is
  `formatDateRange`, never two dates glued together. The weekly report's
  figures and sentences are the email's own, rendered by the server for
  both, and only the labels around them are ours; a good change is muted.
  Emailing it names its recipients — the offer has a `recipient` row each —
  and the result is SENT to whom, or NOT SENT with each reason, someone
  outside the workspace pointed at Settings › People. A post's history is
  worded from each entry's `change` (a reschedule with its from and to, a
  failure amber with its reason), in the workspace's zone, names people from
  the workspace's members — an assistant change as "Assistant, asked by …",
  events included — and on the post itself offers VERSIONS; a version's note
  is the author's and shown as written. `workspaceSetup` is drawn twice: the
  connections (signed out since when, what waits on it, when a token
  expires, and a RECONNECT that goes through `runUiAction`, so it leaves an
  ON SCREEN row with BACK) and which platforms publish on their own.
  Turning auto-publish on or off **never re-routes a post already
  scheduled** — its route is set when it is scheduled — and the result says
  how many keep theirs. **`open_connect` opens Settings at the account or
  platform** — `?reconnect=<account>&platform=`, `?platform=` alone for a
  reconnect with no account, or `?connect=<platform>` — which outlines that
  row; one that needs reconnecting opens a dialog that says what happens,
  and only its CONTINUE starts the flow, because the flow leaves the app and
  that is the user's to start. An account Settings can't find lands on its
  platform's tile, and the rail row says so. The same address is what the
  expiry emails' `reconnect` link lands on.

- **The ideas pack's results are cards** (CON-465/466, drawn as CON-481
  has them). `complete.results.ideas` holds each tool's last output — found,
  a verdict and many, moved, deleted, compiled, drafted, `getIdea`,
  `editIdea`, `similarIdeas`, `ideasInCommon`, duplicates and merges — and
  `IdeasResults` draws one card each, with UNDO on every change the server
  can put back: a verdict, verdicts in bulk, an edit, and a compile
  (`post_created`, which deletes the planned post while it is as the
  assistant made it, and says "changed since" and how to delete it by hand
  after). A delete and a merge have none. Piles are named as the Ideas list
  names them, and a `later` idea past its `remindAt` is on the desk. **Every
  idea row opens exactly its idea** (CON-510): `ids=<id>&idea=<id>` on the
  Ideas pages, with its pile, so the list holds just it and opens it, then
  leaves `idea` out of the address. A card naming several ideas (FOUND
  reloaded, verdicts, moves, merges, a compile's ideas) has OPEN ALL, `ids=`
  with each of them, on their campaign's list when they share one and on the
  pile most of them are in. `ids` is a filter like any other — counted,
  saved with a smart group — and a clause you only remove ("limited to these
  6", `FieldKind` `fixed`).
  FOUND's SHOW ON SCREEN puts the `findIdeas` filter on the list through
  `runUiAction`, so it is a screen change with BACK; its headline names what
  the search named (`named`, CON-509) in the Ideas list's own clauses — "6
  ideas from Brochure", a left-out value "not from" — and an idea's source
  row leads with its asset's type mark, none when untyped. Bulk verdicts name
  their pile, day and ideas; edits are before → after per field; compiles
  show their theses and the ideas they were built from; in common is a theme,
  an angle, the lens and sources with counts, and where they split in amber.
  An analysed idea's edit refused with `tool_result.code` `idea_read_only`
  is a NOT CHANGED card. **Drafts made from ideas stream**: each
  `idea_draft_post` is the `post_generated` the draftPost sub-flow gives —
  with its date and its own campaign, so a workspace thread's drafts reach
  that campaign's lists too (`streamedElsewhere`) — and an `idea_draft` the
  rail draws as a card while the turn runs, "Writing 4 drafts · 2 done", until
  the summary replaces them; the one being written is named from
  `idea_draft_started` (CON-510) — "What the water does in March · LinkedIn",
  every idea of a together post — and "Draft 3 of 4" only before it says. **An idea open on the list is the turn's
  focus** (`ViewPage.focus`), which is what "this one" means, with its own
  starters; questions about a set need two ticked. `getIdea`'s fit is drawn
  by the Ideas list's own `FitSection`, compact in the rail. **An idea knows
  the passage it came from** (CON-487, `sourceAsset`'s flat `label`, `page`,
  `slide`, `startMs`…, read by `services/api/passage`): the source row names
  it ("Brochure · p. 12 · lens: offers") and OPEN lands there as `?at=`, the
  label the asset page already reads (`passagePlace`) — never by `chunkId`,
  which a re-ingest can reuse. Older ideas and ones from web pages or notes
  have none, and say only the asset and the lens.
