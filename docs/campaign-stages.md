# Campaign stages

How campaign stages ("phases") are set up today, what the front end does and
doesn't do with them, and a proposal for making them a real part of the
calendar. Nothing in the *Proposal* section is built yet.

## What exists today

### They belong to the campaign **type**, not to the campaign

```
campaigns_types            campaigns_types_phases        posts
  id, name, label            id                            campaign_type_phase_id → phase.id
  description                campaign_type_id → type.id    (nullable)
  is_system                  name
                             purpose
                             sequence
```

A phase is a row on `campaigns_types_phases`, hanging off a *type*. The seed
migration ships five system types with two to three phases each:

| Type | Phases (in sequence) |
| --- | --- |
| Awareness | Launch & Distribution → Sustain & Optimize |
| Conversion | Capture → Nurture & Persuade → Close & Validate |
| Engagement | Activate → Deepen → Sustain & Compound |
| Evergreen | Foundation → Distribute & Cross-Link → Refresh & Compound |
| Retention | Activate & Embed → Deepen & Expand → Sustain & Recover |

Each phase carries a long `purpose` describing the content that belongs in it
— they read as authoring guidance, and that is mostly how the generator uses
them.

The consequence worth stating plainly: **two campaigns of the same type share
one set of phases.** A campaign cannot rename, add, or re-order its own stages
without cloning the whole type.

### Phases have no dates

Nothing stores when a phase starts or ends. The date window is *derived*, in
`reschedule.Plan` (Go, CON-115): the campaign's `[start_date, end_date]` range
is cut into **N equal slices** in `sequence` order, and each phase gets the
slice at its index. Posts in a phase spread evenly inside that slice; posts
with no phase (or a stale one) spread across the whole range. Only `draft` and
`ready_for_publish` posts move — anything `scheduled` or `published` carries a
committed publish job and is left alone.

So "Capture runs for the first two weeks" is not something a user can express.
Equal slices is the only shape available.

### API surface

| Endpoint | Notes |
| --- | --- |
| `GET /api/campaign_types` | types with their `phases[]` |
| `POST /api/campaign_types/:id/clone` | copies a type **and its phases** into a new non-system type |
| `POST /api/campaign_types/:id/phases` | add |
| `PUT /api/campaign_types/:id/phases/:phase_id` | rename / re-sequence |
| `DELETE /api/campaign_types/:id/phases/:phase_id` | remove |
| `GET /api/campaigns/:id/overview` | returns `phases[] {id, sequence, name, purpose, postCount}` and `distribution.unassignedPhasePostCount` |

> **Hazard.** `PUT /api/campaign_types/:id` and `DELETE` both refuse when
> `is_system` is true, but the three **phase** endpoints have no such guard.
> The API will let a client rewrite the phases of the shared "Conversion" type
> and silently change every campaign of that type in the tenant. Any phase
> editor must clone first (see *Stage B*), and the guard belongs on the server
> too — worth a backend ticket.

### What the front end does with them now

- **Post settings → ADVANCED → "Campaign phase"** — a select, disabled when the
  type has no phases. This is the only place a user ever sees a stage.
- **Attention rule `phase-orphaned`** — posts left pointing at a phase the
  campaign's type no longer has (`docs/attention-rules.md`).
- **Content-plan generation** — the model returns a `phaseId` per drafted post
  (`types/contentPlan.ts`), so generated posts arrive already assigned.
- **Assistant `redistributePosts`** — calls the Go reschedule action; the UI
  only renders the result card ("N posts across M phases").

Not used anywhere: the calendar, the list view, the toolbar, campaign
settings, or the overview screen. `getCampaignOverview` is fetched by nothing.

## Proposal

Three stages, in dependency order. A and B are front-end only and land against
the API as it stands; C needs a backend change and should wait until the shape
has been proven by A.

### Stage A — make stages visible (no API change)

The calendar is where a plan is read, and right now the plan's structure is
invisible on it.

1. **`src/lib/campaignPhases.ts`** — mirror the Go slicing rule (per the
   "`src/lib` mirrors Go server rules" convention): given a campaign and its
   type's phases, return `{ phase, start, end }[]`, plus `phaseForDay(date)`.
   One place computes windows; everything below reads it. It must stay in step
   with `reschedule.Plan` — note that in the file, as `postStatusMachine.ts`
   does.
2. **Phase band on the weekly calendar** — a thin strip above the day headers
   showing which phase each visible day falls in, one tone per phase, name
   shown once per run. On a week that sits entirely inside one phase this is a
   single labelled bar; on a boundary week it shows the handover. Days outside
   `[start_date, end_date]` get no band, which is itself informative.
3. **Phase on the post card** — the card is already dense at 4px padding, so
   this should be the accent, not another row: tint the existing left border by
   phase where status doesn't already claim it, or show the phase name in the
   card's tooltip. Worth prototyping both; status colour is load-bearing and
   must not be weakened.
4. **A `phase-out-of-window` attention rule** — a post whose `scheduled_at`
   falls outside its own phase's window. This is the rule that makes the band
   worth drawing: it is currently invisible and is exactly what drag-and-drop
   creates.
5. **Drag-and-drop stays phase-neutral.** Dropping a post on a day changes
   `scheduled_at` only; it must *not* silently rewrite `campaign_type_phase_id`
   — the phase is an editorial decision about what the post is, not about when
   it runs. The mismatch surfaces via rule 4 instead, and the fix is one click
   from there.

Cost: contained. No new endpoints, no migration.

### Stage B — let users manage stages (no API change, careful UX)

A "Stages" section in campaign settings listing the type's phases with
add / rename / re-order / remove, on the `/phases` endpoints.

The whole design problem here is the system-type trap. When the campaign's
type has `is_system: true`, editing must not touch it. The flow:

1. User edits a stage on a system type.
2. UI clones the type (`POST /api/campaign_types/:id/clone`, named e.g.
   "Conversion (Acme launch)"), which copies the phases with **new ids**.
3. UI repoints the campaign at the clone, and remaps every post's
   `campaign_type_phase_id` from old id → new id by sequence.
4. Only then applies the edit.

Step 3 is the risky one — get it wrong and every post in the campaign trips
`phase-orphaned`. It wants a confirmation ("This will create a copy of the
Conversion plan for this campaign") and a test. If that is more than we want to
own, Stage B should wait for Stage C, which removes the trap entirely.

### Stage C — per-campaign stages with real dates (needs backend)

The honest fix. A new `campaign_phases` table (`campaign_id`, `name`,
`purpose`, `sequence`, `start_date`, `end_date`), seeded from the type's phases
when a campaign is created. Then:

- stages are the campaign's own — no cloning, no shared-template trap;
- windows are explicit, so a user can drag the phase band to say "Capture runs
  two weeks, Nurture six";
- `reschedule.Plan` reads stored dates instead of cutting equal slices, and
  everything built in Stage A keeps working against a better source;
- the type's phases become what they should be — a **template** applied at
  creation.

Migration: backfill `campaign_phases` from each campaign's type using the same
equal-slice rule, so nothing observable changes on the day it ships.

### Recommendation

Do **A** now — it is self-contained, it makes the existing backend behaviour
legible, and rules 4 and 5 pay for themselves the first time someone drags a
post across a phase boundary. Hold **B** until we know whether users actually
want to edit stages, since the clone dance is most of its cost. Open a backend
ticket for **C** and for the missing `is_system` guard on the phase endpoints.
