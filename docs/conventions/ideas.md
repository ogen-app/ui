# Ideas triage

Conventions for the Ideas module's verdicts, piles and triage. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **An idea is a question, `later` carries a date, and triage is the list**
  (shipped, unflagged). The module was imagined as a kanban and is not one: capture
  wants no structure and a board makes every decision cost a find, a grab, an
  aim and a drop, with an undecided column that grows to two hundred cards
  nobody scrolls. So the piles are counts you switch between and the three
  answers sit on the row they are about. It is **also not a separate triage
  mode** — the first pass had one, a full-screen keyboard session, and it was
  cut: the decision was never the slow part, reading the line is, and the line
  is already legible in the list. What the mode added was a place to go and come
  back from, a second set of controls to keep in step with the row's, and five
  single-letter claims on the app's keyboard. Triage has no letters of
  its own in `lib/hotkeys.ts`; don't re-add them for this. Three verdicts
  because two force every "good, but not this quarter" into a pile that lies
  about it. **A postponement names the day it comes back**, which is the
  difference between a maybe-pile and an archive people feel better about — and
  two rules follow that are easy to get wrong: waking is **derived**
  (`remind_at <= now`, read at query time; a woken idea is still `later` in the
  record, so nothing needs a sweep), and **every other verdict clears
  `remind_at`**, or archiving something you postponed pulls it back out of the
  archive on a day nobody chose. Everything is reversible — `no` archives and a
  decided row carries its undo: the three answers are always on the card,
  the one given pressed, and pressing it again puts the idea back on the
  desk — which is what makes one-click triage safe;
  deleting is final and reachable only from an opened row. The four counts
  always sum to the list, so a woken idea is undecided and **not** also later.
  **The rail's Ideas row draws the undecided count and never the backlog's
  size** (`NavPlaces`, only while no campaign is chosen): the pile is meant
  to be long, so a total would only ever climb, and the figure worth acting on
  is the one that falls as people answer.
  **The screen is one column wide throughout**, first run included: an empty
  state that was full-bleed while the list replacing it was narrow moved the
  page sideways under the person who filed the first idea. One component serves
  both levels: the campaign's page is `IdeasSurface` with `campaignId` set, and
  `campaign_id` is a *filter*, so filing an idea onto a campaign keeps its
  verdict and history rather than making a second row. **An idea is not a
  task** — a task is work already committed to and drains to zero, an idea is a
  candidate for commitment and its pile is meant to be long; merging them makes
  the task list stop draining, which is the one thing that kills a task list.
  Backed by `/api/ideas` since CON-315 — the contract in
  `services/api/ideas.ts` is what the server was built to, and the verdict
  rules are the server's to enforce now. See
  `docs/technical-decisions.md#ideas-triage`.
