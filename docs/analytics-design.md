# Analytics — design notes

The thinking behind the analytics surfaces, the decisions that came out of it,
and the scope deliberately left for later. Written before any of it was wired
to an API, so that the API shape would not quietly become the product spec.

Harnesses: `design/analytics` branch, at `/design/analytics`.

## Who it is for

Three journeys, on three rhythms. The rhythm is what determined the structure.

| | Rhythm | The real question |
|---|---|---|
| **Solo founder / personal brand** | Reactive — right after posting | "Did that land, and is it good?" Needs a verdict, not a number. Will never visit a dashboard on a schedule. |
| **Owner + assistant** (owner delegates ~90%) | Assistant weekly, owner monthly | Assistant: "did we publish as planned, and what should this week look like?" Owner: "is this working, and did we get customers?" Two people, one workspace, wildly different literacy. |
| **Agency member**, several clients | Daily triage, monthly reporting | "Which client needs me this week?" and "prove I earned the fee." |

Three findings that fell out and shaped everything below:

1. **Frequency inverts depth.** Daily visitors want one verdict; monthly
   visitors want the whole narrative. Ordering a page by *decreasing urgency*
   serves both without hiding anything behind tabs.
2. **The owner never logs in.** For that journey the digest email is the
   primary surface, not an export of a real one. (Deferred — see below.)
3. **Campaigns are universal.** Everyone is in a campaign, evergreen included,
   and an evergreen campaign carries the same meaning as a bounded one. There
   is no campaign-less path to design for.

## The primitive

Every screen is one comparison: **measure × sleeve × axis**.

- A **measure** is a number we can track (reach, interactions, engagement rate…).
- A **sleeve** is a named subset — a platform, an account, a theme, a format,
  how the post was written.
- The **axis** is what gets held up against what:
  - **time** — one sleeve against its own past. *What happened, and is it
    unusual?* Needs an **expectation**, not just a past number: a delta against
    last month says *different*, a value outside the band this workspace
    normally lands in says **unusual**, and only the second deserves someone's
    attention.
  - **sleeve** — two sleeves at the same time. *Where does the next hour go?*

An earlier draft split these into an opinionated "Overview" page and a
filterable "Explore" page. That was wrong: same data, same controls, two
products pretending to be different. One switch.

## The date lens governs the comparison and nothing else

This is why the surface is called **Analytics** and not Performance —
"Performance" promises a screen that only faces backwards.

- **Period-bound**: what happened, outcomes, side by side.
- **All time**: what we have learned — when posts land, how long they live,
  what wins. A 19-hour shelf life is a property of the content, not of March,
  and putting it under a window control implies changing the window changes the
  answer.
- **Ahead**: pacing, forecast, the action queue.

The last two say so on themselves, so the lens visibly does not reach them.

## Section order

Same on the workspace and campaign surfaces, because they ask the same question
of different amounts of data:

1. **What happened** — measures, deltas, expectation band, trend, insight
2. **Outcomes** — goals, at whatever rung they are measured at
3. **Performers and outliers** — both ends of the period, age-corrected, and the way out to a post
4. **Side by side** — sleeve ranking with a per-post column, and an allocation call
5. **What we've learned** — best times, shelf life, what works, what's fading
6. **What's next** — pacing, then actions

Most-asked to least, which is also the order a monthly digest would follow — so
one layout defines both.

## The card

Every card on these surfaces has the same four beats, in the order the question
arrives:

1. **Key figures** — one or more, selectable when there is more than one.
2. **The detail behind the selected figure** — its trend, or its breakdown.
3. **What we make of it**, and the to-dos it leaves.
4. **Notes** — provenance, coverage, caveats — last.

Selection is what lets one card carry five figures without becoming five cards:
the figures stay comparable at a glance, and the expensive space underneath
belongs to whichever one is being asked about. It also removes the reason to
duplicate a card per metric — the failure mode where a dashboard grows a
*Likes per platform* card beside a *Posts per platform* card beside a *Likes
over time* card, and the reader has to hold the comparison in their head.

To-dos are kept distinct from insights. An insight is a finding; a to-do is an
unfinished setup step the reader owns ("no target set", "connect a source").
Mixing them makes the findings look like chores and the chores look optional.

## Where each surface lives

| Surface | Lives | Entered from |
|---|---|---|
| **Post** | A section *under the notes and content*, collapsed until it has something to say | The post itself; drilled into from both the campaign and workspace surfaces |
| **Campaign** | A section within the campaign | Campaign sidebar, Overview card, drill-down |
| **Workspace** | Top-level sidebar item | Sidebar, the assistant, drill-up from a campaign |

