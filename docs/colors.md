# Color system

How color works in this app, the rules for using it, and the open naming
questions. Produced from the 2026-07 color audit (branch
`chore/color-token-audit`). All tokens live in [`src/index.css`](../src/index.css).

## Architecture: three layers

```
Layer 1 — primitives   --white, --black, --beige-050…900        raw oklch values
Layer 2 — semantic     --background, --primary…--senary(+-foreground),
                       --border*, --ring, --destructive, --positive…
Layer 3 — component    --sidebar-*, --popover-*, --input-*, --table-*,
                       --header-icon, --selection, --editable, --chart-*
```

**Rules (enforced by this audit — keep it that way):**

1. **Components use only semantic/component utility classes** — `bg-primary`,
   `text-tertiary-foreground`, `fill-sidebar`, `shadow-top`. Never `bg-white`,
   `bg-gray-500`, `text-[#…]`, `text-[oklch(…)]`, or beige steps.
2. **Layer 3 references Layer 2** (`--sidebar-secondary: var(--tertiary)`),
   and only falls back to a Layer 1 primitive when no meaning-aligned semantic
   token exists (currently: `--header-icon: var(--beige-800)`,
   `--selection: var(--beige-500)`, `--chart-other/neutral*`).
   Never map to a token whose *meaning* doesn't fit just because the value
   matches (e.g. don't use `--quaternary-foreground` as a surface).
3. **Layer 2 references Layer 1.** Raw oklch values are allowed only in
   Layer 1 and for standalone accents that have no palette scale yet
   (`--destructive`, `--positive`, `--negative`, `--editable`, `--chart-1…5`).
4. **Only Layer 1 knows actual color values.** A palette swap (e.g. the
   previously-explored cool hue-200 variant, see git history of `index.css`)
   must be possible by editing Layer 1 alone.

## Layer 2 inventory

| Token pair | Value | Intended meaning |
|---|---|---|
| `--background` / `--foreground` | beige-100 / black | App canvas and default text |
| `--primary` / `--primary-foreground` | white / black | Elevated card/panel surface and its text |
| `--secondary` / `--secondary-foreground` | beige-050 / beige-700 | Slightly recessed surface / secondary text |
| `--tertiary` / `--tertiary-foreground` | beige-100 / beige-600 | Muted surface (= background) / muted text |
| `--quaternary` / `--quaternary-foreground` | beige-200 / beige-500 | Hover surface / faint text |
| `--quinary` / `--quinary-foreground` | beige-300 / beige-400 | Border-strength surface / faintest text |
| `--senary` / `--senary-foreground` | beige-400 / beige-300 | Disabled surface / disabled text |
| `--border`, `--border-secondary/tertiary/destructive` | beige-300 | Default hairlines (three aliases — see open questions) |
| `--border-primary` | black | Emphasized border |
| `--ring` | beige-400 | Focus ring |
| `--destructive`, `--positive`, `--negative`, `--editable` | oklch accents | Status / affordance accents |

## Known deliberate exceptions

- **Brand constants stay literal:** platform colors in
  `src/lib/platformDictionary.ts` (LinkedIn blue, YouTube red, …) and the
  white marks inside `src/components/Logo.tsx` are brand-fixed and must not
  follow the theme.
- **Charts** (`--chart-*`) are data-viz colors; they anchor to Layer 1 or raw
  oklch by design, not to surface semantics.
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
  now `var(--beige-800)` — ΔL ≈ 0.009, visually identical).
- `.background-fader-*` gradients were hardcoded to the *abandoned* cool
  hue-200 palette variant (a subtle blue tint over the warm background); now
  derived from `var(--color-background)` via `color-mix`.
- Removed dead code: unused `--input-placeholder`, unused
  `.icon-sidebar-active` block (contained `stroke: white`), a no-op
  `.dark { --table-footer: white }`, and the commented-out hue-200 palette
  (recoverable from git history).

## Open naming questions (not yet changed)

1. **The ordinal scale (`primary…senary`) hides direction and intent.**
   `--senary-foreground` is *lighter* than `--quinary-foreground`, and nothing
   says whether a step is a surface or a text color except the `-foreground`
   suffix. A clearer scheme would name intent, e.g.
   `--surface` / `--surface-raised` / `--surface-sunken` / `--surface-hover` and
   `--text` / `--text-muted` / `--text-faint` / `--text-disabled`.
   Cost: ~large mechanical rename across all components.
2. **`--background` vs `--tertiary`** are the same value with overlapping
   meaning ("the canvas"); one should probably alias the other.
3. **`--border-secondary`, `--border-tertiary`, `--border-destructive`** all
   equal `--border`. Either give them real values or delete the aliases.
4. **`--sidebar` vs `--sidebar-primary`** (and their foregrounds) duplicate
   each other — shadcn inheritance; could be collapsed.
5. **`--beige-050`** breaks the 3-digit pattern of Tailwind-style scales
   (`50` elsewhere); harmless but inconsistent.
