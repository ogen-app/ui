# Brand materials — the concept

**Status: concept. Nothing is built.** This is the argument, written down before
the prototypes so the prototypes can disagree with it. It contradicts CON-226's
opening framing in two places, both noted where they arise: a workspace has a
**cast** of voices rather than one (§5), and the screen is **neither** pure
slots nor an open list but both, split by whether you would ever want a second
one (§4, §12). CON-226 and CON-227 have been cut down to match this document.

Related: CON-226 (parent), CON-227 (UI), CON-228 (BE), CON-211 (why the
workspace level comes back at all), CON-210 (assets become campaign-owned),
CON-132 (image templating), CON-105 (image generation), CON-222 (URL as an
asset), CON-206 (post types move server-side).

---

## 1. The problem

People use social media to be *distinct*. That is what branding is for.
Generated content is un-branded by default: it has no voice of its own, no
look, and nothing stopping it from sounding like every other generated post on
the platform. A tool that generates content and does nothing about this is
actively producing the thing its users are trying to avoid.

So the workspace needs somewhere to keep the material that makes its content
*its own*.

## 2. Why this is not just assets

Assets are **cherry-picked**: you attach one to a post because that post is
about it. Brand material is **ambient**: it applies to everything unless
something says otherwise, and the interesting interactions are *fine-tuning*
and *opting out*, not *attaching*.

That difference in verb is the whole justification for a separate module.
Storage may end up looking similar; the application semantics do not, and it is
the semantics the UI has to express.

It is also the answer CON-211 was waiting for. The workspace-level Content Bank
failed because it was the same *kind* of thing as a campaign's material, only
wider — so it read as a bin. Brand material is a different kind of thing: true
in January and true in June, true of the launch campaign and the recruitment
campaign, and the thing that must not drift.

## 3. We already have this feature, three times, with no memory

Worth stating first, because it changes what this work is:

- `Campaign.tone_guidelines` — free prose, retyped on every brief, and
  `campaignReadiness` treats it as a required field, so every campaign nags for
  it.
- `Campaign.target_persona` and `key_messages` — same, and same.
- `DraftPost.toneNotes` — the content-plan flow emits a tone note **per
  generated post**, invented fresh each time.

Nothing here is a new capability. It is the same field entered at the wrong
altitude, forgotten between campaigns, and re-hallucinated per post. This work
gives `tone_guidelines` somewhere to live above the campaign, and gives
`toneNotes` a vocabulary to choose from instead of inventing one.

That also means the consumer already exists. We do not have to build the thing
that reads brand material before we can tell whether brand material works.

## 4. The primitive: a reference, a local delta, and promotion

One pattern, used everywhere in this module. Every field wants the same three
things — pick from a library, write your own, or pick and then bend it:

> **a reference to a Brand entity, plus an optional local delta, where the
> delta can be promoted into a new library entry.**

For prose the delta is appended text. For structured values it is changed
fields. Same model, two renderings.

**Promotion is the half that matters.** Nobody sits down to author a brand
voice. They write a good one-off note for one post and then want it again next
week. So the library must fill *from the work* rather than from visits to a
settings screen:

- a note you wrote on a post → *save this as a voice*
- an image composition that worked → *save this overlay*
- the same adjustment written four times → *make this a voice?*

Templates (§9) get a workspace to sixty percent in one click. Promotion is what
gets it to something nobody else has. Both are needed; only the second produces
a brand.

**Build this once.** Four pickers built separately — voice, audience, overlay,
image — read as four features sharing a screen. One primitive, applied four
times, reads as one idea, and gives us one set of empty states, one *save to
Brand* flow, and one way of showing where a value came from.

## 5. Voices

A voice is: a name, a one-line *when to use this*, **three to eight real
samples**, explicit rules (emoji, hashtags, formality, first person, length
habits, how a post opens), and optional per-channel notes.

**The samples are load-bearing.** A voice defined as "witty, bold, human"
produces nothing. Five posts you would be proud to have written produce a lot.
This is the one place where more input is straightforwardly better.

**A workspace has several voices, and that is normal.** The standard industry
advice is one voice with situational tones. It does not survive contact with a
real case: heavy British sarcasm for news commentary, a finfluencer register
for Friday jokes, and mundane corporate for the company page are not three
tones of one personality. They are three voices. The tools that do this
seriously — Jasper's sub-brand voices, for instance — treat multiple voices as
first-class, and so should we.

**Per-platform variation lives inside a voice, as notes — not as an axis.**
"Dialled down on LinkedIn" is one voice with a note. Three voices times five
platforms as independent dimensions is a fifteen-cell matrix nobody maintains.
This keeps the count at *number of voices*.

## 6. Audiences

Separate from voices, because they cross: the same corporate voice addresses
two audiences, and merging them multiplies the list.

The design brief for audiences is a behavioural observation rather than a
feature request: **left to a blank box, people describe a fantasy.** "Reach and
generous successful people" is the predictable answer to a question nobody has
a good way to answer. So the audience picker is a *corrective*, and has to be
built as one:

- **Concrete and narrowing.** Not "professionals" but "retail investors, 30–45,
  already hold index funds, distrust anything that sounds like a pitch, read on
  mobile in the evening."
- **Show the consequence, not the label.** Each audience says what follows from
  it — where they read, what makes them scroll past, what proof they need
  before they believe a number. Then choosing is informative, and the fantasy
  answer visibly has no consequences attached.
- **Never block the fantasy.** Make the good path one click and the fantasy path
  require typing.

## 7. Guardrails

Facts, claims we may make, claims we may **never** make, banned words, and the
disclaimer every post has to carry. Applied to every generation regardless of which voice is chosen —
never selected, never overridden.

This is the part with real weight rather than decoration. A sarcastic post and a
corporate post about the same regulated product must be factually identical and
must both avoid the same promises. A brand module without this layer is styling.

## 8. Binding and resolution

Deliberately small. **Bind only to things that already have names — no
conditions, no rule engine.**

```
workspace has a cast of voices
    → a campaign picks which of them it uses
        → each post carries one, shown with where it came from, changeable
```

*(This answers CON-226 §6 Q2 — "does a campaign ever override a brand material,
or only inherit it?" — with: it picks, and the post picks again. Three levels,
and no fourth. Binding at phase, post type or account was considered and cut: a
campaign carrying a cast plus a per-post assignment expresses every case we have
with one fewer concept, and each extra level is a place the resolved value has
to be explained.)*

The plan generator **assigns the voice as it plans** — it already emits
`toneNotes` per post, so twelve Friday slots get the Friday voice at generation
time rather than by twelve manual corrections afterwards. Correcting the odd
wrong one is a job people will do; overriding every one is not.

### Live links are safe, and here is why

An earlier draft of this argued the voice must be resolved once at post creation
and never re-resolved, so that editing a campaign could not silently rewrite
thirty drafts. That conflated two things:

- **The post's text is already written.** Nothing changes it retroactively.
- **The reference is an input to the next generation**, not a live filter over
  existing output.

So the link stays live. Editing a voice changes what happens on regeneration and
changes nothing that exists. One honest touch follows: when a voice has changed
since a post was written under it, the post can say so — which is not a warning
but a useful prompt to regenerate.