Movement rules:

1. **The lens is sticky and global.** Date range and comparison survive every
   navigation. A filter that silently resets makes the same number look
   different and destroys trust in the whole screen.
2. **Every drill-down is a filter, not a new place**, and the breadcrumb states
   it in words.
3. **Zoom out is removing a filter**, not leaving.
4. **The action queue links back into work** — an empty slot opens the calendar
   at that slot, a decayed evergreen opens ready to re-share. Analytics that
   only leads to more analytics is a dead end.
5. **Two-way with the post** — from the numbers back to the post *with an
   action attached* ("write another like this" hands the winning attributes to
   the assistant).

## Honesty rules

These are correctness features, not polish. Each exists because breaking it
produces a screen someone acts on and shouldn't.

- **Never render a 0 that means "unknown."** Distinguish not-supported-on-this-
  platform, not-yet-collected, and genuinely zero.
- **Sample gates.** Ranking needs ~5 measured posts, a pattern ~15, a
  best-time grid ~30. A grid drawn from nine posts looks identical to one drawn
  from nine hundred.
- **Maturity is carried on the post**, not inferred at the call site. Ranking a
  four-hour-old post against a three-week-old one is the most common lie in
  social analytics. Immature posts get no percentile.
- **State coverage on every aggregate.** Someone will screenshot it into a
  client deck.
- **Never sum across platforms into one headline.** A LinkedIn impression, a
  TikTok view and an Instagram reach are three different events. Small
  multiples, or dimensionless rates.
- **Name the anomaly.** When one post carries 71% of a period, the headline is
  technically true and completely misleading. Say so, and offer the period
  without it.
- **Per-post alongside totals** in any sleeve comparison. A channel can lead on
  totals purely because it received three times as many posts.
- **Name the days.** "The 28 days before" makes the reader do arithmetic to
  find out what they are looking at, and any screenshot of it is undateable.
  The comparison says *Today vs 15 Jul*, computed from the period.
- **A chart and the number above it must be in the same unit.** The expectation
  band is a period *total*; drawn against a per-day line it is out by a factor
  of the number of days, which pins the line to the floor and reads as an empty
  chart. So the headline chart is a running total scaled to end exactly on the
  headline figure, and the band becomes a cone — nothing is unusual on day one.
- **A flow accumulates; a level does not.** Reach, interactions and clicks are
  earned day by day and total over a period — running total, cone-shaped
  expectation. Followers and engagement rate simply *are* a number on a given
  day; summing them produces a quantity that does not exist, so they are drawn
  as the daily level against a flat band. The measure carries which it is
  (`MeasureMeta.kind`) rather than the chart guessing, because the moment the
  figures became selectable, one wrong default would have drawn "cumulative
  engagement rate".
- **Correct a post for its age before comparing it to anything.** A
  four-hour-old post beside a settled one is a comparison of ages wearing the
  clothes of a comparison of quality. Excluding the young ones is the safe
  answer and the wrong one — the posts someone most wants to ask about are the
  ones from this week. So every reading is first divided through the
  workspace's own maturation curve, which produces two independent numbers, and
  they answer different questions: **where it lands** (`value ÷ share matured`)
  says how big, and **pace** (`value` against what a typical post had earned *at
  the same age*) says how good. Ranking is on the projection, so "most
  impactful" keeps meaning impact rather than seniority; the bands — ahead of
  usual, about usual, behind usual — come off the pace, which needs no
  extrapolation to be fair.
- **Under the curve's floor, refuse.** Below a few hours almost nothing has
  landed, and dividing by 0.04 turns a rounding error into a verdict. Those
  posts get their own band, showing what they have actually earned and no
  placement at all — visible, counted, unranked.
- **No curve, no bands.** The correction is read off this workspace's own
  finished posts, and until there are ~15 of them there is no *usual* for
  "ahead of usual" to mean. The section degrades to one raw ranked list that
  says the figures are uncorrected, rather than placing posts against a curve
  built from four of them.
- **Each row carries its share of the period.** One post at 24% of the month is
  the difference between a good month and one lucky afternoon, and no total
  above the list can tell those two apart.
- **One scale per comparison.** Sleeves share a pair of axes rather than
  getting a sparkline each; separately normalised lines draw a sleeve earning a
  third as much at the same height, which is the section's job done backwards.
