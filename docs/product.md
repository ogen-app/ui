# Ogen — Product & Domain Overview

> **Sourcing.** Ogen has no single PRD. Requirements live per-ticket in **Linear**
> under the **Ogen** team / **`CON`** issue key (project: _MVP application
> development_); ~30 tickets carry full PRDs (`requirements_available` label).
> This document synthesizes those tickets with the code in this repo.
> Feature-level `CON-XX` references point at the authoritative spec. The app's
> internal name is **"Content Control Center" (C3)** — hence the `CON` prefix.

## What Ogen is

Ogen is a **multi-tenant, AI-assisted platform for planning, generating, and
publishing social-media content**. A team signs up as an organization, defines a
**campaign** (audience, messaging, tone, target platforms, and a typed sequence
of phases), and Ogen **generates a time-distributed plan of draft posts** with
Claude. The team refines posts — increasingly with an **AI Post Assistant** —
and **schedules them to publish** to social networks through a publishing
integration (Zernio). A **Content Bank** of reusable, semantically-searchable
source material grounds the generation.

This repository (`ogen-app/ui`) is **only the front-end** — a React + Vite SPA.
It was split out of the `ogen` Go monorepo (CON-98) and deploys independently;
the Go API no longer embeds it. See [`architecture.md`](./architecture.md) for
how the SPA is built and [`technical-decisions.md`](./technical-decisions.md)
for why.

## Direction & current priorities

Ogen is **actively transitioning to a multi-tenant SaaS**. In that model,
**Claude (generation) and Zernio (publishing) run centrally "under the hood"** —
their API keys are Ogen-wide, KEK-encrypted, and encapsulated in the API; tenants
neither see nor configure them (CON-97 §10.3, CON-99). What each tenant still does
is **connect its own social accounts** (LinkedIn, X, …) through its own Zernio
profile (CON-102, CON-100).

> **Consequence for this UI:** the old **Instance Settings → API Keys** screen
> (bring-your-own Anthropic/Zernio keys) was **removed** (2026-07) — those keys
> are platform-managed, not tenant-facing. The page is now **Workspace
> Settings** (tenant name/slug + the account-connection flow).

**Near-term priorities (in order):**

1. **Post Assistant + post editing** — surface the AI chat, post versioning, and
   editing flows in the UI (CON-42, CON-61 and siblings).
2. ~~**Complete the multi-tenancy migration** on the front-end~~ — ✅ landed
   2026-07 (CON-97/99/100/102): real `current_user` identity, workspace
   settings, per-instance key config removed. Remainder: invite-teammate UI
   (CON-26) and in-app account connect (after CON-100).
3. Everything else is secondary — including **Content-Bank AI image generation and
   storage** (CON-105/88/83): desirable, but explicitly **not a main goal**.

## Feature status legend

The AI and publishing capabilities are built API-first, so a feature is often
live on the backend before it appears in this UI. Each feature below is tagged:

- ✅ **In UI** — usable in this front-end today.
- 🔧 **Backend-ready** — implemented and speced on the API; **not yet wired into
  this UI** (the surface here is a placeholder or absent).
- 🗓️ **Planned** — speced or backlogged; not built.

## System at a glance

| Component | Role | Where |
|---|---|---|
| **UI** | This repo — React SPA | `ogen-app/ui` |
| **API** | Go backend (`alephbetai/ogen`) — source of truth for all domain rules; hosts the AI flows | `ogen-app/ogen` |
| **Genkit flows** | Go **Genkit** flows orchestrate generation, calling **Claude Sonnet 4.5** via the Anthropic plugin; stream results over **SSE** | in API |
| **Job queue (River)** | Runs the async publishing / polling / cancel jobs (originally Backlite on SQLite; migrated with the DB) | in API |
| **Postgres + pgvector** | Relational store + vector column for asset embeddings (CON-87) | infra |
| **pdf-service** | gRPC microservice (CGO + libpdfium) parsing Content-Bank PDFs → text, page-aware chunks, thumbnails (CON-103) | `ogen-app/pdf-service` |

