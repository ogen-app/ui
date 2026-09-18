# What influences a post

An inventory of every input that reaches a single post, and how each one gets
there. Written while restructuring the relationship between the Brand
Foundation, campaigns, ideas, posts and the calendar.

The point of the list is the count. A post is not a row with a body — it is the
place where roughly seventy separate inputs land, most of them inherited from
somewhere else. Complexity here is not a smell; it is the domain. What *is* a
smell is when two inputs claim the same authority, and there are four of those.

**Legend.** `now` = exists in the code today. `new` = only in the proposed
model.

## The four modes

Every input below sorts into exactly one of four relationships with the post.
This is the whole reason the list stays tractable:

| Mode | Meaning | Example |
| --- | --- | --- |
| **resolve** | One winner, chosen by a precedence chain. Lower levels override higher ones. | voice, audience |
| **accumulate** | Union. Every level may add; no level may remove. | facts, guardrails, disclaimer |
| **adapt** | A transform applied last, after everything is decided. Not a place to choose again. | channel notes, templates, character limits |
| **constrain** | A hard limit that can reject the post outright. | banned words, platform post types, campaign window |

If the code makes this sorting explicit, seventy inputs are manageable. If it
does not, they are a pile — which is roughly the situation today.

---

## A. Brand Foundation (workspace level)

| # | Input | Mode | Where |
| --- | --- | --- | --- |
| 1 | **Voice** | resolve | `now` — `post.BrandVoiceID → campaign.BrandVoiceID → workspace default → campaign.ToneGuidelines prose`, in `brandresolve.Resolve`. Four rungs, and the last is free text. |
| 2 | **Voice rules** | resolve | `now` — `VoiceRules{Emoji, Hashtags, Formality, Person, Length, Opening, Closing}`. Seven dials, each independently contradictable by generated copy. |
| 3 | **Voice samples** | resolve | `now` — 3–8 real excerpts. The actual few-shot conditioning; they move output more than the rules do. |
| 4 | **Voice channel notes** | adapt | `now` — `ChannelNotes[platformID]`, injected only for the post's own platform. |
| 5 | **Voice summary** | resolve | `now` — generated, not authored. The model's reading of the samples, fed back into prompts. |
| 6 | **Audience** | resolve | `now` — `post.BrandAudienceID → campaign.BrandAudienceID → campaign.TargetPersona prose`. |
| 7 | **Audience consequence lines** | resolve | `now` — `Who`, `ReadsOn`, `ScrollsPastWhen`, `BelievesWhen`. `ReadsOn` should influence channel choice and currently does not. |
| 8 | **Facts** | accumulate | `now` — `BrandGuardrails.Facts`, always injected, rendered as "rest claims on these facts". |
| 9 | **May-claim / never-claim** | constrain | `now` |
| 10 | **Banned words** | constrain | `now` |
| 11 | **Disclaimer** | accumulate | `now` — appended to every post, and it eats character budget on limited channels. |
| 12 | **Look** | adapt | `now` — logos with declared jobs, palette with roles, typefaces, reference images. Drives generated imagery. |
| 13 | **Templates** | adapt | `now` — per-platform, per-ratio full-canvas overlay. |
| 14 | **Positioning** | constrain | `new` — the one sentence nothing else may contradict. |
| 15 | **Pillars** | resolve | `new` — recurring subject areas; the axis analytics needs to be interesting. |
| 16 | **Sources** | accumulate | `new` — durable (chunked, embedded, retrieved by similarity) vs volatile (fetched at generation with an as-of stamp). |

## B. Campaign