## 9. How a Brand starts

**The blank form is the escape hatch, not the default.** Nobody's first act
should be authoring a voice from nothing.

The trap to avoid is stacked tone adjectives — witty + professional + bold —
which is a colour picker where every swatch is grey, and which is documented to
fall apart for anything unconventional. The fix:

> **Show the voice, do not name it.** The picker renders *the same sample post*
> in each candidate voice, side by side. That is the whole screen.

Three ways a voice arrives, best first:

1. **From the website.** CON-222 already scrapes a URL to Markdown with images.
   Point it at the customer's site and propose an entire Brand in one step:
   voice samples from the copy, the disclaimer, product facts, palette, logo. This
   is assembly of machinery that exists, and it is a better first run than any
   picker.
2. **From posts already published.** "Here's the voice you already have, fix
   what's wrong." Produces something the user recognises.
3. **From our library.** For the true cold start. **Few and opinionated** —
   eight to twelve, not sixty; a library that needs search has failed. The app
   already makes this move with campaign types (pick one, get its phases), so
   there is internal precedent.

**A template is forked, never linked.** Once picked it is yours and it diverges.
A live link would mean improving our template silently rewrites a customer's
voice. Keep the provenance line so a reset is possible and so we learn which
templates get adopted and which get abandoned.

**Starter bundles** — voice + audience + guardrails in one action — are fine for
the first thirty seconds, but they unbundle immediately into editable parts.
Bundle for speed, separate for structure.

**The risk, stated plainly:** if templates work as intended, every customer
picks from the same twelve voices and we have relocated the un-branded problem
rather than solved it. So **the template's job is to be replaced.** The screen
should keep asking for samples, and paths 1 and 2 above are valuable precisely
because they start you somewhere nobody else is.

## 10. What the brief becomes

This is where the module pays for itself. The brief today is four prose boxes,
three of them retyped every campaign and two of them nagged about:

| Field | Becomes |
| -- | -- |
| `tone_guidelines` | a **reference** to voices from the Brand — stops being prose |
| `target_persona` | a **reference** to a Brand audience, defaulted |
| `key_messages` | still campaign-specific, seeded by campaign type |
| `description` | stays the user's |

Two picks, one seeded list, one paragraph. That is the difference between a
brief people finish and a brief people abandon, and it is a stronger argument
for this module than the Brand screen itself.

## 11. Look and templates

The visual half, same semantics.

**Look**: logo variants with declared jobs (profile photo, watermark, mark
only), palette with roles rather than a swatch dump, type, and reference
imagery — which is CON-105's `brand_style` promoted from a per-asset flag to
where it belongs.

**Templates** are what ships now. Not an editor.

The section is called **Templates** because that is the word people go looking
for — "the thing that makes our pictures look like ours". The mechanic
underneath is an *overlay*, and the two names doing different jobs is
deliberate: the user's word names the destination, ours names how it works. The
one cost is that "template" now means three things in this module — the picture
kind here, the *start from a template* origin on a voice, and CON-132's
layout-reflowing templating — so anything that renders the word has to make
clear which. Watched, not solved.

### Why these are days and CON-132's templating is months

CON-132 is hard for exactly one reason: it **reflows layout** across aspect
ratios. Everything expensive in that ticket — constraint anchors, safe areas,
text overflow — is downstream of that.

An overlay does not reflow. It is a **full-canvas PNG per ratio**. Require one
asset per ratio and the hard problem disappears. This is not a down-payment on
the broken version; it is a different, smaller thing.

- An overlay is a PNG with alpha, per ratio, plus a role: `foreground` (frame,
  corner lockup, grain, a gradient scrim for text legibility) or `background`
  (the source composited on top).
- **Three layers, hard stop**: background → source → foreground. Enough for
  frames, watermarks and scrims; not an editor.
- Source fit is the whole control set: cover / contain / anchor.
- **Render client-side**, upload the result as a normal image asset, keep the
  recipe (source + overlay + ratio) alongside so it can be re-rendered. No
  server renderer, no headless browser — CON-132 §5's own recommendation, which
  here costs nothing.

### Construct is a step, not a fourth option

There are four ways to get an image — **use** (content bank, Brand imagery,
something branded earlier), **upload**, **generate** (CON-105), and
**construct**. But construct is not the fourth item in that list. It is the step
the other three flow into:

```
pick / upload / generate  →  [ brand it ]  →  attached to the post
                                  ↑
                       default overlay pre-applied,
                       toggleable, swappable, skippable
```

Default on, per-image off — the same *applies by default, fine-tune, sometimes
cherry-pick* semantics as voice. And the overlay is reference-plus-delta too:
linked to a Brand overlay, nudged for this image, or a one-off PNG dropped in —
with *save this overlay* on the way out.

## 12. Where it lives

**Its own top-level entry, called Brand.** Not Workspace Settings.

Settings is where you go once and never return. Brand is *worked on* — you add a
voice when you start a new kind of content, you add a sample when you write a
post you are proud of. Settings framing kills that behaviour. It is read on
every generation, which gives it the standing of Campaigns rather than of
preferences. And CON-210 is about to vacate the `/content-bank` nav slot, so
this is the honest answer to CON-211: the workspace level returns as **Brand**,
a different kind of thing, not a wider bank.

The counter-argument is real — it is empty on day one, and an empty top-level
nav entry is a bad first impression. §9 is the mitigation: first run is "here is
the Brand we read off your website", not a blank form.

**But the module is mostly not a screen.** It is four touchpoints:

- the voice chip and notes field on the post editor,
- the voice and audience references on the campaign brief,
- the *brand it* step in image attach,
- the voice assignment inside the content-plan flow.

The Brand screen is only where the material is authored.

## 13. What the server would need

The hand-off to CON-228, to be confirmed by the prototypes:

- Brand entities per workspace: voices, audiences, guardrails, look, templates.
  Tenant-scoped and fail-closed like everything else.
- One fetch that returns **every slot including the empty ones** — an omitted
  key and an empty slot must be distinguishable, because an empty slot is a
  visible thing in this design.
- A voice reference plus a local delta on the post, replacing free-prose
  `toneNotes`; the same on the campaign, replacing `tone_guidelines`.
- The generation flows reading all of it: guardrails always, the assigned voice
  per post, the audience per campaign.
- **Usage counts per voice and per audience, split draft/published** — derived,
  never stored. The Overview's rows print them, and the split is the point:
  drafts are still ours to regenerate, published posts are out in the world and
  are the reason a voice cannot simply be deleted. Zero is the value that earns
  the field — material nobody has written in is the library's own dead weight
  and is invisible without it.
- **A generated one-line description per voice and per audience**, read off the
  samples and the consequence lines rather than typed by the author. It is what
  makes an index row worth reading, and it is the only thing that catches a
  voice whose name has drifted from what its samples actually do.
- Binary handling for logos and templates. **SVG is the question to answer here**
  — `imageprobe` does not accept it and inline SVG is an XSS vector (CON-132
  §10.4), but every real brand kit is SVG.

## 14. Open questions

1. Are voices and audiences one library or two? This document says two; the
   picker prototype may say otherwise.
2. Prose slots invite a pasted brand book. What are the size limits, and what
   is the token cost when the assistant reads them every turn?
