# Analytics — design notes

The thinking behind the analytics surfaces, the decisions that came out of it,
and the scope deliberately left for later. Written before any of it was wired
to an API, so that the API shape would not quietly become the product spec.

Harnesses: `design/analytics` branch, at `/design/analytics` — one surface (the
campaign), plus `/design/analytics/widgets`, where each card is shown against
every state it has to survive. The two answer different questions. A surface asks
"does the page hold together"; a widget page asks "does this card survive the
data it will actually be handed" — no comparison yet, no expectation to judge
against, half the posts unreported, nothing worth saying. On a surface those
states are invisible, because only one of them can be on screen at a time and it
is always the flattering one.

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

## Section order, and what is actually in scope

The full order, most-asked to least — which is also the order a monthly digest
would follow, so one layout defines both:

1. **What happened** — measures, deltas, expectation band, trend, when posts went out, insight
2. **Outcomes** — goals, at whatever rung they are measured at
3. **Performers and outliers** — both ends of the period, by whichever question is being asked, and the way out to a post
4. **Quality against results** — the score we gave a post before publishing, held against what it earned, element by element
5. **Side by side** — sleeve ranking with a per-post column, and an allocation call
6. **What we've learned** — best times, shelf life, what works, what's fading
7. **What's next** — pacing, then actions

**The campaign surface ships with 1, 3 and 4.** The other four are built, argued
over and rendered — at the foot of the campaign harness, under a dashed line
headed *Not in scope*. Two of them have no data path at all: Outcomes needs a
goal the API has no field for, and What we've learned needs Zernio's
add-on-gated insight endpoints, which answer `available: false` for a tenant
without the add-on. The other two are decisions nobody has made.

They are parked rather than deleted because the argument each card makes is the
expensive part and the code is cheap to keep compiling. What they may not do is
sit on the real surface: **a card on a screen is a promise that the number in it
is maintained**, and a half-backed card costs more than a missing one.

One control went with them. With Side by side out of scope the axis switch has
nothing to switch to — a two-way control that only ever reports the state it is
already in — so the surface carries the period lens alone, and with the axis
gone there was no bar left for it to sit in. It moved into the platform row,
where the rest of the scope already lived. The switch comes back with the
section.

## The card

Every card on these surfaces has the same beats, in the order the question
arrives:

1. **Header** — what this is, the window it covers, and at most one control.
2. **Key figures** — one or more, selectable when there is more than one.
3. **The detail behind the selected figure** — its trend, or its breakdown.
4. **What we make of it** — in a box, with the tone mark that says which way it
   cuts.
5. **What to do about it** — the to-dos and actions it leaves.
6. **Notes** — provenance, coverage, caveats — last, and plain.

Selection is what lets one card carry five figures without becoming five cards:
the figures stay comparable at a glance, and the expensive space underneath
belongs to whichever one is being asked about. It also removes the reason to
duplicate a card per metric — the failure mode where a dashboard grows a
*Likes per platform* card beside a *Posts per platform* card beside a *Likes
over time* card, and the reader has to hold the comparison in their head.

**Beat one is figures only when figures are the answer.** Performers and
outliers had four of them — how many posts landed ahead of usual, about usual,
behind, and too early to say — and they were a tally of the rows underneath.
Nobody opens that card to learn that three posts were ahead; they open it to
learn *which three*, and the counts were spending the top of the card
restating an answer the list gives by existing. What replaced them is the
control that decides what the list means: a picker for the criterion. The beat
is still "the thing the rest of the card is about", it just isn't always a
number.

To-dos are kept distinct from insights. An insight is a finding; a to-do is an
unfinished setup step the reader owns ("no target set", "connect a source").
Mixing them makes the findings look like chores and the chores look optional.

**Each fact is stated once, in the beat that owns it.** Density on these
surfaces does not come from too many numbers, it comes from the same number
arriving three times in different clothes. Campaign · What happened was saying
"this is unusual" on the tile, again in a sentence under the chart, and again as
a per-post insight; and "eleven posts are behind this" in the coverage line and
again as the insight's basis — six lines carrying three facts. The rule that
fixes it:

| Beat | Owns | Never |
|---|---|---|
| Header | the name, the window it covers, and at most one control | a figure, a finding |
| Figures | the number, its delta, and which side of usual it falls on | anything the reader can't select or compare |
| Detail | the shape behind that figure, and the band it is held against — drawn, not narrated | a restatement of the figure above it |
| Insight | what neither of those can say: *where* it came from, *what* moved it | method, sample size, caveats |
| Actions | what to do about it, and how urgently | a finding restated as a chore |
| Notes | provenance, method, coverage, what was left out, when the numbers last moved | a status mark, a colour, an emphasis |

**A note is not a finding, and it may not dress as one.** The line the beats are
policed on is *status*: a coloured mark says "this is a claim, and here is which
way it cuts", so it belongs where a claim lives — an insight's tone, a figure's
delta, an action's urgency — and nowhere else. The performers card had a
confidence dot on the sentence naming its maturation curve: a footnote wearing a
verdict's clothes, and a colour restating the sample size printed two words to
its right. Notes are one size, one colour, no marks, however important the
sentence feels; anything that has earned a mark has earned a box.

The corollary is that a card's foot is one note, not a stack of them. Three
short paragraphs of method out-weigh the list they qualify, and the reader who
came for the ranking reads a wall to find out that two posts were held back.

The casualty of the rule was the paragraph under the chart. It was the best
sentence on the card — "184.9K so far, against the 120K–165K this workspace
normally reaches" — and it was still the third telling of a fact the tile states
in two words and the band draws in one shape. An insight that opens by restating
the comparison spends its first line saying nothing; a basis that restates the
coverage line puts the sample somewhere the reader has already learned not to
look for it.

Two consequences worth naming, because both look like deletions of honesty and
aren't:

- **The window moved into the title.** "What happened" and "over last 28 days"
  are one phrase, and the corner of a card is where controls live — a window
  sitting there reads as something to change. Only a stretch takes *over*: the
  card says "What happened today" when the period is today.
- **Coverage stopped being a caption and became a switch.** How many posts have
  reported is no longer a line at the foot of the card; at zero it is the whole
  card, and above zero the figures are what they are. What survives at the foot
  is freshness, which is the one fact that applies to every number above it at
  once.

## Where each surface lives

| Surface | Lives | Entered from |
|---|---|---|
| **Post** | A section on the post — which post it is, an overview card, a card per measure | The post itself; drilled into from the campaign surface |
| **Campaign** | A section within the campaign | Campaign sidebar, Overview card, drill-down |
| **Workspace** | *Withdrawn for now.* Same composition over a wider set; nothing about it was wrong, there was simply no reason to review two arrangements of one set of cards | — |

**The post is a surface of its own**, and it is a stack of cards rather than
one: which post this is, an overview, then a card per measure. That was a card
until it had four charts in it — see below.

| Card | Holds |
|---|---|
| **The post** | Platform, account, format, when it went out, the way through to the real thing. No figure, no finding |
| **Performance overview** | Every figure the platform reported, how long they cover, the rank, the notes. No chart |
| One per measure | The figure, its comparison, its history, and a switch for how to read it |

**The identity card comes first, above the figures.** Everything below it is a
claim about a post — "better than 94% of yours", "+34% on a typical post", a line
climbing for twelve days — and none of it can be read, sent to anyone or argued
with until the reader knows *which* post, where it went and when. On a screen
reached from a list of eleven similar-looking rows, that is not something to
leave to the browser tab. It carries no figure and no finding, which is what
keeps it from competing with the overview: it is the caption on the surface
rather than the first of its cards. The date is carried twice on purpose —
absolute because that is the half that survives a screenshot, relative because
"4 hours ago" is the difference between a floor and a result — and it is the one
card that never withdraws, which is why it can hold the top.

**The overview holds every figure that came back**, in the order the cards below
it stack. It is the index of the surface: the whole answer without scrolling, and
a way to know before scrolling that the card for a given measure is down there.
It carries no chart, because a shape there would compete with the card below
carrying the same shape larger and would stop the tiles being comparable with
each other, which is the one thing they are for. It is also the card that
survives when no measure card can: a draft, or a post the platform has said
nothing about, is the overview alone saying which of the two it is.

It held reach and impressions alone first. Two figures are a headline and a
headline is right for a card; they are wrong for the top of a stack of seven,
where the reader's next question is always *which of these is worth scrolling
to*.