**External services:** **Anthropic / Claude** (content generation — Sonnet 4.5
is the default writing model), **Gemini Embedding 2** (asset embeddings, CON-101),
**Cloudflare R2 / S3** (image + PDF storage), **Zernio** (social publishing).
The Anthropic, Zernio, and storage credentials are **Ogen-wide**, KEK-encrypted,
encapsulated in the API, and shared by all tenants — **not tenant-configurable**
(CON-97 §10.3, CON-99).

The browser talks to the API over app-relative `/api/...` requests, proxied
same-origin (Vite in dev, Caddy in production) — normally no CORS, and the
session cookie flows naturally. See [`README.md`](../README.md) for the wirings.

## Core domain concepts

The domain is small and stable. These types live in `src/types/` and mirror the
Go models; the API is the source of truth and rejects invalid states.

### Tenant & User ✅

A **Tenant** is an organization / workspace. Ogen uses **naive pooled
multi-tenancy** (CON-97): one shared database with a `tenant_id` on every
tenant-owned row and central, **fail-closed** query scoping on the API — **tenant
isolation is a hard, server-enforced boundary** (no request, query, background
job, SSE event, or stored object crosses tenants). Every user belongs to exactly
one tenant. Signup is self-service: the form collects first/last name + an
organization name and provisions the tenant + first user + session atomically
(`POST /api/tenants`). **Users** authenticate with email + password; the session
is an `HTTPOnly` cookie, and the client keeps only a mirror of the user in
`authStore`. Dependency credentials (Claude, Zernio, storage) are **Ogen-wide and
not tenant-configurable** (CON-99). _User invitations (CON-26),
collaboration/commenting (CON-25), and a tenant-settings UI are 🗓️ planned._

### Campaign ✅

The central planning unit (`src/types/campaigns.ts`). A campaign carries the
creative brief and targeting that drive generation:

- **Brief** — `description`, `target_persona`, `key_messages`, `tone_guidelines`,
  `language`. Entered manually today; ✅ **AI brief-enrichment** (CON-56) can draft
  all four fields from just the title + campaign type, but that endpoint
  (`POST /api/campaigns/:id/enrich-brief`, SSE) is 🔧 backend-ready and not yet in
  this UI.
- **Type & phases** — a **campaign type** with an ordered list of **phases**
  (each a named stage with a `purpose` and `sequence`). Types are objective-based
  (CON-35): **Awareness, Engagement, Conversion, Retention** — each defines its
  own content-generation phases — plus an out-of-the-box **Evergreen** type
  (CON-57). Types can be system-provided or custom.
- **Targeting** — `target_platforms` (each platform + the post types to produce).
- **Grounding** — `use_assets` + `asset_ids` link Content-Bank material in.
- **Planning metadata** — `start_date`/`end_date`, `budget`/`currency`, `tags`.
- **Goal** (CON-182) — `estimated_post_count` posts per `goal_cadence` period
  (`week`/`month`). A *rate*, not a total: the content plan multiplies it by the
  periods the campaign's dates span, and the overview reports progress period by
  period. It meant the whole-campaign total before CON-182.
- **Schedule** (CON-181) — `publishing_time` + `timezone`, `publishing_days`
  (the weekdays it publishes on), and `spread_minutes` of jitter either side of
  the time. The content plan places every generated draft by these.
- **Status** — `draft → active`.

### Content Plan (AI generation) 🔧

The flagship flow (CON-28). From a completed brief, Ogen generates a
**time-distributed set of draft posts** across the campaign's target platforms:
the model decides how many posts based on the date range, platform cadence, and
phases (earlier phases front-loaded), grounds them in linked Content-Bank assets
(semantically ranked when they exceed the context budget), and persists the whole
batch in one transaction. It runs as the `content_plan` Genkit flow calling an
Anthropic model, streamed over SSE (`POST /api/campaigns/:id/generate-draft`).
**Backend-ready; this UI does not yet trigger generation** (no generate control
is wired). The `AI assistant` right-rail panel is a "Coming Soon" placeholder.

### Post ✅

A single piece of content for one platform (`src/types/posts.ts`) — belongs to a
campaign, targets a `platform_id` + `platform_post_type`, and carries editable
`content` (BlockNote rich text), `media_urls`, an optional call-to-action, the
schedule, and the assets it drew on. Its lifecycle is a **state machine**
(`src/lib/postStatusMachine.ts`) mirroring the server's `ValidPostTransitions`:

