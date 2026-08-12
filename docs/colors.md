# Color system

How color works in this app, the rules for using it, and the open naming
questions. Produced from the 2026-07 color audit (branch
`chore/color-token-audit`). All tokens live in [`src/index.css`](../src/index.css).

> **The ramp is a blue-cast grey, and the accent is teal (#40A9A4).** The
> neutrals were beige until 2026-08. The swap kept every lightness step
> identical to the fourth decimal and moved only hue and chroma, so no contrast
> ratio and no surface relationship changed — which is rule 4 below working as
> intended. The chroma is deliberately tiny (0.003 → 0.025): this is meant to
> read as grey with the warmth taken out, not as blue. Layer 1 is named
> `--gray-*`.
>
> Type moved at the same time: **Geist** for everything and **Geist Mono** for
> figures, replacing Zalando Sans, Zalando Sans Semi Expanded and Space Grotesk.
> `--font-display` and `--font-grotesk` both point at plain Geist now, so
> headings and uppercase labels separate on size, weight and tracking rather
> than on a second face.

## Architecture: three layers

```
Layer 1 — primitives   --white, --black, --gray-50…900        raw oklch values
Layer 2 — semantic     --background, --primary…--senary(+-foreground),
                       --border*, --ring, --destructive, --positive…
Layer 3 — component    --sidebar-*, --popover-*, --input-*, --table-*,
                       --header-icon, --selection, --editable, --chart-*
```

**Rules (enforced by this audit — keep it that way):**

1. **Components use only semantic/component utility classes** — `bg-primary`,
   `text-tertiary-foreground`, `fill-sidebar`, `shadow-top`. Never `bg-white`,
   Tailwind's own palette (`bg-gray-500`, `bg-slate-200` — these are *not* our
   ramp), `text-[#…]`, `text-[oklch(…)]`, or our Layer 1 steps directly.