**The header says how long the figures cover** — "over its first 26 hours" — in
the same slot the campaign uses for "over last 28 days". Every figure on the card
is a total since publishing, and 7,210 reach is a different post at four hours
than at three weeks; the span is what makes the row readable rather than merely
true. It is not the same fact as the publication date on the card above: one is
when it went out, the other is how long it has been earning, and they come apart
the moment a platform stops reporting on a post that is still live. On the post
nothing has come back for, the span is most of the answer — forty minutes is
*why* the card is empty, and without it an empty card reads as a fault.

**The tiles break onto two lines** once there are five or more. Seven across a
content column are ninety pixels each: every label wraps, "Engagement rate" takes
three lines of its own, and the row reads as a strip of fragments. Split in half
— four and three — each tile is wide enough for its label and its figure to sit
on one line, which is the only thing that makes a tile worth being a tile. Below
five it stays one line, because 2×2 would be a card with more padding than
numbers.

Everything else the platform reported gets its own card, in the order reach,
impressions, interactions, engagement rate, saves, clicks, views. **A card
appears because its measure was reported** — an image post has no views, a post
with no link has no clicks — which is the same rule the campaign surface is built
on: a card is a promise that its number is maintained, and a measure that came
back empty is silent rather than zero.

This replaced a single card carrying four stacked charts under one switch. Two
things were wrong with it. The switch was a page control wearing a card control's
clothes, and it pinned every measure to one reading — but a running total is the
right opening picture for reach and the wrong one for saves, which arrive in a
handful of bursts and say nothing as a smooth climb. And the four measures were
fixed at four, so saves, clicks and views had nowhere to go.

The figure tiles and the comparison are the campaign's, on purpose. Only what is
compared differs — a period has a previous period, a post has *a typical post of
yours* — and that difference is carried on the chip, not in a second visual
language.

**Three readings, one switch, in each card's top-right corner.**

| | Answers | Notes |
|---|---|---|
| **Running total** | What has it earned | Default. Its last point is the figure at the top of the card — that correspondence is the reason it leads |
| **1H** | When did it earn it | Almost everything a post earns arrives in its first day, so this is the granularity the question is actually asked at |
| **1D** | The same, coarser | For the three-week-old post whose hourly reading is five hundred buckets and a flat tail |

One switch of three rather than a mode and a bucket on two controls. The pair was
honest and unusable: the bucket had no effect on a running total, so it had to
appear and disappear, and a control that comes and goes is a control people stop
trusting.

**The engagement rate is never a series.** It is interactions ÷ reach,
recomputed at whatever bucketing is on screen — the rate so far when the totals
are running, the rate it was earning at when they are not. A rate cannot be
summed into a day or accumulated into a total; that is the "cumulative engagement
rate" the flow/level distinction exists to forbid. Deriving it also makes it
impossible for the rate card to disagree with the reach and interactions cards,
because it is made out of them. Per bucket it carries a floor — fifty people
reached, or a fiftieth of the biggest bucket, whichever is larger — because one
interaction on one person reached is a 100% engagement rate and the quiet tail of
a post is full of them, enough to own the scale of the chart and press every hour
that mattered flat against the floor. A post small enough that no bucket clears
the floor says so in place of the chart, and points at the two readings that do
have enough behind them to divide by.

**This is the one thing on the post surface the API cannot yet answer.** The rows
are there — Zernio is swept every thirty minutes and the snapshots are kept for
ninety days, finer than the hour this is bucketed to — but no endpoint hands back
the history, only the latest figures. The ask is
`GET /api/analytics/posts/:id/series` with a granularity, over the snapshot
table. Until it lands every card degrades to its figure alone, which is a state
the harness carries (*Totals, but no history*) rather than an accident.

The other rules the cards hold to:

- **A young post is compared with young posts.** While it is still counting,
  "typical" means what a typical post had earned *by the same age*, read off this
  workspace's own maturation curve. A rate is the exception — an engagement rate
  is roughly itself from the first hour, so scaling it down would invent the
  mistake the correction exists to prevent.
- **A figure with nothing behind it is unreadable.** 18,420 is a career best or a
  slow Tuesday depending entirely on what yours normally are, so every figure
  carries both halves: how it compares with a typical post, and whether it is
  outside the usual range at all.
- **Silence is not zero.** A published post the platform hasn't reported on says
  so. A grid of zeroes there is a picture of a failed post rather than of a slow
  API.