3. May the assistant *write* to the Brand, or only read it? Rewriting a
   workspace's stated voice is a different permission from following it.
4. One brand per workspace, or several? Agencies are the case; CON-147 already
   made workspaces cheap, so "make another workspace" may be the answer.
5. Versioning: when a palette or a template changes, what happens to what was
   generated against the old one? Shared question with CON-132 §4.4 and it
   should get one answer, not two.
6. Where does a *derived* branded image live — a new asset with lineage, or a
   rendition of the original?

## 15. How we verify

Prototypes, in build order, each chosen for what it can **disprove**:

1. **The Brand tab and its contents.** Libraries and singletons on one surface,
   every empty state, the *save to Brand* affordance. Disproves "a
   workspace-level module reads as something to work on rather than as
   settings".
2. **The post editor: selected voice + local note + promote.** Tests the
   primitive of §4, which everything else is a repeat of.
3. **The voice template picker** — one sample post rendered in every candidate
   voice. Disproves "people can tell voices apart before committing".
4. **The audience picker with consequences attached.** Disproves "a template
   beats a blank box at getting a real answer".
5. **The brief after the change** — two picks instead of four boxes. Disproves
   "this makes campaign setup faster, not merely tidier".
6. **The template compositor.** Disproves "no editor is enough".
7. **Same brief, three voices, three outputs, side by side.** The acceptance
   test. Without it the rest is furniture: a user who writes a careful voice and
   sees no difference in the output learns that the app ignores them.

The screen comes first even though 2–5 matter more, because it is where the
material is authored and every one of them picks from something it holds.

**All of it is built here**, on a `design/brand-materials` branch under this
repo's `/design/<feature>` convention. The separate `ui-prototyping` repo — one
standalone Vite app per ticket, built into a shareable static bundle — was the
obvious home for 6, which is a pure function with no app dependencies. It was
rejected because the audience for this work is the internal team: a deployable
link buys nothing here, and a second home for the design is a second source of
truth that drifts from this document. `ui-prototyping` stays right for work that
has no app dependencies *and* an audience outside the team. This has neither.

## 16. What prototype 1 settled

Built: `/design/brand/nav` (the section itself, clickable — five tabs and an
overview, with a fixture switch), `/design/brand/templates` (platform × ratio),
`/design/brand/surface` (the Overview in every state, empty to hollow to full),
`/design/brand/sections` (one section at a time against the data that breaks
it) and `/design/brand/voice-editor` (the level down: one voice being written,
by each of the ways you arrive at it) — all from a single fixture workspace,
Quant Wealth Management, a regulated
retail-investing tool, chosen because it is the case that broke the one-voice
advice and the only kind of workspace where §7's guardrails carry their own
weight.

`nav` is the one that matters and the one that had to be built last, because
the question it answers — does Brand read as one place with five parts, or as
five features sharing a heading — is about *moving between* screens and cannot
be judged from a screenshot of any of them.

**Settled:**

- **The screen is an index, not an editor.** This answers CON-227's open
  question about `PageActionBar` versus `SaveStatus` with *neither*: nothing on
  the surface is edited, so there is nothing to commit and nothing to autosave.
  A library entry opens its own editor one level down and the commit lives
  there. Making the index editable would have turned five sections into one long
  form — which is the Workspace Settings shape, and the shape this screen exists
  not to be.
- **Every section states who reads it**, and today four of the five honestly say
  *nothing reads this yet*. §9's rule needed a rendering, not just a principle,
  and this is it.
- **A voice card leads with a sample, in the voice.** Four voices side by side
  are told apart by reading them and by nothing else — the rules line and the
  origin are set underneath. This is §9's *show the voice, do not name it*
  applied to the library as well as to the picker.
- **The samples floor is three**, shown as a nudge on the card rather than as a
  validation state. A voice on its way to working is not a defect.
- **A library card is allowed two type sizes.** The voice card had eight —
  name, sub-line, corner badge, sample, caption, rules, counts, origin — each
  defensible on its own and collectively a form, with nothing to tell the eye
  which of the eight to land on. It is now the name at display size and
  everything else at `text-sm`: when to use it, the sample, and the facts at the
  foot as a bulleted list. The foot was tertiary and smaller for a while, and
  shrinking it is the same reflex that produced the eight-size card — type size
  is a claim about *how* a thing is read, not about how much it matters, and
  those bullets are already subordinate by being bulleted, at the foot, after
  the sample. A second demotion on top of that only bought a line nobody can
  read at arm's length. Three things were dropped
  rather than restyled, because restyling would have kept the density and only
  flattened the contrast: the *Reads as…* caption (it paraphrased the sample
  directly above it in weaker words, and survives on the Overview where there
  is no room for a sample), the corner badge (*n could be redone* is a fact
  like the counts are, and the corner is for something urgent), and the dashed
  box around a missing sample — the empty state now takes the sample's own
  shape and slot, so the two states are one card with different words in it.
  The left rule is the only border left on the card, which is what lets it mean
  *this is written in the voice*. Audience cards took the same foot, because
  two library cards set differently read as two screens.
- **The editor is one route, and `new` is a voice id like any other.**
  `/brand/voices/:id` serves writing one, forking a starter (`?from=`) and
  fixing an existing one, because those differ only in what the editor opens
  with — a voice is whatever is in it when you commit. It escapes the Brand
  layout (`brand_/…`): a tab bar across the top of a screen you are *inside*
  offers to throw away what you typed, and the way out of an editor is one
  deliberate step rather than five lateral ones. That escape means the flag is
  re-checked on the child route, since escaping a layout escapes its
  `beforeLoad`.

  **Samples are the screen, not a field on it.** The obvious build — name,
  description, five dropdowns, save — produces exactly the hollow voice the
  library is designed to expose. So the samples block is the largest thing on
  the page, carries its own count against the floor of three, and offers
  *paste several* alongside *write one*, splitting on blank lines: somebody
  seeding a voice has five posts in a document, and a screen that only adds one
  at a time teaches them to stop at two. The rules sit *below* and are framed
  as what a sample cannot say for itself — a pasted post shows the register, it
  cannot promise the next thirty avoid hashtags. That framing is the whole
  argument for keeping the dropdowns.

  **Nothing is blocked except a missing name.** A voice with no samples saves.
  The section already draws that state as conspicuously hollow, and a validator
  refusing it would trade a judgement you can see for a message that just says
  no; a name is required only because an unnamed entry cannot be listed. And
  `summary` is not a field — it is our reading of the samples, so editing them
  withdraws it rather than leaving a reading of text that has since moved.

  **Forking says what it did not give you.** A starter hands over rules and a
  name and, deliberately, no samples — three posts written for somebody else's
  business is the one thing worse here than an empty box. The editor says so in
  a card at the top, because that is the only moment where saying it still
  changes what somebody does.

**Overturned by drawing it:**

