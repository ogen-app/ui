# Feature flags & stubs

Conventions for declaring, overriding and retiring feature flags, and stubbing a back end that does not exist yet. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **Anything the API doesn't support yet ships behind a feature flag** — see
  the global rule at the bottom of this file. Flags are declared in
  `config/featureFlags.ts` (a constant today, flipped by editing that file) and
  read with `useFeatureFlag(id)` (`isFeatureEnabled(id)` outside React), never
  from the `FEATURE_FLAGS` record directly: the hook is the seam where
  server-driven values will land, and going through it keeps every call site
  untouched when they do. A flag is not a permission.

- **A flag's life ends at the second merge, not the first.** Turning one on is
  a deliberate step; deleting it is the *next* one, once the feature has
  survived one real deploy and nobody has reached for the switch. A flag left
  on is a branch nobody takes, and every reader of its call sites has to answer
  "and when this is false?" about code that has not run since it shipped.
  **The `true` entries are the ones on a clock — the `false` ones are the
  mechanism working**, holding unshippable work on `develop`, and their number
  is not a problem to solve. Reviewed on the first working day of each month:
  every flag that is on and has had a deploy goes, with its off-branch, in a
  commit that touches nothing else.

- **On staging and in dev, a flag can be forced for one browser.** A
  `?ff=tasks,-ideas` link or the unlisted `/flags` panel writes an override
  to localStorage, so one teammate can exercise a half-built feature on the
  shared deploy while everyone else sees the app as it ships. Deliberately
  *not* in `/api/settings` — that row is workspace-wide, which is the opposite
  of what this is for. The whole layer is compiled out unless the build sets
  `VITE_DEV_TOOLS=1`, so in production the key is inert and the panel's chunk
  does not exist; keep it that way, and never link `/flags` from the app. See
  `docs/technical-decisions.md#staging-flag-overrides`.

- **A feature waiting on the back end is stubbed with a JSON seed, never with
  MSW.** When a flagged feature needs data the server cannot answer for yet,
  write the normal `services/api/<thing>.ts` with the signatures the endpoint
  will have, and back them with a `.seed.json` plus `localStorage` and a small
  delay — `services/api/tiers.stub.ts` was the pattern until CON-328 wired
  billing to the real API and deleted it, and `services/api/brand.ts` before
  that, until CON-245. A service worker buys wire fidelity for a contract nobody has agreed,
  and the mock ends up inventing the API; a plain module is one readable file,
  and swapping each body for an
  `apiJson` call leaves the hook, the routes and the components untouched. Rules
  that make it safe: the stub is reached only through its hook, its doc comment
  names what it is, and it stays behind the feature's flag like everything else
  the API can't back.