- **The rank is a claim, so it lives in a box.** "Better than 94% of your posts"
  carries a tone mark and sits with the findings. The maturity — still counting,
  settling, final — is method, so it sits in the note at the foot with no colour
  at all, on the same line as the timestamp: both are provenance, and stacked
  they read as small print that grows every time something is added to it.
- **A chart is worth its height.** These are 128px rather than 64. Nothing about
  what is drawn changed — the viewBox is stretched, not re-projected — but a
  second wave, an overnight lull and a flattening tail are separations of a few
  pixels at the smaller size and legible at the larger. A chart nobody can read a
  bend off is a decoration.
- **Each card is on its own scale.** Impressions run an order of magnitude above
  interactions; one shared scale would press most of them flat. Per bucket the
  peak is printed beside the chart, so nobody reads two cards' heights against
  each other. On a running total it isn't, because the figure at the top of the
  card already anchors it.

What the post surface does **not** carry:

- **A per-account breakdown.** This screen is one post. A post that went out on
  four accounts is four rows on the performers card, where a row is already one
  post on one account — and adding a LinkedIn impression to an Instagram reach
  produces a quantity neither platform defines.
- **The workspace's maturation curve.** It was here as a stand-in for the series
  above, with a marker for where this post had got to. On a finished post there
  was no marker, so it was the same picture every time and said nothing about the
  post it was on. The curve is still the right chart for *What we've learned*,
  where it is a claim about the workspace; on a post it has been replaced by the
  post's own history. The age correction still reads off it — that never needed
  drawing.

It is reviewed at `/design/analytics/post` (the assembled stack) and
`/design/analytics/widgets/post` (each card against all eight states).

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

## When posts went out

The chart says *something moved on the 6th*. Only the rail under it says
*because two posts went out on the 5th* — and without that, every bend is
equally likely to be a post, a re-share, or a platform recounting yesterday.
Reading the shape at all otherwise requires holding the campaign's publishing
schedule in your head.

It is drawn **inside** the *What happened* card, between the plot and the dates,
rather than as a card of its own. That placement is the argument: a publication
mark means nothing except against the line above it, and the same marks in a
separate section would be a picture of publishing cadence — a different question,
already answered by the `published` measure and by pacing in *What's next*.

- **One mark per post, not per day.** A day that published three and a day that
  published one are the difference between a burst and a routine, and that is
  usually the thing explaining the bend. Marks on the same day spread across that
  day's own slot, so a cluster still reads as one day.
- **The alignment follows the chart's own geometry.** A line puts its points on
  the edges (`i / (n − 1)`); columns own a slot and sit in the middle of it. Using
  one rule for both would drift half a day out at one end — precisely the quiet
  wrongness that gets a bend attributed to the wrong post.
- **Outside the window is dropped, never clamped.** A post pinned to the first
  day meaning "some time before this" is a wrong answer wearing a precise one's
  clothes.
- **No colour, no height.** A mark is a fact — this went out. Every status mark
  on these surfaces is a claim, and sizing marks by what the posts earned would
  make a second chart, on a scale nothing declares, competing with the one it
  sits under.

The posts come from their own list on the view rather than from the performers
card's, because that list is filtered to what can be *ranked*: a post nothing was
reported for is missing from it, and that is exactly the post someone is trying
to account for. On the API side this is the one field the rail needs that the
existing shape does not carry — publication timestamps for every post in the
window, ranked or not.

## Quality against results

Every post can be scored before it goes out (CON-85): four elements —
correctness, clarity, engagement, delivery — each 0–10 against an anchored
rubric, rolled up by the server into one weighted percentage. It is the only
thing this workspace knows about a post *in advance*, and until this card
nothing ever checked it against what the post then did.

**Quality is a sleeve, not a measure.** Nothing about the score is measured: it
is a judgement made from the words alone, before a single impression existed. A
`MeasureId` sitting in a row of tiles beside reach would be read as an outcome
within a week. What it is instead is another way to cut the posts — the same
kind of thing as platform, format or weekday, and the only one of them that
describes the *decision* rather than the post. `quality` is in
`SLEEVE_DIMENSIONS` accordingly, and Side by side will take it at the coarse
overall band when that section comes back.

**It gets its own card anyway, ahead of Side by side**, because the interesting
cut is *inside* the dimension. Delivery and Engagement can point in opposite
directions, and one row per sleeve cannot show that — a single "Quality band"
row would average away the only finding on the card. So the figures beat is the
five elements, each carrying what a better score on it actually bought, and the
detail is the selected element's three bands.

