# Adding a platform

Since CON-292 the platform catalogue belongs to the **operator**, not to a
migration we ship. Rows live in the `platforms` table, are added and edited in
Harbor, and `GET /api/platforms` returns the ones with `enabled = true`, ordered
by `sort_order`.

The front end does **not** follow blindly. `lib/platformDictionary` is the list
of networks this build can render, and `buildPlatformViews` drops any row whose
`zernio_id` is not in it. That is deliberate: a platform reaching the app with no
mark, no preview frame, no caption fold, no media rules and no analytics mapping
is broken in five places at once, not merely plain. So the launch order is fixed:

> **Ship support here first. An operator flips `enabled` after.**

Which is what makes it a one-toggle launch with no deploy — the deploy already
happened, possibly months earlier.

## The key is `zernio_id`, never the sqid

A row's `id` is a sqid the server mints. For a platform an operator creates it
cannot be known at build time, so nothing in this app is filed under it — it
addresses a row, and that is all. `zernio_id` (`twitter`, `linkedin`, `tiktok`)
identifies the *network*, and every table below is keyed by it.

Code holding a sqid — `post.platform_id`, a campaign's `target_platforms[].id`,
an analytics key — translates through **`usePlatformCatalog().resolve`**, which
takes either identifier. That hook is the only place the two meet; it reads the
platforms query, so it is a hook rather than a module lookup.

## The checklist

Everything below is required before a platform's switch may be flipped. Items 1
and 5 are enforced by `platformDictionary.test.ts`; the rest are not, so they are
the ones to actually check.

1. **Dictionary entry** — `PLATFORMS` in `lib/platformDictionary.ts`: `zernioId`,
   `name`, `icon`, brand `color`, and the `postTypes` this build can both render
   and publish. Labels are ours, not the seeded `post_types` wording.
2. **Preview** — `components/posts/preview/PostPreviewPanel.tsx`: a renderer in
   `RENDERERS`, plus membership in `FEED_TILES` and in whichever of
   `STORY_NETWORKS` / `THREAD_NETWORKS` / `CAROUSEL_NETWORKS` apply. Without a
   renderer the preview card falls back, which is survivable but wrong-looking.
3. **Caption fold** — `PLATFORM_FOLDS` in `lib/socialText.ts`: where the network
   hides the rest of a caption behind "see more". Absent means the preview never
   folds.
4. **Sequences** — `SEQUENCE_NETWORKS` in `lib/threadSequence.ts`, only if the
   network publishes chains. Behind `thread-sequence`.
5. **Media rules** — a row in `lib/platformMedia.ts`. This one fails *silently*:
   `getPlatformMedia` answers `{}` for a platform it has never heard of, and an
   empty policy means the editor runs **no** image checks at all rather than
   permissive ones. An oversized file then sails through to a publish-time
   rejection. (YouTube is the one deliberate exception — it publishes video only.)
6. **Server-side** — the row needs `zernio_id`, `supported_post_types` and its
   constraint jsonb filled in, and Zernio needs to actually support the network.
   Ours is the display half; theirs is whether anything can publish.

Post types are the same rule one level down: a slug needs a label here, a preview
that can draw it, and a server-side rule before it is offered.

## Global limits we mirror blind

`platform_global_limits` is a single operator-editable row, and no REST endpoint
serves it. We hold copies:

| Ours | Where | Server column |
| --- | --- | --- |
| `MAX_ALT_TEXT_CHARS` | `lib/assetStatus.ts` | `max_alt_text_chars` |
| `MAX_THREAD_POSTS` | `lib/threadSequence.ts` | `max_thread_segments` |

They match the seeded values today. Change one in Harbor and the client will not
notice — it will keep measuring against the old number and the server will reject
at publish. `MAX_VIDEO_UPLOAD_BYTES` is *not* in this table: it is deliberately
ours and below the server's ceiling, so it wins on purpose.

The fix is for these to ride along on `GET /api/platforms`. Until then, changing
a global limit is a coordinated change, not a config edit.