```text
draft → ready_for_publish → scheduled                         → published / failed
                          → scheduled_for_manual_publishing    → published / not_published
```

- `scheduled` = auto-publish; the publisher worker moves it to `published`/`failed`.
- `scheduled_for_manual_publishing` = the user publishes by hand. The split is
  driven by a **workspace auto-publish allowlist** (CON-65) of which post types may
  auto-publish.
- **Unscheduling is not a status edit.** Cancelling a `scheduled` post goes through
  `POST /api/posts/:id/cancel`, which cancels the publisher job; the status changes
  only once the cancel lands (CON-72). See
  [`technical-decisions.md`](./technical-decisions.md#cancel-vs-transition).

### Post Assistant & versioning 🔧

An AI **chat interface** to enhance a single post's content (CON-42): rephrase,
expand, condense, adjust tone, or pull information from a specific asset (via
on-demand chunk-retrieval tools), preserving the campaign voice and phase intent.
It keeps **per-post conversation history** and creates **post versions**
automatically on significant edits (CON-44/68); the campaign always references the
latest version. Implemented as the `postAssistant` Genkit flow. **Backend work is
in progress; the UI (CON-61) is not built** — only the "Coming Soon" panel exists.

### Content Bank (Assets) ✅

Reusable source material generation draws on (`src/types/content.ts`). An **Asset**
is Markdown **text** (`MD`) written in-app, an uploaded **PDF** file (or
multiple `.md` files uploaded at once — CON-46), a **web page** the backend
scraped to Markdown (`URL`, CON-222), or an **image** (`IMG`, CON-246). Uploads
process asynchronously
(`pending → processing → ready | partial | failed`); the backend extracts text,
splits it into page-aware chunks (CON-47), and embeds the chunks (Gemini) so
campaigns retrieve relevant passages by meaning. Assets are tagged and filtered
in one table — the old **All / Text / Files / Imagery** tabs went with the
workspace bank's previous layout (CON-210/211) and did not come back; the
distinction survives as a glyph on the row (`src/lib/assetCategory.ts`).

_An image asset holds the picture itself, not a picture pasted inside a
document: JPEG/PNG/WebP/GIF up to 10 MB, probed and stored by the server, which
also dedupes a re-upload of the same bytes (CON-246). It is the buildable slice
of CON-16 — the publishing bridge (attaching a bank image to a post as a real
attachment) is still missing, as is a thumbnail job, so a preview today is the
full file scaled down. **Generating** images (Google "Nano Banana" / Gemini) is
CON-105/88/83 — a desirable extension, **not a main goal**._ Historical note:
assets were originally called **"Pieces"** (renamed in CON-48).

### Platforms & Publishing

Supported networks (the Ogen allowlist): **LinkedIn, X/Twitter, Instagram,
Facebook, Threads, YouTube**. Each **Platform** exposes its post types, cadence,
and constraints from the API; user-facing names, icons, brand colors, and
post-type labels are held client-side in `src/lib/platformDictionary.ts`.

- ✅ **Account connection** (CON-62, CON-102) — each **tenant** gets its own Zernio
  profile (`Ogen #{tenant_id}`, provisioned at signup) over the **shared,
  platform-managed Zernio key**; the user requests per-platform **connect links**,
  and a **per-tenant sync worker** (CON-100) discovers authorized accounts in
  isolation. The UI connects accounts **in-app** (Workspace Settings → Connect
  Platforms tile grid → one-shot connect link in a new tab → the sync mirrors
  the account back) and shows connected platforms with status (`useZernio`,
  `services/api/zernio.ts`). Disconnect is not possible yet — no API endpoint.
  This is the account-connection flow that **stays** under the SaaS model.
- 🔧 **Auto-publish pipeline** (CON-69) — the UI drives the user-facing parts
  (mark ready, schedule, cancel), but the actual publishing is backend jobs:
  submit-to-Zernio → poll status → reconcile/cancel, each transition recorded in a
  **Post Log** audit trail. Pre-publish per-post-type validation gates
  `draft → ready_for_publish` (CON-74).

### Workspace Settings ✅

Workspace Settings (`src/routes/_authenticated/workspace-settings`) has two
sections:

- **Workspace** (`WorkspaceSection`) — the tenant's name (renamable via
  `PUT /api/tenants/:id`) and stable slug (CON-97).