**The card is built to be able to say no.** This is the whole design constraint.
A card that could only find agreement between the score and the result would be
worthless as evidence for keeping the scoring — so a flat element reads as flat
and an inverted one reads as inverted, in the same clothes as the one that
works, and the tile's tone mark says which. The fixture is deliberately a
workspace where the overall score predicts nothing: Delivery is worth 2.2×
against typical, Engagement runs backwards at 0.5×, and rolling the two into one
number cancels both. That is the case for reading the elements rather than the
score, made by the card about itself.

The rules that make the comparison defensible:

- **Bands, not a coefficient.** Thirteen posts do not support a correlation and
  nobody can read one anyway. Three bands — the app's own Good / Workable / Weak,
  the same thresholds the post editor's panel bands on — turn it into "these
  posts against those posts", which is a claim the reader can check by opening
  two of them.
- **Compared on the performers card's criteria.** The bands hold posts of every
  age by construction, so ranking them on a raw total would rank them by
  seniority — the age lie the rest of this surface is built to avoid. `criteria.ts`
  already solved it, and reusing it means *did better* means one thing across the
  surface rather than two. The picker is the card's one control, and switching it
  genuinely moves the finding: on this workspace Delivery buys reach and
  Engagement buys interaction rate, and the two elements swap ends when the
  question changes.
- **Medians, not means.** One post at a quarter of the campaign lands in whichever
  band it lands in and would drag that band's average wherever it liked; the
  card's finding would then be an artefact of a single post, which is the exact
  failure the anomaly rule elsewhere exists to name.
- **No variance is not no sample.** An element every post clears is a floor, not
  a lever, and the tile says so rather than folding it in with "too few posts" —
  the advice the two deserve is opposite, and "publish more posts" is exactly
  wrong for the first.
- **Every band is drawn, including the empty ones.** A band that disappears when
  nothing scored into it turns *we never write anything weak* into a card that
  merely looks like it has two bands, with nothing on screen saying which.
- **Scored-then-edited is excluded and counted.** The score describes words that
  never went out. Dropping those posts silently would leave a coverage line the
  reader cannot reconcile with the campaign they are looking at.

**It sits outside the date lens**, alone among the cards built on posts, and says
so in its own header. Whether an element predicts anything is a property of the
content rather than of the last 28 days — the same argument that keeps best-times
out of the lens — and the sample settles it: three bands need more posts than a
four-week window on one campaign will ever hold. Under six comparable posts the
bands are not drawn at all.