- **Brand is a section, not a page — cards cannot be where the work happens.**
  The first cut put all five on one scrolling page as cards, and called that an
  index rather than an editor. The index half was right; the missing half was
  fatal. "An entry opens its own editor one level down" was written and never
  designed, so in practice the cards *were* the work surface, and they cannot
  be: these are not five equal card-sized objects. An audience is a short form,
  a voice is a form plus a samples list you add to and promote into, and a
  picture template is **platform × ratio × customisation, for platforms the
  workspace has not connected yet** — a screen with its own state that will
  never be a tile in a stack. One page either grew until it was unusable or the
  sections stayed too shallow to work in.

  So Brand takes the shape Content Bank already uses: a layout route owning a
  tab bar, one child route per tab, and anything heavy enough escaping to
  fullscreen below (`brand_/…`, the trailing-underscore escape). `/brand` lands
  on an **Overview** whose cards are status — what is missing, what that costs,
  and a way in — reading the same `lib/brandSections` table the tab bar reads,
  so a card and a tab cannot drift apart. That is the rule `campaignSections`
  already states, applied one level up.

  Full-screen modals were the alternative and were rejected: they lose the URL,
  the back button and the ability to send someone a link to the voice you want
  them to fix, and CON-178's corner rules assume a page.

  **What the templates screen then produced on its own:** leading the rail with
  *platforms* rather than with templates makes a real bug visible without
  opening anything — a platform whose assigned set does not cover the ratio that
  platform actually posts in. In the fixture a set claimed by Instagram and
  YouTube covers 1:1 and 4:5: Instagram loses its 9:16 and YouTube is covered
  for neither ratio it posts in. From the set's own point of view that looks
  merely half-built, which is why a template-first list would never surface it.
  Two consequences followed: *covers none* had to become a different sentence
  from *covers some*, or a wholly wrong assignment reads as progress; and
  unconnected platforms are first-class rows, because preparing artwork is the
  work you do **before** connecting an account, so gating on connection would
  empty the screen exactly when it is most useful.

- **"Read it off your website" is a page-level action, not a per-section one.**
  Every empty section had it as its best path, so an all-empty screen showed the
  same primary button four times down one page. One website read fills voices,
  guardrails, colours and logo in a single pass — it was never four actions. It
  now sits once, above the sections, naming what it fills; each section keeps
  only the paths genuinely its own. Templates are deliberately excluded from that
  list: nothing on a website is a per-ratio PNG, and an offer that over-promises
  is the fastest way to make the one good first-run path look unreliable.
- **The Overview is built from the app's own furniture, not from a card of its
  own.** The first version of it invented a card — a rounded tile with an icon
  chip, a blurb, a consequence sentence and a reader line — and it read as
  off-style beside Workspace Settings and the Campaign Overview, which are made
  of `SettingsCard` and `LineItem`. That is not a cosmetic complaint. An
  invented card is a new section announcing that whoever built it had not looked
  at the rest of the app, and the reader has to learn a second card grammar for
  no gain. The Overview now uses both shared components, and the tick in its
  rows is the same tick the campaign setup checks use.

  Two things followed from the switch, and both are improvements the prose
  version could not have made:

  - **Rows instead of a status sentence.** A card saying "5 of 8 ratios
    covered" is a summary of a list the user could simply have been shown. The
    card now lists the things — four voices, four look slots, two templates —
    one row each, ticked when there is something behind it. `done` means
    *there is something here*, never *this is right*: the screen can honestly
    know the first and cannot know the second.
  - **A row carries what you would otherwise open the section to find out.** For
    a voice that is the sample count, the generated description, and how much
    has actually been written in it. A library row showing only a name is a
    filing cabinet, and the fixture makes the case: the empty voice reads *no
    samples · never used*, and the fantasy audience — three blank consequence
    lines — reads *never used* beside two audiences with thirty-six posts
    between them. Neither was visible on the old card.

  The reader line paid for this. *Nothing reads this yet* was a sentence per
  section, and five of them down one page is what made the screen read as an
  essay; it is now three words beside the heading, with the full sentence kept
  on the section's own tab. §9's rule survives at index length.

- **An entry row is three lines, not a line with numbers in the margin.** Name
  in semibold, description a step down at 13px and capped at two lines, counts
  on a third line at the same size, set back. The description sits near label
  size because it is what you compare *between* rows rather than a footnote to
  the name — but not *at* label size, or the row has no top line. The counts had
  been in the right margin,
  which is where a row puts *one* number; "4 samples · 24 published · 3 in
  draft" is a sentence, and a sentence squeezed into a margin wraps into a
  column of fragments. Two shapes now, and the difference is real rather than
  stylistic: a row that names a **thing from the library** (a voice, an
  audience, a template) is the row with counts to report, and a row that names
  a **slot of a singleton** (Logo, Palette, NEVER CLAIM) is the row with one
  number for the margin. `LineItem` carries both as `variant="entry" | "task"`,
  so the distinction lives in one component rather than in five call sites.

- **A library section is a stack of full-width cards, not a grid of tiles.**
  Voices was laid out two-across inside one section card, which is the shape of
  a *summary* — and the summary already exists, on the Overview. Half a column
  has nowhere to put the one thing that tells two voices apart, which is a
  sample written in each of them, so the grid was quietly deciding the section
  could only ever show names. One entry, one card, at the same measure and in
  the same `bg-primary` block the rest of the app uses. The generated
  description moves directly under the sample as *Reads as: …*, which is what
  makes a name that has drifted from its samples legible at a glance rather
  than merely available.

  **Adding is the last card, not a button in a header.** Top-right is views only
  (CON-178), and more to the point *add* belongs at the end of the list it adds
  to — that is where you are looking once you have read the list and found
  nothing that does the job. It is dashed rather than filled: an outline of an
  entry that does not exist yet, which must not compete with the real ones above
  it.

- **An empty library is three cards, not one — and the third one says almost
  nothing.** The old empty state was a dashed box with a sentence and a row of
  buttons; the version after it was one big card doing all three jobs at once,
  which meant the screen had a single entry point and you read it top to bottom
  or not at all. It is now a stack:

  1. **The intro** — icon, heading, explanation at full strength. On a filled
     library this card is not shown; its slot is where the entries go.
  2. **Start from a template** — the starters under a heading of their own, on
     the card rather than floating above it. A row of tiles under a section that
     has finished explaining itself does not say what the tiles are *for*.
  3. **The blank form** — one line, no heading, **no description**.

  The gain is that the empty state is now the same shape as the filled one: a
  column of white cards, one per thing. It stops being a different kind of
  screen that resolves into a list later.

  The third card's plainness is the design rather than an omission. Two cards
  above it have spent the screen explaining, so a single line is what makes it
  legible as a *different kind of offer* instead of a third thing to read — and
  there is genuinely nothing to say about a blank form beyond what it is. It is
  white rather than dashed, unlike the add card on a filled library: dashed
  means "an entry that is not there yet", which on a screen where none of them
  are reads as another gap rather than as the way out of one.

  The starters keep the campaign-type card's shape, because it is the same act
  — picking which of a handful of opinionated presets this thing is going to be.

  Three notes on why it is those three things:

  - **Body copy at full strength.** The old version set its explanation in
    tertiary, the tone the app uses for asides. On an empty section the
    explanation *is* the screen, and setting the only thing on the page in the
    quietest colour available reads as the screen apologising for itself.
  - **Three starters, not thirty.** A library that needs a search box has
    failed — choosing between twelve near-identical descriptions is the blank
    box again, one step later. Each is forked on pick (§4), so improving ours
    never rewrites anybody's, and each one's job is to be replaced.
  - **The blank form is its own card, not a fourth tile and not a text button
    inside the offer.** Two wrong versions before this one. A fourth tile
    presents authoring from nothing as the equal-and-obvious choice it is not —
    nobody's first act should be writing a brand voice from a blank box. A ghost
    button in the card's footer went too far the other way: it reads as a
    footnote, when it is a real and permanent way of working that some people
    will always prefer. As its own card it keeps the slot the add card holds on
    a filled library — last on the page, whether there are three entries or
    none.

  Deliberately *not* offered here: *read it off your website*. It fills five
  sections in one pass and belongs above them, per the entry two bullets up —
  re-offering it from inside Voices is the same mistake at a smaller scale.

