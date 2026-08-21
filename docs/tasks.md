# Tasks — proposal

The design behind **Tasks**, the workspace's open work: what the system noticed
and what somebody wrote down. Requirements live in
[CON-234](https://linear.app/ogen/issue/CON-234); this file is the reasoning.

**What exists today:** the whole module, behind the `tasks` flag — off, because
its storage is a stand-in (see "Its storage is a stand-in" below). `/tasks` and
the sidebar row with its open count are built; `lib/tasks.ts` is the rule set,
pure and tested, and `lib/workspaceWarnings.ts` flattens the campaign attention
rules it raises from.

It is the near neighbour of [Activity](./activity.md), which is the record of
what *happened*, and the edge/level distinction the two rest on is written out
there under "Edges and levels". Read that first — everything here assumes it.

## What a task is

A third object beside the edge and the level, and the one it is easiest to
collapse into either.

> **A warning is a condition. A task is a record somebody made about it.**

A warning is derived, ownerless and true only while it is true — `1 post failed
to publish` in this campaign, computed by `lib/campaignReadiness` and shown on
the campaign's rail, where the fix is. A task is a *thing that was created*:
either by a person writing it, or by the system watching the warnings. It has
an author, an assignee, a moment it was made and a moment it was finished, and
it **outlives the warning that caused it**.

Most tasks come from warnings, and that is the whole of the relationship. A
task records which rule and campaign raised it (`source`), so the system can
recognise its own work and not raise it twice; a task nobody's data implies is
just as real.

Five rules follow, and each was a mistake in an earlier draft of this file:

- **Only `alert` and `risk` warnings raise tasks.** The hygiene nudges are
  decent advice and terrible work items; a list that fills with them is a list
  nobody opens. They stay on the rail.
- **Ticking a task does not fix anything.** The warning goes when the work is
  done, not when the row is ticked. A task ticked while its condition still
  holds is a judgement — *we know, it's fine* — which people need to be able to
  say, and which the system may not overrule.
- **A cleared warning resolves its task, it does not delete it.**
  `closedReason: 'auto'`, so the record and its assignee survive as history. If
  the problem returns, the same row reopens rather than a second one appearing:
  one row per rule, not one per recurrence.
- **Any task can be deleted, and deleting is final.** *I don't care about this
  one* is a legitimate answer to work the system raised, so a rule task is
  deletable exactly like a hand-written one, and neither comes back. A rule
  task's id is derived from its rule, though, so removing the row outright
  would have it raised again on the very next pass — deleting one leaves a
  `dismissed` tombstone, which is the only thing that makes the deletion stick.
  The *warning* is untouched either way: it stays on the campaign, where the
  fix is, and simply never becomes work again. Deleting is reachable only from
  the opened task — opening it is the confirmation step, and a hover-target on a
  row people are scanning past is not.
- **What happens to a task is an edge, so it belongs in the feed.** Written,
  finished, resolved-on-its-own: three entries. A task the *system* raised is
  deliberately not one — the task is the notification, and logging "the
  computer noticed something" beside it says the same thing twice.

That last rule is what ties this module to the feed without merging them: the
feed is what has happened, including what has happened to the tasks. The
dependency runs one way only — Activity never reads a task to decide anything,
it only reports what became of one (`taskEntries` in `lib/activityFeed.ts`).

## Two modules, not one screen

Tasks are **their own destination** (`/tasks`), directly under Activity in the
sidebar. Two earlier drafts got this wrong in the same direction. The first put
tasks in a card at the top of the feed: the most important thing on the page,
given the least room, and a permanent lid on a feed it had nothing to do with.
The second made them a tab inside Activity, which only moved the lid — every
visit to one was still a visit to the other.

They are two objects, opened at different times and for different reasons. The
feed is the thing you check; the board is the thing you come back to. Neighbours
in the rail because the feed is what *reports* the closures the board produces —
separate rows because they are separate work.

Splitting them is also what let each row carry its own figure: **open work** on
Tasks, **unread** on Activity. They were never summable — reading the feed
clears one and does nothing to the other. Both are drawn alike, in the row's own
hover grey: a count says how much of something there is, and two weights of grey
down one rail would rank the modules rather than the work.

One consequence of the split worth stating: raising and auto-resolving run on
the client, so **both** screens run the reconciliation pass — either can be the
one you open, and they can never be mounted together, so there is still only
ever one writer.

## A task is a line, and opening one expands it

Every task is **one row of one line** — tick, title, the description faded and
cut off behind it, the campaign's mark, the assignee's initials — so a board of
twenty is twenty lines rather than a page to scroll. Rows that grow to their
content are read as a ranking, the tall one looking like the important one, and
how much a task has to say about itself has nothing to do with its weight. (The
draft before this one held the height constant by giving every task a card and
clamping the description to exactly two lines. It cost four times the room per
task to show the same sentence.)

The cut-off preview does two jobs: it tells two similarly-titled tasks apart,
and it is visibly unfinished, which is what says the row opens. The title takes
the width it needs and the preview fills what is left — a long title is never cut
to make room for one — with a 96px floor under the preview, because two
characters of description are noise.

**Opening a task expands it in place**, one at a time. The description leaves
the row for a section of its own, whole, above the record of who raised it and
when, and the delete. No dialog: a task is a row in a list you are working
through, and covering the list to read one line of it is the wrong trade. The
same words are never in both places at once — the preview leaves the line when
the section takes it, or the expansion would look like it had done nothing.

The description itself: a rule task borrows its paragraph from the **rule**, not
from the row. Every campaign that trips `failed-posts` trips it for the same
reason and answers it the same way, so the explanation is catalogue copy keyed
by rule id, written once and re-worded without touching the tasks already
raised. Only a person's task carries words of its own. The paragraphs say what
to *do* — the title already carries what is wrong, and a description that
restates it at greater length is describing the sentence above it.

## Its storage is a stand-in

There is no tasks table, so the whole list lives as JSON in one tenant
key/value row — the same trade `campaign-accounts` makes while waiting for its
column. Three things that cannot fix themselves without the real endpoint, all
recorded on the `tasks` flag: every write rewrites the entire list, so
concurrent edits are last-write-wins; raising and auto-resolving run on the
client and therefore only while somebody has the page open; and assignment
writes an id but tells nobody, because there is no channel to tell them on
until CON-224. The row is workspace-wide and readable by every member, which is
right for shared work and is why nothing personal may go in a task.
