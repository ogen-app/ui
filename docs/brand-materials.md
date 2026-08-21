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

Facts, claims we may make, claims we may **never** make, banned words,
boilerplate. Applied to every generation regardless of which voice is chosen —
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
   voice samples from the copy, boilerplate, product facts, palette, logo. This
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