- **The same layout carries Audiences and Guardrails, and the singleton is
  where it gets tested.** Voices settled first and the other two prose sections
  took it verbatim: reader line at the top, one entry per full-width card, the
  add card last, three starters and a blank-form card when empty. Two things
  came out of applying it rather than designing each screen:

  - **A starter audience is a relationship, not a demographic.** "Retail
    investors, 30–45" as one of ours would be a guess about somebody else's
    business, and a *plausible* wrong guess is worse here than a blank, because
    people accept it and stop thinking — which is the exact failure this section
    exists to correct. The three are the people who already buy, the people who
    nearly bought, and the people who recommend you. Everyone has all three,
    none of them needs inventing, and each narrows on its own.
  - **Guardrails takes everything except the add card.** There is exactly one
    set of guardrails, so an `ADD GUARDRAILS` at the foot of a filled page would
    offer a second one that cannot exist. Everything else survives — which is
    the useful finding: the library layout is not actually about there being
    many of something, it is about the section being a screen. Its three
    starters are the three *shapes* the rules take (what may not be promised,
    what may not be claimed to exist, what may not be overstated) rather than
    thirty industries in a dropdown.

- **The whole-brand offer is a card, not a banner — and it can be closed for
  good.** It was a thin strip: small bold line, grey caption, button pushed to
  the right margin. Every other card on the screen leads with a chip, a display
  heading and body copy at full strength, so the one card carrying the best
  thing the screen can do for you was also the only one that looked like an
  advert. Same anatomy as the empty-library card now, and three ways in rather
  than one: **ASK OGEN TO HELP**, **POINT US AT YOUR SITE** and **UPLOAD A
  DOCUMENT** (a brand deck or an old style guide is a website read by another
  route). Capitals because these are actions, the same rule the rest of the
  app's action labels follow.

  **Ogen leads, though the heading still names the website.** A site read is
  better raw material when there is a site worth reading, which is why the card
  is titled after it — but answering a few questions is the only path that works
  for *every* workspace, and it is the one that needs nothing found first: no
  URL, no file, no hunting for where the deck ended up. So it takes the filled
  button and first position, and the other two sit beside it as outlines.

  Both paragraphs are set the same and both sit above the buttons. The second
  one — what to do if you have no site, or a deck instead — began life as a
  tertiary footnote *under* the row, which put the answer to "what if I have
  neither" after the point at which somebody with neither has already decided
  the card is not for them.

  The X in the corner is dismissal that means it (`dismissedNotes`, device-local
  — the same store `Explainer` uses). It is *not* an Explainer, which may only
  hold teaching; this holds actions. What makes closing it safe is that every
  path it offers exists elsewhere: each section keeps its own starters and its
  own blank form, so dismissing this skips a shortcut rather than locking anyone
  out. The alternative was a card that returns on every visit until the brand is
  complete, which is the definition of nagging.

- **Each section has a permanent hue, and it lives on the glyph only.** Five
  grey line icons down the Overview are five identical marks, and the tab you
  want is found by reading five labels every time. `BRAND_SECTIONS` now carries
  a `tone` (`--brand-*` in `index.css`) on the same footing as the campaign
  rail's `--nav-*`: its own tokens rather than aliases, because the two are
  different sets of places and retuning one must not retune the other. Colour
  means *which section* and never *this one needs attention* — the moment a
  section's hue could also mean a state, both readings stop working, which is
  why headings, rows and buttons all stay the same ink.

- **A tab carries a count as its own mark, and only when it has one.** `VOICES`
  with a small mono `4` beside it, not `VOICES 4` in the label: the name of a
  place and the state of that place are different facts, and set into one string
  the bar reflows every time something is added and a tab whose name ends in a
  number is indistinguishable from a tab that is counting. Only the libraries
  count — a singleton has nothing to count, and `GUARDRAILS 1` is a number
  invented to fill a slot. Zero is left off: an empty section says so at length
  on its own screen, and a row of `0`s across the bar reads as five failures
  before the workspace has done anything wrong.

- **Overlays are called Templates.** The user's word for the destination, ours
  for the mechanic — see §11, including the cost: the word now collides with the
  *start from a template* origin and with CON-132.

- **A shared "nothing here yet" sentence does not survive three headings.** The
  guardrail rails each said the same line, which read as a rendering bug rather
  than as three findings — and they are not equally serious. An empty *may
  claim* is a missed convenience; an empty **NEVER CLAIM** is the section
  failing open. Each rail now says what its own absence costs.

**Still open after this one:** whether the first-run screen actually earns the
top-level nav entry. The harness can show that it is not blank; it cannot show
whether someone arriving at it goes on to fill anything in. That is the one
finding this prototype is structurally unable to produce, and it is worth saying
so rather than counting the decision as made.

## 17. Running it for real, against a stub

The harness answered everything a screenshot can answer and nothing else. A
fixture rendered straight into a route cannot show what *saving* a voice feels
like, whether the library is where you expect it when you come back, or whether
the tab counts move — and those are the questions left. So the five tabs and the
voice editor now run on the live routes, against a data layer that behaves like
one.

**The fake is a plain module at the API boundary, not a mock network.**
`services/api/brand.ts` exports `getBrand`, `saveVoice`, `deleteVoice` and
`resetBrand`; each returns a promise after a visible delay, reads a JSON seed
(`brand.seed.json`) and writes to `localStorage`, keyed per workspace because
the real thing will be tenant-scoped. `hooks/useBrand.ts` is a normal TanStack
Query hook over it — one query for the whole object, mutations that write
through and invalidate. Nothing above the service knows it is a fake, which is
the point: when CON-228 lands, each body becomes an `apiJson` call and the hook,
the routes and the components are untouched.

**Not MSW.** A service worker intercepting `fetch` buys fidelity we have no use
for — status codes, headers, a wire envelope — for a contract nobody has agreed
yet. §13 will be written *from* what this prototype settles, so pinning a JSON
envelope now would be inventing the API by accident, in the mock. A plain module
is also readable: the whole fake is one file you can see the end of.

**The harness stays, and the two now share one workspace.** They answer
different questions and neither replaces the other: `/design/brand/*` holds
every state at a glance and cannot be broken by using it; the live tab holds one
state that answers back. What they must not do is drift, so the harness fixtures
are derived from the same `brand.seed.json` the live tab opens on — the file
carries the data, `-fixtures.ts` carries which entry is which and why it is
there. The harness also carries the one control a stub needs and a real API must
never have: **reset**, which throws the workspace away and seeds it again. It
lives there because a design branch never reaches `develop`, so a dev-only
button cannot escape onto a real screen.