**What the API cannot answer yet.** `GET /api/posts/:id/assessment` returns one
post's stored evaluation, and there is no bulk path — so this card is a design
against an assumed contract. The ask is the score alongside the post rows the
analytics response already carries (`overall_pct`, the four element scores, and
the assessment's timestamp so *edited since scoring* can be decided server-side),
or a `GET /api/analytics/quality` if it is cheaper to compute there. Until then
the card renders from fixtures only.

Reviewed at `/design/analytics/widgets/quality`, against seven states: the
ordinary case, every post scored the same, too few scored, no maturation curve,
every score out of date, scored-but-nothing-back, and nothing scored at all.

## Honesty rules

These are correctness features, not polish. Each exists because breaking it
produces a screen someone acts on and shouldn't.

- **Never render a 0 that means "unknown."** Distinguish not-supported-on-this-
  platform, not-yet-collected, and genuinely zero.
- **Sample gates.** Ranking needs ~5 measured posts, a pattern ~15, a
  best-time grid ~30, a quality band ~3 before it carries a figure. A grid drawn
  from nine posts looks identical to one drawn from nine hundred.
- **A card that can only agree is not evidence.** Anything holding one of our own
  judgements against a result — the quality score today, the assistant's
  suggestions later — has to be able to report that the judgement was worthless,
  in the same clothes it reports success. Otherwise it is a screen that confirms
  whatever it is shown, and the first person to notice stops believing the rest
  of the surface too.
- **Maturity is carried on the post**, not inferred at the call site. Ranking a
  four-hour-old post against a three-week-old one is the most common lie in
  social analytics. Immature posts get no percentile.
- **State the sample under a claim, not under a number.** Someone will
  screenshot a finding into a client deck, and "five placed posts — a lead, not
  a finding" has to travel with it. A raw figure is not a claim and does not
  need the sentence; repeating it there is how the sample ends up in the one
  place readers have learned to skip.
- **Nothing reported is not zero.** A period whose posts haven't come back from
  the platforms yet keeps its chart frame with an empty plot — *Data will appear
  here*, and under it *No data yet*, with how many posts are waiting. Never a
  line along the floor of an axis: that is a picture of *no reach*, and what is
  true is *no numbers*. The frame stays for a second reason — it holds the space
  the chart will take, so the card doesn't grow one under the reader an hour
  later, which reads as the page changing its mind.
- **Name the quantity in the label.** "Reach" and "Followers" side by side
  invite both to be read as period totals, and one of them is where the number
  stands today. The tabs say **Cumulative reach**, **Cumulative interactions**,
  **Daily engagement rate** and **Current followers** — a word each, and the
  ambiguity is gone everywhere the name appears.
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
  The comparison says *Today vs 15 Jul*, computed from the period — and the
  charts carry the same rule on their x-axis: dated ticks read off the series,
  with faint verticals so a bend in the line can be given a date without
  counting pixels from the left edge. Only the last tick is a word, because
  *Today* is the one label a date cannot carry.
- **A filter that changes the numbers has to show it.** The platform filter
  reaches every figure on the page, and a filtered dashboard that looks
  identical to an unfiltered one is how two platforms end up in a board pack as
  the quarter's reach. It carries that in the marks rather than in prose: the
  platform logos used everywhere else in the app, brand-coloured while counted
  and greyed while not, each with its connected-account count on it, because
  "Instagram" means something different at one account than at four — and a
  platform with none is drawn as an empty seat rather than a switch, since a
  control that can only be used wrongly reads as broken. No heading and no
  running total above it: a row of platform logos does not need to be told it is
  a row of platforms, and the counts that matter are the ones on the marks, read
  at the same moment as the platform they qualify. One `SELECT ALL` /
  `DESELECT ALL` control stands at the end of the marks, beside what it acts on
  — it flips rather than sitting beside a twin, because at "everything counted"
  the only useful move is to clear and once anything is off the only useful move
  is to restore.
- **Scope is one line, not two.** The platforms decide what is in the numbers
  and the period decides how far back they reach; nobody reads one without the
  other, so they share a row — marks on the left, period on the right. On its
  own row the period read as page furniture rather than as half of what every
  figure below it means. The row never withdraws: a workspace with one connected
  platform loses its marks, because every state of that filter shows everything
  or nothing, but the period stays and the page keeps its shape.
- **A chart and the number above it must be in the same unit.** The expectation
  band is a period *total*; drawn against a per-day line it is out by a factor
  of the number of days, which pins the line to the floor and reads as an empty
  chart. So the headline chart is a running total scaled to end exactly on the
  headline figure, and the band becomes a cone — nothing is unusual on day one.
- **A flow accumulates; a level does not.** Reach, interactions and clicks are
  earned day by day and total over a period — running total, cone-shaped
  expectation. Followers and engagement rate simply *are* a number on a given
  day; summing them produces a quantity that does not exist. The measure carries
  which it is (`MeasureMeta.kind`) rather than the chart guessing, because the
  moment the figures became selectable, one wrong default would have drawn
  "cumulative engagement rate".
- **A rate carries nothing over from yesterday, so it gets columns.** Three
  chart forms, chosen by the measure (`MeasureMeta.chart`): a **running** total
  for a flow, a **level** line for followers — today's figure *is* yesterday's,
  plus or minus — and **columns** for a daily rate, which is re-derived every
  day and is seven separate answers to the same question across a week. A line
  through them claims a continuity that does not exist, and bridges straight
  over a day that published nothing and therefore has no rate. Columns stand on
  zero and are not negotiable about it: a column is read by its area, so a
  cropped baseline exaggerates every difference on the chart. The usual-range
  band does that job instead, drawn as two dashed edges *over* the columns —
  behind them it is hidden by the very bars it is there to qualify.
- **Correct a post for its age, or ask a question age doesn't change.** A
  four-hour-old post beside a settled one is a comparison of ages wearing the
  clothes of a comparison of quality. Excluding the young ones is the safe
  answer and the wrong one — the posts someone most wants to ask about are the
  ones from this week. Two ways out, and the performers card uses both. **Divide
  through the curve**: `value ÷ share matured` is where a total lands once the
  post finishes, so "biggest" keeps meaning impact rather than seniority. Or
  **rank on a ratio** — interactions per person reached, saves per thousand —
  which is roughly the same at hour six as at week three, because both halves of
  it arrive together. `pace` is the same trick on a total: this post against
  what a typical post had earned *at the same age*, dimensionless, so it needs
  no extrapolation to be fair.
- **"Best" is a question, not a fact.** So the card asks it: one picker,
  changing what the two lists are ranked on, and the order genuinely moves. A
  post can be the biggest thing in the period and the worst in it at turning
  attention into anything, and a single ranking hides whichever of those the
  reader came for. Clicks are deliberately not among the criteria — a click is
  only meaningful against the place it went, which is the Outcomes card's job.
- **Refuse, never rank last.** A post whose platform reports no saves, or one
  seen by too few people for a rate to mean anything (three interactions from
  forty is 7.5%), leaves the ranking and is counted at the foot of the card.
  Ranking it last would blame the post for a gap in the data, and it is the
  bottom of a list that gets screenshotted.
- **Under the curve's floor, refuse — but only the criteria that need it.**
  Below a few hours almost nothing has landed, and dividing by 0.04 turns a
  rounding error into a verdict, so reach and pace decline to place those posts.
  A rate reads fine at that age, which is why this morning's post is still
  present and rankable on one.
- **No curve, no correction — and the ratios carry the card.** The correction is
  read off this workspace's own finished posts, and until there are ~15 of them
  there is no *usual*. Pace leaves the picker entirely, the reach column renames
  itself *reach so far*, the bars lose their centre and fall back to the best in
  the list — which the note at the foot says — and the card still works, because
  the question a ratio asks never needed the curve.
- **Every figure against your own typical, under the figure it qualifies.**
  5.0% is a good engagement rate or a poor one depending entirely on what yours
  normally is. The comparison is a diverging bar on the row's second line rather
  than a *vs typical* column three columns to the left: as a column it made the
  reader carry a number across the row in their head, and under the figure the
  pair reads as one statement. It is also what stops "Worst 5" being read as
  *bad* — in a strong period the bottom five can all sit on the right of the
  centre line, and the bars say so before the heading does.
- **A rate carries its denominator; a total carries its share.** Every row shows
  how many people it was seen by, because that is what every rate here is over —
  and *and counting* rides on that reach rather than on the date, because what
  is unfinished about a young post is the number, not the post.
  A post carrying a real slice of the period says that too, and only then: one
  post at 24% of the month is the difference between a good month and one lucky
  afternoon, while "0.4% of the period" is a fact about arithmetic.
- **One row, one account, one platform.** A workspace running four Instagram
  profiles asks *which one* long before it asks which platform, which is why the
  row leads with the account picture and names the account beside the title —
  four profiles wear the same badge. The same post sent to four accounts is four
  rows, never one: totalling them would add a LinkedIn impression to an
  Instagram reach, a quantity neither platform defines, and it would bury the
  finding, which is that the same words worked on one account and nowhere else.
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
  either age-corrected or ranked on a ratio rather than raw: a straight "top
  posts" list is ranked by publication date with extra steps.
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

**A charting library.** Reconsidered when the x-axis needed dated ticks, and
declined again. `@tanstack/react-charts` is real but pre-1.0 — 26 versions in
its first fortnight, and it has already turned itself into a compatibility shim
for `@tanstack/charts/react`. Every chart here is a polyline, a band or a grid
of rectangles drawn on semantic tokens; the ticks cost about thirty lines. Worth
revisiting if these surfaces ever need brushing, zoom or tooltips at a point,
which is the work a library actually saves.

**Links out of a finding.** "See those two posts", "see the period without it",
"write another like these" — every one of them needs a destination that doesn't
exist yet: a filtered post list, a period recomputed with a post excluded, an
assistant briefed with a set of attributes. Removed rather than stubbed, because
a dead link under a finding costs more trust than the link would have bought.
The wording of each is worth keeping when the destinations land — they are the
list of drill-downs this design actually wants. Note that to-dos are unaffected:
an unfinished setup step ("connect a source") points at a page that already
exists.

**Also not building:** a pivot/report builder · competitor tracking ·
real-time streaming · sentiment beyond a crude positive/negative ratio ·
industry benchmarks (a wrong benchmark is worse than none — percentile against
the workspace's own history does the job and works from week two).