| # | Input | Mode | Where |
| --- | --- | --- | --- |
| 17 | **Thesis** | resolve | `now` — `Description`, `KeyMessages`. |
| 18 | **Legacy prose** | resolve | `now` — `TargetPersona`, `ToneGuidelines`. Still `notnull`, still required by `content_plan/validate.go:26`, though `content_plan.tmpl` renders only `{{.BrandBlock}}`. |
| 19 | **Campaign type** | resolve | `now` — `CampaignTypeID` → label + description, both injected into the plan prompt. |
| 20 | **Phase** | resolve | `now` — `post.PhaseID` → name, purpose, sequence. Every post must belong to one. This is the arc. |
| 21 | **Window** | constrain | `now` — `StartDate`/`EndDate`; the post's `publishDate` must fall inside. |
| 22 | **Quota** | — | `now` — `EstimatedPostCount × GoalCadence`, multiplied by periods spanned. Does not shape a post's content; decides how many posts exist at all. |
| 23 | **Target platforms** | constrain | `now` — `CampaignPlatforms`; the post's `PlatformID` must be a member. |
| 24 | **Language** | resolve | `now` |
| 25 | **Asset opt-in** | accumulate | `now` — `UseAssets` + `AssetIDs`. |
| 26 | **Publishing settings** | adapt | `now` — `PublishingTime`, `Timezone`, `PublishingDays`, `SpreadMinutes`. |
| 27 | **Campaign status** | constrain | `now` — draft / scheduled / active / paused / completed / archived. Whether a paused campaign's scheduled posts still fire is unanswered. |
| 28 | **Budget, currency, tags** | — | `now` — carried, currently inert for the post. |

## C. Idea

All `new`. These exist today as `DraftPost.Body` stored in a `draft_thesis`
post-note — that is, as a *child of the post*, which is backwards.

| # | Input | Mode |
| --- | --- | --- |
| 29 | **Claim** — the one sentence the post exists to assert | resolve |
| 30 | **Thesis bullets** — 5–7 lines of substance | resolve |
| 31 | **Pillar** — which subject area | resolve |
| 32 | **Evidence refs** — which facts and sources back the claim | accumulate |
| 33 | **Timeliness / expiry** — an idea tied to a news hook rots | constrain |
| 34 | **Origin** — human, assistant, harvested, forked | — |
| 35 | **Emphasis assignment** — which bullets *this* derived post leans on | adapt |

Item 35 is the surface that keeps three posts derived from one idea from
reading as three copies of each other.

## D. The post's own fields

| # | Input | Where |
| --- | --- | --- |
| 36 | **Title** | `now` |
| 37 | **Content** | `now` — born empty in `persistOne`. |
| 38 | **Content type** | `now`, constrain — post-type slug, validated against the platform's `AllowedSlugs`. |
| 39 | **Platform** | `now` — `PlatformID`, chosen at *idea-generation* time in `DraftPost`. This is the field the fan-out breaks. |
| 40 | **`TargetAudienceNotes`** | `now` — holds `dp.ToneNotes`. Voice information in an audience-named column. |
| 41 | **Status** | `now` — `draft` conflates "nobody has written this" with "written, awaiting approval". |
| 42 | **Post notes** | `now` — `draft_thesis`, `image_prompt`, `note`; origin manual / assistant / content_plan. |
| 43 | **`UsedAssetIDs`** | `now` — per-post provenance, a subset of the plan-level `UsedAssets`. |
| 44 | **Stamped voice/audience** | `now` — recorded at write time, which is what makes staleness detectable later. |
| 45 | **Idea link** | `new` — `idea_id`, nullable, many posts to one idea. |

## E. Channel

| # | Input | Mode | Where |
| --- | --- | --- | --- |
| 46 | **Character limit** | constrain | `now` — read from the API since CON-91. |
| 47 | **Image size limit** | constrain | `now` — per platform; X's was wrong by 5× until `6285c9d`. |
| 48 | **Allowed post types** | constrain | `now` — enforced in `validateOutput`. |
| 49 | **Cadence** | — | `now` — "1–2 posts per week", steers the planner. |
| 50 | **Format conventions** | adapt | `now` — the `Constraints` string plus `post_quality`'s platform context. |
| 51 | **Connected account** | resolve | behind the campaign-accounts flag. Today the platform is chosen but the account is not. |
| 52 | **Thread / carousel structure** | adapt | not modelled — one post row vs an ordered set. |

## F. Media

| # | Input | Mode |
| --- | --- | --- |
| 53 | Attached assets, generated images (`image_prompt` note), template overlay, per-platform ratio, alt text | adapt |

Each has its own precedence chain and nothing currently resolves them.

## G. Evidence

| # | Input | Mode | Where |
| --- | --- | --- | --- |
| 54 | **Campaign assets** | accumulate | `now` — campaign-scoped since CON-210, retrieved into generation context. |
| 55 | **URL assets** | accumulate | `now` — `Asset.SourceURL`, unique per tenant, **refreshed manually**. A post can rest on a URL whose content changed months ago. |
| 56 | **Retrieval mode** | — | `new` — embedded-and-similar vs fetched-at-generation. |