**What running it produced, which drawing it did not:**

- **A section must not draw an empty library while it is still loading.** Every
  Brand screen has a real and carefully written empty state, and showing it to
  somebody whose material is merely in flight is the one lie the module is built
  to avoid. `BrandDetail` — `BrandTab` when this was written — is a render prop
  rather than a wrapper taking `data`, so the body cannot run without it: the
  mistake is unavailable rather than discouraged.
- **An unknown voice id is not a new voice.** `/brand/voices/:id` treats `new`
  as an id, and the first wiring resolved every other unknown id the same way,
  which answered a wrong URL with a create form — and the first thing typed into
  it would have been saved under whatever the address bar happened to say. Not
  found is now its own answer.
- **Deleting takes two steps now that it deletes.** With no API behind it the
  Danger Zone's button was a toast, and one click for it read as fine. It is the
  only gesture on the editor with no undo — everything else on the screen is
  recoverable by not saving — so it gets the confirmation the document and post
  editors already give, with the same sentence about what it costs. A list may
  delete a row on one click; a thing that fills the screen and may have just
  been written gets asked about.
- **The flag is on for iteration and has to go back off.** `brand-materials` is
  `true` on this branch only. Nothing here is backed by a server: a workspace's
  voices would live in one browser, on one machine, and vanish with its site
  data. Switching it on for anyone but the person working on it would be
  shipping a feature that quietly forgets.

## 18. What using it changed about the chrome

Four changes, all of them from moving around the section rather than looking at
a screenshot of one.

**The tab bar moved onto the header line.** Brand copied Content Bank's shape —
a title row, then a full-width underlined bar beneath it. Content Bank earns
that bar: its tabs sit over a grid, the underline is the top edge of the thing
being filtered, and the bar spans the content it belongs to. Brand's tabs sit
over a single narrow column of cards, so the rule ran the width of the window to
underline a 640px column, and the screen spent two 40px rows and a horizontal
line before the first card. Inline, the header reads as one sentence — `Brand │
OVERVIEW VOICES 4 …` — which is what it is: the title names the section, the
tabs name the part of it you are in. Pills rather than the underline variant,
because an underline needs a baseline to sit on and deleting that baseline was
the point.

**The reader line only appears when nothing reads the section.** `ReadBy` ran on
all five, and on a wired one it said *Read when a content plan is generated and
when a post is written* — a caption above the library announcing that the
feature works. That is narration, not honesty. A section nothing reads is a fact
the screen would otherwise hide; a section that behaves as advertised has
nothing to disclose. Three of the five still carry the line, which is the point
of keeping it (§9).

**A voice can be the default, and the library says which.** The picture
templates already had *applies by default, fine-tune, sometimes cherry-pick*
(`BrandTemplate.isDefault`); voices were described in those terms and did not
have it, which left a four-voice workspace facing a four-way choice on every
post when the answer is the same one nine times in ten. It is a dot and a
lower-case word beside the name — not a badge, because being the default is the
most ordinary fact on the card and a filled pill in the corner would make it
look like the most urgent one. The invariant belongs to whoever owns the
collection: `saveVoice` demotes the others in the same write, and `deleteVoice`
hands the flag on rather than leaving the library with none. The editor only
*promotes* — switching a default off would leave a workspace with no default and
no way to repair it, since nothing else sets the flag.

**Hover lifts a card; it does not tint it.** The library card darkened its
surface by 3% on hover, which is wrong twice: on a white card in a column of
white cards it is nearly invisible, and where it is visible it reads as
selection — this app tints a surface when something is *chosen*, not when a
pointer passes over. A shadow says the card can be picked up without claiming it
has been, and it is what `CampaignCard` already does for the same gesture. The
caret came along for the same reason: nothing else on a card of four text blocks
looks clickable, and `role="button"` is invisible to a mouse.

**The add card sits on white with the entries.** It was a dashed outline on the
page background, on the argument that it is an entry which does not exist yet —
true, and it made the last row of every library read as a dropzone, because a
dashed rectangle on bare canvas is what every upload target in this app looks
like. It is not a placeholder for a thing; it is the control that makes one. What
keeps it from competing with the real entries is weight, not surface: a plus, a
label, a hint, and none of the material that gives an entry card its height.

## 19. Tabs, and then no tabs

The tab bar did not survive being used. §18 moved it onto the header line, which
fixed how much room it took and left the thing itself intact; a week of walking
around the section is what settled that the thing itself was wrong.

**A tab bar is lateral navigation between peers you switch between all day.**
That is what it is for, and it is a fair description of Content Bank — you are
looking for an asset and you do not yet know which kind it is, so you sweep the
bar. It is not a description of Brand. Nobody flicks between Guardrails and
Look. You go and write one, and you come back. Everything that follows is a
consequence of that mismatch:

- The bar spent chrome on all five at once on the screen that has the most to
  say, which is the Overview. Five section cards, each already naming its
  section, sitting under a row that names all five again.
- It put four sideways exits along the top edge of a screen you were working
  in. From inside the voice library, `LOOK` is a click away, and it does not
  ask what you were doing.
- It made "where am I" and "where can I go" the same row, so neither could be
  read quickly.

So Brand is a **hub and five drilldowns**:

```
/brand                     the Overview — the hub, and what the sidebar points at
/brand/voices              a section, opened from its card
/brand/voices/:voiceId     a voice, opened from its card
```

Three levels, one gesture each way. Going in is clicking the card; coming back
is the caret at top-left, and there is exactly one of them, so the way out is
never a choice.

**Shaped like the post details screen**, because that is what the app's other
drilldowns look like: a caret at top-left, one centred column under it, and the
same arrival fade. The caret in that corner is this app's promise that there is
something above where you are, and a screen that reaches the same depth by other
means has to keep the promise. The voice editor takes no title at all, again
like the post: its name is the first field of the document, and a header titled
by a name you are halfway through typing flickers as you type it. §20 is where
the *section* screens lost their titles too.

**The Overview's cards became doors.** With the bar gone they are the only way
in, and a door the size of a card should not have a handle the size of a word —
so the `OPEN VOICES` button is gone and the whole card opens the section: white
block, lifts on hover, caret where the content ends. That is deliberately the
same gesture a `LibraryCard` makes one level down, so the hub and the library
open things the same way and learning it once is enough.

What this cost: the tab bar's counts (`VOICES 4`) are gone. They were the one
thing the bar said that a label could not, and the Overview says it better — a
card lists what is in the section, one row each, ticked when there is something
behind it. A number in a bar tells you how many; the rows tell you which.

## 20. A section's name is a card, not a header

The section screens arrived with the label beside the caret, which is the
ordinary arrangement and was not wrong — it was just the least the screen could
say. A page header states a name. It cannot say what the thing is, and on a
section somebody opened once a fortnight ago that is the half worth having.

So the header on a section screen is now **a caret and nothing else**, and the
first card in the column carries the name:

- the section's glyph, in its permanent hue, in the same 40px tile the rest of
  Brand's explaining cards use;
