# Quality tooling

What runs against this repo, what each tool is allowed to fail a build over,
and why the lines are drawn where they are.

Before this landed, `eslint`, `prettier`, `stylelint` and `typescript-eslint`
were all in `devDependencies` with **no config file for any of them**, and
`pnpm lint` had been dead since the ESLint 10 upgrade removed `--ext`. Nothing
ran `tsc`, the tests or the build except a person remembering to. That is the
gap this closes.

## The gates

`.github/workflows/ci.yml` runs on every PR into `develop` or `main`, and on
pushes to both. Each step carries `if: '!cancelled()'` so one push reports
everything that is wrong rather than only the first thing:

| Step | Command | Fails on |
| --- | --- | --- |
| Typecheck | `pnpm typecheck` | any TS error |
| Lint | `pnpm lint` | any ESLint **error** (warnings do not fail) |
| Format | `pnpm format:check` | any file Prettier would rewrite |
| Test | `pnpm test` | any failing test |
| Build | `pnpm build` | a broken production build |
| Route tree | `git diff --exit-code -- src/routeTree.gen.ts` | a stale committed route tree |

That last one is worth its own line. `src/routeTree.gen.ts` is generated during
the build, and CLAUDE.md forbids hand-editing it — but nothing stopped a stale
copy being committed, which means routing in CI silently differs from routing
on the branch. The build regenerates it; if that changes the file, the commit
was stale.

`knip` is deliberately **not** a gate. See below.

## ESLint

Two jobs, kept in separate blocks in `eslint.config.js`.

**Finding bugs.** `eslint-plugin-react-hooks` is the reason the file exists. A
stale dependency array in a debounced autosave is the class of bug that reaches
production quietly, and `tsc` cannot see it. `rules-of-hooks` and
`exhaustive-deps` are **errors** and sit at zero.

**Enforcing CLAUDE.md.** Every rule under "repo conventions" is one a reviewer
used to have to catch by eye, and each message says what to do instead, so the
failure teaches the rule:

- **No `z-[…]` classes** — z-index comes from `config/zIndex.ts` as an inline
  style, so the stacking order of the whole app is readable in one file. No
  exemptions.
- **No `bg-white` / `text-black`** — colours only through semantic tokens
  (`docs/colors.md`). One exemption: `src/components/posts/preview/**`, which
  draws *the platform's* chrome — YouTube's duration pill, a Story's caption
  over its image. That chrome is not ours to re-theme, and a semantic token
  there would make the preview lie about what publishing looks like.
- **No bare `fetch` outside `services/api/`** — a bare `fetch` skips the
  `X-Workspace-Id` header and lands in whichever workspace the account happens
  to default to, which is the one bug per-request scoping exists to prevent.

Formatting is **not** ESLint's job: `eslint-config-prettier` is applied last and
switches off every stylistic rule, so the two never argue.

### Why the React Compiler rules are warnings

`react-hooks` v7 ships the React Compiler rules — `set-state-in-effect`,
`refs`, `purity`, `preserve-manual-memoization`, `incompatible-library`. They
report 123 problems against code written before they existed, and **every one
of them is a judgement call about a component's behaviour, not a mechanical
fix**. Made errors today they would teach exactly one habit: reaching for
`eslint-disable`.

So they are warnings, visible and counted. Triage them in their own pass, and
promote each rule to `error` as its category reaches zero. When the last one
goes, delete that block from the config.

The same reasoning covers `react-refresh/only-export-components` (55 warnings):
real advice about fast-refresh boundaries, not worth blocking a merge over.

### Suppressions

Four exist, and every one names its reason on the line above. They are not
concessions — they are places where the rule is right in general and wrong
here:

- `src/lib/redirects.ts` — `no-control-regex`. Matching control characters is
  the entire point; they are what the URL parser strips, so the open-redirect
  shape checks have to see the string without them.
- `src/lib/staleWorkspace.ts` — `no-restricted-globals`. Bare `fetch` on
  purpose: this module is imported *from* the API layer's own response check,
  and routing the recovery back through it would close an import cycle.
- `src/components/content/AssetEditor.tsx` — `exhaustive-deps`. Load-once on
  purpose; re-running on `initialContent` would replace the blocks under
  someone mid-edit.
- `src/hooks/useActivity.ts` — `exhaustive-deps`. `dataUpdatedAt` is the
  dependency deliberately: it is what makes the clock tick once per delivery of
  the data rather than once per render.

Turning ESLint back on also found a suppression that **had never worked**: in
`src/test/renderWithProviders.tsx` the `eslint-disable-next-line` sat three
lines above the code it meant to cover, because the explanation was written
*after* the directive rather than before it. Put the prose first and the
directive last, always.

## Prettier

`.prettierrc` matches what the codebase already does rather than imposing
defaults — **no semicolons** (2291 lines against 402) and **single quotes**
(1886 against 391) — so the one-time reformat is as small as it can be.

`.prettierignore` excludes the generated route tree, build output, the lockfile,
the untracked per-worktree `vite.config.js` overlay, and **`*.md`**: prose in
this repo is hand-wrapped and the wrapping is deliberate.

`.editorconfig` covers the file types Prettier does not own. Keep the two in
agreement.

## knip — a report, not a gate

`pnpm knip` lists unused files, exports and dependencies. It is not in CI,
because a finding is a question ("is this dead, or not wired up yet?") and this
codebase deliberately runs ahead of the API — a stub with no caller yet is the
documented pattern, not a defect.

`src/components/ui/**` is ignored: those are vendored shadcn primitives that
export their whole API on purpose, and reporting them drowned the real
findings.

## What is deliberately not here

- **Type-aware linting** (`recommendedTypeChecked` — `no-floating-promises`,
  `no-misused-promises`, `no-unnecessary-condition`). The obvious next step and
  the highest-value one left: it needs the TS program on every run, and the
  existing violations have not been triaged.
- **stylelint.** It was a dependency with no config, doing nothing, and has
  been removed. Add it back with a Tailwind v4-aware config if `src/index.css`
  ever grows enough to need one.
- **A pre-commit hook.** CI is the backstop; a hook is friction every commit
  pays for a problem that surfaces once.