- **Show the shape, not just the summary statistic.** A 19-hour half-life is a
  fact people nod at; the curve through 50/75/95% is the one they can act on,
  because the distance between the marks is the window in which a boost or a
  re-share still changes where the post lands.

## Weight

Analytics is dense, and dimming text is the cheapest way to make a dense screen
look calm. It is also the fastest way to make it useless — greyed-out text reads
as "safe to skip", so a screen where everything is grey is a screen where
nothing is read.

The ramp these surfaces use:

| Layer | For |
|---|---|
| **Primary** | numbers, findings, the sentence that justifies a headline, anything with an action attached |
| **Secondary** | the labels naming those numbers, honesty lines, section copy — read, not skimmed |
| **Tertiary** | provenance and furniture: sample sizes, legends, axis ends, the units under a bar |
| **Quaternary and below** | non-text only — dots, rules, dashes, band fills |

The test: cover everything below secondary and the screen should still answer
its question.

## Conversion — in scope, starting thin

An owner funds social on business outcomes, and no engagement metric answers
that question. The design ships before tracking exists by carrying the rung on
the goal:

| Rung | Signal | Cost to the user | What it may say |
|---|---|---|---|
| 0 | `unmeasured` | none | "You said this is for bookings. We can't see bookings yet." |
| 1 | `clicks` | none — platforms already report it | "340 clicked through" |
| 2 | `clicks` + **auto-UTM** | none — Ogen publishes the link, so Ogen stamps it | their existing GA4/Plausible can answer, even if Ogen never sees the data |
| 3 | `sessions` | connect an analytics source | "212 arrived at /book" |
| 4 | `conversions` | that source reports the goal | "18 booking requests" |

**Rung 2 is worth shipping on its own merits**, ahead of any dashboard work:
near-free, zero setup, and the prerequisite for every rung above it. It also
means a later integration backfills history rather than starting from zero.

The rule that makes the ladder safe: **nothing on screen may claim a rung it
isn't standing on.** A goal watched through clicks says *clicks through to
/book*, never *bookings*.

## Read against Zernio's analytics

Zernio is the publishing layer underneath, and its own analytics screen is the
closest thing to a control we have. What it does that we took:

- **Metric selection driving one chart.** Its engagement chart has a panel of
  toggleable metrics, each showing its own total. That is the right instinct
  and it is now the card pattern above — with one difference: ours is
  single-select, because its multi-select puts likes (4) and impressions (250)
  on one plot behind a dual axis, and two y-axes on one chart is a scale lie
  that no legend fixes.
- **A named best slot** under the heatmap, with the number of posts behind it.
- **Top performing posts** — the rung we were missing entirely between a
  workspace total and a single post. Ours is both ends rather than the top, and
  age-corrected rather than raw: a straight "top posts" list is ranked by
  publication date with extra steps.
- **Sync state**, last and next. Cheap, and it turns a stale-looking screen
  into a scheduled one.
- **Export**, which we have deferred into the reports work below.

What it does that we deliberately didn't:

- **Charts drawn from nothing.** A bar chart of three likes, a follower chart
  with two points, a "best time" grid resting on a single post — all rendered
  at full confidence. This is what the sample gates exist to prevent.
- **`new` as a delta.** Every measure with no history shows a green upward
  "new", which reads as growth and means "no comparison". Ours says there is
  nothing to compare.
- **Views, impressions and reach side by side** with no statement of how they
  differ, summed across platforms that each define them differently.
- **A card per metric per cut** — eight cards saying two things, with no
  ranking or verdict anywhere on the page. Nothing on it tells you what to do
  next, which is the difference between a dashboard and this.

Still worth taking, not built: **posting frequency against engagement**
("3–5/week is your cadence") as a pattern in *What we've learned*, and the
**follower breakdown per platform** on the followers figure.

## Deferred — documented and set aside

**Reports and digest email.** Out of scope for now. When picked up: a generated
report with the agency's branding, the client's period, editable commentary,
and a shareable link — plus a monthly digest for the owner who never logs in.
The section order above is already the digest's structure, so this is
packaging, not new analysis. This is the highest-value deferred item for the
agency and owner journeys.

**Workspace of workspaces.** The planned shape for agencies — a real object
with its own membership, sitting above workspaces, rather than a cross-workspace
strip that would cut against tenant isolation. Workspace is the top level for
now; nothing in the current design should assume it is the ceiling.

**Also not building:** a pivot/report builder · competitor tracking ·
real-time streaming · sentiment beyond a crude positive/negative ratio ·
industry benchmarks (a wrong benchmark is worse than none — percentile against
the workspace's own history does the job and works from week two).