- the label as a display heading — the page's `h1`, in 24px rather than 15px;
- two sentences saying what the section is *for*, from `BRAND_SECTIONS`;
- one more sentence while the section is empty, which is the same `whenEmpty`
  line the Overview card shows;
- and the honesty line ("Nothing reads this yet") where the reader can see what
  it is qualifying.

The anatomy is `WholeBrandOffer`'s — the "read the rest off your website" card —
because they are the same kind of object: a white card at the top of a column
that explains rather than lists. Naming the place twice, once in the header and
once at the top of the column, is the version where one of them is redundant, so
the smaller one went.

**Where it came from.** This card already existed as `LibraryIntro`, the first
of the *three cards an empty library is* (what is missing, the ones we offer,
the blank form) — shown only while the section had nothing in it. Promoting it
to always-on cost one line of layout and settled two things at once. The page
got its name back, and the empty state stopped being a different kind of screen
that resolves into a list later: it is the same screen with the same first card,
which gains a line while the section is empty and loses it when it is not.

**What it cost.** Roughly 180px at the top of every section, permanently,
including Templates — where the platform rail is pinned to the panel height and
the card genuinely takes space from the work. That is the trade: a section you
live in pays for a section you visit twice. It is worth watching, and the honest
place to revisit it is Templates rather than the text sections.

**The voice editor takes the same card**, headed `“Dry British” voice` — the
name first, then the kind. It reads the *saved* name rather than the field two
inches below it, so the heading does not spell itself out letter by letter as a
new voice is typed; a voice that has never been saved is `A new voice`.

## 21. The header goes inside the scroller

The first build hung the header above the scroll container as a sibling. Every
Brand screen therefore ended at a hard horizontal edge: cards slid under a cut
rather than dissolving, which is not what any other scrolling screen in this app
does. Post details, Profile and Workspace Settings all wrap the header in the
scroller and let `PageHeader`'s gradient do the fading, and the fade is the
visible half of a structural decision — a sticky header can only dissolve
content that passes *underneath* it.

So:

- The five section screens and the voice editor use the **post-details**
  arrangement — `ScrollArea`, header inside it, static gradient. They have no
  title, so there is nothing up there to collide with the column.
- `/brand` uses the **Profile** arrangement — same structure, plus
  `fadeOnScroll`, because it *does* have a title and a title that stayed put
  would sit on top of the rows for the whole length of the page.
- Templates keeps its header above the frame. Its platform rail is pinned to the
  panel height and nothing scrolls past the top edge, so there is nothing to
  fade.

The consequence worth knowing: **a Brand component no longer scrolls itself.**
`BrandOverview` and the section columns render a plain stack, and the page owns
the scroller. A component that scrolls internally cannot be put under a sticky
header, which is the whole reason the old arrangement looked the way it did.

## 22. A sample is a page, and the corner says so

The samples grid draws each one with its **top-right corner cut and folded
back** — a `clip-path` on the card, and a triangle the colour of the border
sitting exactly in the cut, so the diagonal reads as an edge of the card rather
than as a mark on it. One number (`FOLD`) drives both, because a cut and a fold
of different sizes show a seam.

It is not decoration. A sample is somebody else's post, pasted in whole, and the
card shows three lines of it; the dog-ear is the one part of the shape that says
*there is more of this below the fold* without spending a line of copy or a
"read more". It also stops the block scanning as four buttons: what the eye
should see is a small pile of paper, because the question the grid exists to
answer is whether these all sound like one person.

**Adding is the last cell, not a button under the grid.** The gesture stays in
one place whether the voice has no samples or six, and an empty voice opens on
the outline of the thing it is missing rather than on a paragraph about it —
with nothing in the grid that cell also carries the consequence (a voice saved
like this generates what no voice at all would), which is the last moment saying
so still changes what anybody does.

**Paste-several is gone from the card.** It was a second textarea flow living
permanently in the block, splitting on blank lines by a rule you had to be told.
It sits in the card's overflow menu as the thing it actually is — *Bulk upload,
coming soon* — beside *Reset samples*, which restores whatever the screen opened
with. Both belong in a menu for the same reason: neither earns a permanent
control, and a screen that has thought about a feature and not built it should
say so where somebody would go looking.

**What the card stopped saying.** The count went (`4 samples` over four visible
cards is the screen counting to itself), and the reading came up from the bottom
into the sub-heading, where the description used to be: `Reads as …`, the label
in the foreground colour. Once there are samples, our reading of *this* voice is
worth more than a definition of what a sample is — so the definition stays only
while the set is short of the floor of three, which is exactly when somebody
still needs it.

## 23. The second editor, and what it made shared

Audiences now has the level Voices has: a section screen that lists and adds,
and `/brand/audiences/:id` under it. The two routes are the same file with
different nouns — `new` is an id like any other, so writing one, forking a
starter and opening an existing entry are one screen with three openings; the
flag is re-checked because escaping the layout escapes its `beforeLoad`; an
unknown id answers "no such audience" rather than falling through to a blank
form that would save under whatever the address bar said.

**Two of a thing is when it moves.** The frame (the scroller with the header
inside it, the column, the commit bar), the intro card, `EditorCard`, `Field`,
the fork note and the danger zone are `components/brand/editor.tsx`. One editor
could keep its furniture; two copies of it are two headers that fade
differently and two columns spaced differently a year from now — the drift the
sections avoided by sharing `shell.tsx` from the start. What stayed put is
anything about one *kind* of entry: samples and the rules controls are still
`VoiceEditor`'s, because a shared component with a `kind` prop and two branches
in every function is worse than two components.

One thing the extraction settled rather than moved: **`blocker` now both
explains and enforces.** The frame disables its commit when there is a blocker,
so the sentence in the bar and the reason the button is dead cannot disagree —
they were two statements of one rule, and the version where a screen says why
you cannot save and then lets you save is worse than either half alone.

**What an audience editor is.** The section exists because of one failure: left
to a blank box, people describe a fantasy, and the seed carries one on purpose
— "wealthy, successful, generous people looking for somewhere to put their
money", which validates, saves, and changes nothing about a single post. The
editor cannot refuse that and does not try. It gives it nowhere to go instead:
the three consequence lines (where they read, what loses them, what they need
before they believe a number) get the card the screen is built around, and an
audience nobody has looked at has nothing to put in them. Three visible gaps
are a better argument than a validator, because they are the reader's own —
they can see the answer is missing rather than being told that it is wrong.

That is the same position samples take one section over, so the card behaves
the same way: the reading (`Reads as …`) sits in the sub-heading in the
foreground colour, the definition under it survives only while the lines are
incomplete, and a blank set says out loud what saving it would cost.

**Audience starters hand over a name and nothing else.** Voices' starters carry
a set of rules, because a register can be described without knowing whose it
is. Nothing here is like that — where somebody reads and what loses them are
facts about actual people, and a prefilled guess is the fantasy this section
was built to prevent, arriving with our name on it. The fork note says so on
the way in.

## 24. The guardrails editor, and three words that were wrong