- **Platforms** (`PlatformsSection`) — connecting the tenant's own social
  accounts via its per-tenant Zernio profile.

The former bring-your-own **API Keys** section (CON-64) was **removed**
(2026-07): credentials are centralized and platform-managed (CON-99/104);
secrets are Ogen-wide and exempt from tenant scoping (CON-97 §10.3), so
tenants never see or configure them.

## The content-generation stack

All generation runs on the API as **Genkit flows** (Go) that call **Claude Sonnet
4.5** through the Genkit Anthropic plugin and **stream results over SSE**, ending
with an explicit `complete` event the client treats as the source of truth. A
single **Ogen-wide, platform-managed** Anthropic key gates these (a missing key
returns `503`); it is not tenant-configurable (CON-97 §10.3, CON-99). The three
flows:

| Flow | Purpose | CON | UI |
|---|---|---|---|
| `content_plan` | Generate the campaign's draft posts | CON-28 | 🔧 |
| `enrichBrief` | Draft the four brief fields from title + type | CON-56 | 🔧 |
| `postAssistant` | Chat-edit a single post, with asset tools + versioning | CON-42 | 🔧 |

A separate **post-quality assessment agent** (CON-85) scores posts. Embeddings for
semantic asset retrieval use **Gemini Embedding 2** (CON-101).

## Primary user journeys

1. **Onboard** ✅ — sign up an organization → land in the app (CON-97).
2. **Connect accounts** ✅ — connect the tenant's social accounts via Zernio (the
   Anthropic/Zernio keys are centrally managed, not configured here).
3. **Build the Content Bank** ✅ — write text assets or upload PDFs/Markdown; wait
   for `ready`.
4. **Create a campaign** ✅ — pick an objective-based type, fill the brief (🔧 with AI
   enrichment), choose target platforms + post types, link supporting assets.
5. **Generate the plan** 🔧 — produce a time-distributed set of draft posts across
   phases and platforms (backend today).
6. **Refine posts** ✅ manually / 🔧 with the Post Assistant — edit content in the
   BlockNote editor; versions are captured.
7. **Publish** ✅/🔧 — mark a post ready, schedule it for auto- or manual publishing;
   the backend publishes and the UI reflects the landed status.

## Roadmap

The near-term ordering is in
[Direction & current priorities](#direction--current-priorities). The broader
backlog, from Linear (status as of this writing):

**Priority — surface built-but-hidden work & finish the SaaS cutover**

- **Post Assistant, versioning & post-editing UIs** (CON-61 and siblings) —
  surface the 🔧 backend-ready flows in this app.
- **Multi-tenancy front-end completion** — ✅ landed 2026-07 (real
  `current_user` identity + tenant in the UI, workspace settings with rename,
  per-instance API-key config removed; in-app account-connect flow landed
  2026-07-06; per-account **disconnect** landed 2026-08, CON-133). Remaining:
  an invite-teammate UI (CON-26, unspecified).

**Secondary — desirable, not a main goal**

- **Content-Bank images** — uploading them (CON-16), then generating them with
  Google "Nano Banana" / Gemini image models, and a Sanity-style media library
  (CON-105, CON-88, CON-83). Blocked on the server: no `IMG` asset type, and
  the upload endpoint takes `.md` and `.pdf` only.

**Later**

- **Post analytics** from Zernio-published posts (CON-93).
- **Usage metering & per-tenant cost limits** across models and publishers (CON-86).
- **OpenTelemetry** for backend and frontend (CON-96).
- **Collaboration / commenting** (CON-25) and **user invitations** (CON-26).
- **Notifications** on long-running job completion (CON-55).
- **Timezone handling** — normalize to UTC with markers (CON-94).

## Where to go next

- [`architecture.md`](./architecture.md) — how the front-end is structured.
- [`technical-decisions.md`](./technical-decisions.md) — notable choices + rationale.
- [`../CLAUDE.md`](../CLAUDE.md) — working conventions for this repo.
- [`../README.md`](../README.md) — running locally and deploying.