## H. Time

| # | Input | Where |
| --- | --- | --- |
| 57 | **`ComposeScheduledAt`** | `now` — `publishDate` + campaign publishing days/time/timezone + `SpreadOffset`, an FNV hash of the post id. Deterministic, and arbitrary. |
| 58 | **Scheduled-at lock** | `now` — once set, per PR #3. |
| 59 | **Cross-campaign collision** | **does not exist.** No code in `src/scheduling` looks at other campaigns. |
| 60 | **Derived-sibling spread** | `new` — same idea, three channels, same morning is the failure mode. |
| 61 | **Blackout dates / embargoes** | do not exist. |

## I. Gates

| # | Input | Where |
| --- | --- | --- |
| 62 | **`consistency` flow** | `now` — grades against `campaign.TargetPersona` / `ToneGuidelines` raw; does not call `brandresolve`. |
| 63 | **`post_quality` flow** | `now` — same bypass. |
| 64 | **Fact-check** | checked against the facts ledger. |
| 65 | **Claim / banned-word check** | constrain. |
| 66 | **Approval** | a human transition with no distinct status to live in. |

## J. Governance

| # | Input | Where |
| --- | --- | --- |
| 67 | Tenant scope (`TenantScoped` on every model), `CreatedBy`, task assignment, workspace tier gating (CON-232 hide/lock/sell) | `now` — the tier can make a channel unavailable to a post that otherwise validates. |

## K. Feedback

| # | Input | Where |
| --- | --- | --- |
| 68 | Per-post analytics attributed back to voice, audience, pillar, campaign; `BrandUsage{Drafts, Published}` counted from the stamped ids | `now` |

---

## Where it breaks

Three findings, in descending order of how much they cost.

### 1. The post owns things it should not

Items 29–35 — the entire idea layer — live as a `post_note` hanging off a post
that already has a `platform_id` and a `scheduled_at`. `persistOne` writes the
post row with `Content: ""` and a composed `scheduled_at` *first*, then attaches
the thesis as a note.

Substance is therefore a child of delivery. The consequences:

- There is no state in which an idea exists without a date, so there is no
  review gate — an idea is born already occupying a calendar slot.
- An idea cannot produce more than one post, because it *is* a post.
- `PostStatus.draft` has to mean two different things.

### 2. Four inputs claim the same authority

| Collision | Detail |
| --- | --- |
| Generation vs grading | Generation resolves voice through `brandresolve`; `consistency` and `post_quality` grade against raw campaign prose. When they disagree the app flags its own best work as drift. |
| Audience vs voice | `TargetAudienceNotes` is assigned `dp.ToneNotes` — voice content in an audience-named column. |
| Validation vs template | `validate.go` requires `target_persona` and `tone_guidelines` non-empty; the template no longer renders either. |
| Voice fallback | The fourth rung of the voice chain is free prose, so a structured voice and an unstructured one can both be live. |

### 3. Nothing owns time across campaigns

Item 59. `ComposeScheduledAt` reads one campaign's settings and a hash of the
post id. Two campaigns can put posts on the same channel at the same minute and
nothing notices. This is the strongest single argument for hoisting the calendar
to workspace level: collisions are a workspace fact, and no campaign-scoped
component can see them.

---

## What follows

- **Split idea from post.** Ideas own substance and are channel-agnostic; posts
  own delivery. `posts.idea_id` nullable, many-to-one.
- **`posts.campaign_id` becomes nullable.** Evergreen content has no campaign,
  and the thing that legitimately belongs to several campaigns is the idea, not
  the post.
- **Route every consumer through `brandresolve`.** Grading must read what
  generation read.
- **Split facts from guardrails.** Policy is true because decided and does not
  expire; a fact is true because evidenced and does. Cost: a migration plus a
  prompt change, since `brand_guardrails.facts` has real rows behind a live flag.
- **Rename `target_audience_notes`.** It holds tone.
- **Move platform out of `DraftPost`.** Platform becomes a development-time
  decision, not a generation-time one. This is the largest single change here.