The third editor, and the first whose material is *lists*. A voice is written
by pasting posts and an audience by answering three questions; guardrails are
four lists and a line, they run long, and — this is the part that decides the
design — **they already exist.** In a compliance email, in a legal annexe, in
the founder's head. The screen's job is not to ask for them, it is to take
them.

So the list controls are the feature:

- **A list behaves like a list, not like a form.** Enter ends this statement and
  starts the next one, focused. Backspace on an empty row deletes it and puts
  the caret at the end of the row above. Nobody should reach for the mouse
  between two sentences they are typing in sequence — that is the difference
  between entering the nine rules that matter and entering three and giving up.
- **Pasting is the bulk import.** A multi-line paste becomes one statement per
  line, leading bullets and numbering stripped and nothing else touched (it is
  compliance text; a parser that tidied it would be editing it). There is no
  importer, no CSV and no wizard, because the format everybody already has these
  in is *a list in a document*, and the clipboard is a working parser for it.
- **Words are tokens, not sentences.** Banned words get a chip field where
  Enter, a comma, a pasted comma-list and leaving the field all commit, and a
  repeat is dropped case-insensitively. Five words typed into a textarea are
  five words nobody can count or delete one of.
- **Rows are sentences, so rows are textareas.** A rule that runs past the end
  of an input is a rule nobody proof-reads. Blank rows are the cursor's
  workspace while typing and are dropped on save — a list that removed a row the
  moment it went empty would remove the row you are standing in.

**A template can say what you may never claim. It cannot say what is true.**
The three starters hand over `neverClaim` and `bannedWords` filled and `facts`
empty, and the fork note says so on the way in. "No result may be promised" is a
rule about a *kind* of business and holds for every firm in it; the fee, the
licence number and the settlement time are facts about one company that nobody
outside it can guess. A plausible invented fact is the worst thing this module
could ship — it reads exactly like a checked one, in the section people stop
re-reading. (Same split as the audience starters, arrived at from the other
side: there, nothing could be handed over at all.)

The blocker is *everything cleared on a record that exists*, because a
guardrails record with nothing in it is the same as none — and the way back to
genuinely none is the danger zone, which puts the section to `null` and the
screen back to its three starters. An empty save and a deliberate delete must
not be the same gesture: "we have not written these yet" and "we wrote them and
they say nothing" are the two states this section exists to keep apart. (On an
empty section the same emptiness needs no sentence: there is nothing to save,
so the commit is simply not live.)

### Three words that were wrong

**`NEVER CLAIM` lost its capitals.** They were literal — copy, not CSS, on the
destructive-label argument that emphasis in the words survives copy/paste,
screen readers and any restyle. That argument holds for a button you are about
to press and not for a heading you are reading: a word in caps in running text
is the page raising its voice, and a page that raises its voice about its own
compliance section sounds less serious rather than more. The red rule down the
left of those statements was already saying it.

**The small-caps labels went with them, on the guardrails screens only.** Stack
five of them down one card — FACTS, MAY CLAIM, NEVER CLAIM, BANNED WORDS — and
the app's ordinary micro-label convention stops reading as a mark and starts
reading as shouting at somebody about their own legal text. The hierarchy it
was buying is bought instead by weight and colour, with the label a step darker
than the hint beside it. Action labels keep their capitals everywhere,
including here: an action shouts, a heading does not, and that line is easier
to hold than "sentence case except in the Danger Zone".

**`boilerplate` is now `disclaimer`,** field and label both. The word describes
where the thing came from — a print shop's reusable slug — rather than what it
does, and what it does is plain enough to say. The hint says the rest: carried
by every post, added exactly as written and never reworded.


## 25. A singleton cannot have a drilldown

The guardrails editor above was built as a level below `/brand/guardrails`,
matching voices and audiences. That was wrong, and the reason is worth keeping
because it applies again to Look.

**Voices and audiences are libraries; guardrails is one document.** A library
earns its two screens: the list is a choice between things, and going into one
of them is the choice being made. There is exactly one set of guardrails per
workspace, so the same arrangement produced a page whose whole content was a
card of the one document, and a click on that card which showed the same
document in fields. Nothing was chosen on the way through. What the extra
screen actually added was a place where the rules can be read but not
corrected — you find the wrong sentence, and then you go somewhere else to fix
it.

So `/brand/guardrails` **is** the editor and there is nothing under it. The
Overview's card is the way in, the caret goes back to the Overview, and
everything the section card used to draw is drawn around the fields it
describes:

- the intro card, now carrying the section's `whenEmpty` line while the section
  is empty — the one thing an editor opened on a row of a list never has to say,
  because such an editor is never the whole section;
- the three starters, in the screen rather than behind a `?from=` on the way to
  it. Better anyway: the fields are visible while you choose, so the offer reads
  as filling in the form in front of you rather than as picking which form you
  get. They are withdrawn by the first keystroke — a card that overwrites the
  sentence you just wrote is a trap, not an offer;
- and *not* the "write the rules yourself" card, which does not survive the
  merge. The blank fields are already on screen; the card offered a click for
  nothing.

**Two things the drilldown was quietly paying for.** `CANCEL` had somewhere to
go and now does not, so the ghost is `DISCARD CHANGES` and puts the draft back
where it was. And saving an untouched screen would be a lie: this is a page
people land on to *read* as often as to edit, so the commit is live only once
something differs from what is stored, and the bar says which state that is
(`Unsaved changes` / `Saved`). Otherwise a visit that changed nothing stamps a
new `updatedAt` on the rules — in the one section where "when was this last
checked" is a question somebody will actually ask.

`BrandEditorFrame` grew `dirty`, `status` and `cancelLabel` for it, all
defaulted so the two library editors are untouched. It also grew a disabled ink
for the commit: the ghost variant has none of its own, and a strong
`text-primary-foreground` on a dead button is exactly what makes it look live.

**What this predicts.** Look is the other singleton (`data.look`), and its
editor is unbuilt — build it as this screen, not as a level below a card.
Templates is already the shape from the other direction: a screen that is not a
column of cards under a section intro. That leaves voices and audiences as the
only two Brand sections with something below them, which is the same list as
`BrandBackButton`'s `to` union — and that union no longer compiles if a fourth
one is invented.

### One heading style, and one type scale

Two corrections that arrived together, both versions of the same complaint: a
screen should not invent a new text style to say a new kind of thing.

**A card holds one list.** The editor had three cards — facts, then *claims*
and *wording*, each holding two lists under a sub-heading. Grouping them bought
a sentence of kinship ("same subject, two sides") and cost a second heading
style, which then has to be given a size, a weight and a colour, and defended
against the first one every time either moves. The two claim lists say their
kinship perfectly well by sitting next to each other. So: five cards — facts,
may claim, never claim, banned words, disclaimer — and the rule that anything
which would need a label inside a card *is* a card. It costs a little vertical
space and leaves exactly one thing on the screen that looks like a heading,
which is what makes a long form scannable at all.

**The honesty line is not a caption.** `ReadBy`'s "Nothing reads this yet" was
set in 12px, and small type is how a screen says *detail, skip this* — the
opposite of what that sentence is for. It reads at the card's own measure now,
one colour step dimmer than the description above it. The intro card's three
paragraphs (what this is, what its absence costs, what reads it) are separated
by colour rather than by size, and step in the order you would read them.