2. **Layer 3 references Layer 2** (`--sidebar-secondary: var(--tertiary)`),
   and only falls back to a Layer 1 primitive when no meaning-aligned semantic
   token exists (currently: `--header-icon: var(--gray-800)`,
   `--selection: var(--gray-500)`, `--platform-tile*` (gray-400/500/100),
   `--chart-other/neutral*`).
   Never map to a token whose *meaning* doesn't fit just because the value
   matches (e.g. don't use `--quaternary-foreground` as a surface).
3. **Layer 2 references Layer 1.** Raw oklch values are allowed only in
   Layer 1 and for standalone accents that have no palette scale yet
   (`--destructive`, `--positive`, `--negative`, `--accent`, `--editable`, `--chart-1…5`).
4. **Only Layer 1 knows actual color values.** A palette swap (e.g. the
   previously-explored cool hue-200 variant, see git history of `index.css`)
   must be possible by editing Layer 1 alone.
5. **Naming convention (decided 2026-07): the ordinal scale is the system.**
   Tokens are named `[scope-]<ordinal>[-foreground]`, where the ordinal is
   `primary`, `secondary`, `tertiary`, `quaternary`, `quinary`, `senary` — a
   prominence order, not a lightness order. Scoped component families reuse
   the same ordinals with a prefix (`--sidebar-primary-foreground`,
   `--sidebar-secondary`); a scope's ordinals are independent of Layer 2's
   (sidebar-secondary ≠ secondary). Don't introduce bare scope tokens like
   `--sidebar` — the main pair of a scope is its `-primary` pair. Part-named
   tokens (`--table-row`, `--popover-hover`) are fine where the ordinal rank
   doesn't apply.

## Layer 2 inventory

| Token pair | Value | Intended meaning |
|---|---|---|
| `--background` / `--foreground` | gray-100 / black | App canvas and default text |
| `--primary` / `--primary-foreground` | white / black | Elevated card/panel surface and its text |
| `--secondary` / `--secondary-foreground` | gray-50 / gray-700 | Slightly recessed surface / secondary text |
| `--tertiary` / `--tertiary-foreground` | gray-100 / gray-600 | Muted surface (= background) / muted text |
| `--quaternary` / `--quaternary-foreground` | gray-200 / gray-500 | Hover surface / faint text |
| `--quinary` / `--quinary-foreground` | gray-300 / gray-400 | Border-strength surface / faintest text |
| `--senary` / `--senary-foreground` | gray-400 / gray-300 | Disabled surface / disabled text |
| `--border` | gray-300 | Default hairlines |
| `--border-primary` | black | Emphasized border |
| `--ring` | gray-400 | Focus ring |
| `--destructive`, `--positive`, `--negative`, `--warning`, `--info`, `--attention`, `--accent`, `--editable` | oklch accents | Status / affordance accents (`--warning` = validation warnings, orange; `--accent` = active/selected control, teal #40A9A4 — **fill, not ink**, see below) |

`--accent` is a brand colour, and it does not pass as text: 2.83:1 on white,
under both AA and AA-Large. The ~14 `text-accent` call sites inherit that
problem rather than acquiring it — the orange it replaced scored 2.89:1 — but
they are the thing to look at first if accent text has to be legible.
`oklch(0.55 0.0955 190.71)` (#00837F) is the same hue at 4.60:1.

### The status hues

`StatusTone` in `src/components/ui/status-badge.tsx` is the one place that
maps a state onto a colour; everything with a state goes through it.

| Tone | Token | Means |
| --- | --- | --- |
| `neutral` | `--tertiary-foreground` | No state worth colouring — a draft |
| `progress` | `--info` (blue) | Work in flight and on track — ready to publish, uploading |
| `positive` | `--positive` (green) | Done, or safely handed off — scheduled, published |
| `attention` | `--attention` (violet) | Waiting on a person, nothing wrong — publish-by-hand |
| `warn` | `--warning` (orange) | Off but not broken — degraded, disabled, inactive |
| `negative` / `destructive` | `--negative` / `--destructive` (red) | Failed, or the window passed |

`--info` and `--attention` exist because the two states that need them used to
borrow `--chart-4` and `--chart-5`. Both are orange, so an in-progress badge
and a publish-by-hand badge were the same colour as a validation warning, and
the calendar's warning triangle was indistinguishable from a healthy card's
status edge. **Orange now means exactly one thing** — and since the accent went
teal it really is one thing: `--accent` was the last token still borrowing the
hue, so `--warning` is the only orange left in the app. Don't reach into
`--chart-*` for a state — charts are a categorical scale and carry no meaning
(see the exceptions below); add a semantic token instead.

## Known deliberate exceptions

- **Brand constants stay literal:** platform colors in
  `src/lib/platformDictionary.ts` (LinkedIn blue, YouTube red, …) and the
  white marks inside `src/components/Logo.tsx` are brand-fixed and must not
  follow the theme.
- **Charts** (`--chart-*`) are data-viz colors; they anchor to Layer 1 or raw
  oklch by design, not to surface semantics.
- **Campaign identity** (`--campaign-1…7`) is a categorical scale on the same
  footing as the charts: seven dark, low-chroma hues that tell campaigns apart
  in the sidebar. A campaign's hue is picked by hashing its id
  (`src/lib/campaignColor.ts`), so it is per-campaign and cannot be a static
  utility class — `campaignColorVar(id)` returns `var(--campaign-N)` for the
  SVG `fill`/`stroke` that needs it. Held to one lightness with the chroma
  pushed as far as each hue carries it — seven marks have to be told apart at
  20px, and the first, muted cut of this palette could not be.
- **Shadows** carry their color inside the shadow tokens
  (`--shadow-md`, `--shadow-lg`, `--shadow-top`).

## Fixed in this audit (2026-07)

- Components: `bg-white` ×4 → `bg-primary`; `from-white` → `from-primary`
  (RailPanel fade); `bg-gray-500` → `bg-secondary-foreground` (unsaved dot,
  ≈ same lightness); `text-[oklch(0.4895…)]` → `text-editable` (value was an
  inline copy of the `--editable` token); calendar footer's inline
  `shadow-[0_-2px_12px_rgba(…)]` → new `shadow-top` token.
- shadcn leftover in `ui/sidebar.tsx`: `hsl(var(--sidebar-border))` — wrapping
  an oklch-valued var in `hsl()` produces an invalid color (shadow silently
  dropped). Now `var(--sidebar-border)`.
- Layer 3 → Layer 2 rewiring: `--popover*`, `--input`, `--input-label`,
  `--input-secondary`, `--table-*`, `--header-icon` (was hex `#54504c`,
  now `var(--gray-800)` — ΔL ≈ 0.009, visually identical).
- `.background-fader-*` gradients were hardcoded to the *abandoned* cool
  hue-200 palette variant (a subtle blue tint over the warm background); now
  derived from `var(--color-background)` via `color-mix`.
- Removed dead code: unused `--input-placeholder`, unused
  `.icon-sidebar-active` block (contained `stroke: white`), a no-op
  `.dark { --table-footer: white }`, and the commented-out hue-200 palette
  (recoverable from git history).

## Resolved naming questions (2026-07)

1. **Ordinal scale kept** as the naming system — see rule 5 above.
2. **`--background` vs `--tertiary`** stay separate despite equal values:
   `--background` is the app canvas, `--tertiary` a muted surface that
   currently happens to match it. They may diverge.
3. **`--border-secondary/tertiary/destructive`** deleted — all were aliases of
   `--border` (and `--border-destructive` was unused: `border-destructive`
   classes resolve to `--color-destructive`). Usages now say `border-border` /
   `border-t-border`.
4. **Bare `--sidebar` / `--sidebar-foreground`** deleted (shadcn inheritance);
   per rule 5 the scope's main pair is `--sidebar-primary(-foreground)`, and
   all usages were renamed accordingly.
5. **`--beige-050`** renamed to `--beige-50` to match the Tailwind-style scale.
   (The ramp is `--gray-*` now — see the palette note at the top — but the
   rename that happened was this one.)
