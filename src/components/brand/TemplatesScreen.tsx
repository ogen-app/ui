import { useState } from 'react'
import { CheckIcon, PlugsConnectedIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PLATFORMS } from '@/lib/platformDictionary'
import { cn } from '@/lib'
import { AddButton, Gap } from './shell'
import { EXPECTED_RATIOS } from './TemplatesSection'
import type { BrandTemplate } from './types'

/**
 * Templates — the section that made Brand a place rather than a page.
 *
 * Everything else here could survive as a card. This could not: what a template
 * set needs is *platform × ratio*, for platforms the workspace has not
 * connected yet, and no tile in a stack holds a two-dimensional question. Once
 * this screen exists the other four become screens too, because a screen you
 * reach by scrolling past four cards is not a place — it is a region.
 *
 * ## The rail is platforms, not templates
 *
 * The obvious layout is a list of template sets you open one at a time, and it
 * is wrong: the question people arrive with is "what goes out on Instagram",
 * not "where is the scrim used". Leading with platforms also makes the failure
 * this screen exists to catch visible without opening anything — a platform
 * whose assigned set does not cover the ratio that platform actually posts in.
 * That is a silent bug in every other arrangement.
 *
 * **Not connected is a first-class row.** Preparing artwork is the work you do
 * *before* connecting an account, so a screen that hid unconnected platforms
 * would be empty exactly when it is most useful. Connection is shown as a mark
 * on the row and gates nothing.
 *
 * ## Everywhere is a row, not a checkbox
 *
 * The default set sits at the top of the same rail rather than as a toggle on
 * each platform, because "what happens when nothing else claims it" is a real
 * destination people need to inspect and change. Platforms that fall through to
 * it say so in their own detail panel rather than looking unconfigured.
 */
export function TemplatesScreen({
  templates,
  onAdd,
  onOpen,
}: {
  templates: BrandTemplate[]
  onAdd?: () => void
  onOpen?: (id: string) => void
}) {
  const [selected, setSelected] = useState<string>(EVERYWHERE)

  if (templates.length === 0) {
    return (
      <div className="h-full overflow-y-auto pb-10">
        <div className="mx-auto w-full max-w-content">
          <Gap
            what="Images go out bare. Nothing marks a picture as yours once it has left the app — and nothing here is per-platform yet, so there is no Instagram story frame and no LinkedIn lockup."
            offers={[
              { label: 'Build one from your logo', hint: 'best' },
              { label: 'Upload a PNG' },
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 gap-4 pb-4">
      <PlatformRail templates={templates} selected={selected} onSelect={setSelected} />
      <div className="h-full min-w-0 flex-1 overflow-y-auto">
        <Detail
          selected={selected}
          templates={templates}
          onAdd={onAdd}
          onOpen={onOpen}
        />
      </div>
    </div>
  )
}

/** The pseudo-platform at the top of the rail: what applies when nothing else claims. */
const EVERYWHERE = '__everywhere__'

/**
 * Which ratios each platform actually posts in.
 *
 * A prototype assumption, and marked as one: the real values belong on
 * `GET /api/platforms` beside `video_constraints`, which is where the rest of
 * the per-platform media rules already live. Hard-coding it here is fine while
 * the shape is being argued and is exactly the kind of thing that must not
 * outlive the flag — the coverage warnings below are only as true as this map.
 */
const PLATFORM_RATIOS: Record<string, string[]> = {
  LinkedIn: ['1:1', '4:5', '16:9'],
  YouTube: ['16:9', '9:16'],
  Facebook: ['1:1', '4:5', '16:9'],
  'X (Twitter)': ['1:1', '16:9'],
  Threads: ['1:1', '4:5'],
  Instagram: ['1:1', '4:5', '9:16'],
}

function ratiosFor(platformName: string): string[] {
  return PLATFORM_RATIOS[platformName] ?? EXPECTED_RATIOS
}

/**
 * Whether the workspace has connected this platform.
 *
 * Fixture-only and deliberately crude: the real answer comes from the platforms
 * query. It exists so the *shape* of "connected and not, both configurable" is
 * exercised rather than assumed.
 */
function isConnected(platformName: string): boolean {
  return ['LinkedIn', 'Instagram'].includes(platformName)
}

/** The set that applies to a platform: its own if one claims it, else the default. */
function setFor(
  platformName: string,
  templates: BrandTemplate[],
): { template: BrandTemplate | null; inherited: boolean } {
  const claimed = templates.find((o) => o.platforms.includes(platformName))
  if (claimed) return { template: claimed, inherited: false }
  const fallback = templates.find((o) => o.isDefault) ?? null
  return { template: fallback, inherited: true }
}

function coverage(template: BrandTemplate | null, needed: string[]) {
  const have = new Set(template?.ratios.map((r) => r.ratio) ?? [])
  return {
    covered: needed.filter((r) => have.has(r)),
    missing: needed.filter((r) => !have.has(r)),
  }
}

function PlatformRail({
  templates,
  selected,
  onSelect,
}: {
  templates: BrandTemplate[]
  selected: string
  onSelect: (id: string) => void
}) {
  const connected = PLATFORMS.filter((p) => isConnected(p.name))
  const notConnected = PLATFORMS.filter((p) => !isConnected(p.name))

  return (
    // Fixed width and its own scroller: the rail is how you move around this
    // screen, so it must not scroll away with the detail beside it.
    <nav className="flex h-full w-56 shrink-0 flex-col gap-4 overflow-y-auto">
      <RailRow
        label="Everywhere"
        detail="When nothing else claims it"
        active={selected === EVERYWHERE}
        onSelect={() => onSelect(EVERYWHERE)}
      />

      <RailGroup label="Connected">
        {connected.map((p) => (
          <PlatformRow
            key={p.id}
            name={p.name}
            color={p.color}
            icon={p.icon}
            connected
            templates={templates}
            active={selected === p.name}
            onSelect={() => onSelect(p.name)}
          />
        ))}
      </RailGroup>

      <RailGroup label="Not connected yet">
        {notConnected.map((p) => (
          <PlatformRow
            key={p.id}
            name={p.name}
            color={p.color}
            icon={p.icon}
            connected={false}
            templates={templates}
            active={selected === p.name}
            onSelect={() => onSelect(p.name)}
          />
        ))}
      </RailGroup>
    </nav>
  )
}

function RailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function RailRow({
  label,
  detail,
  active,
  onSelect,
  icon,
  warn,
}: {
  label: string
  detail?: string
  active: boolean
  onSelect: () => void
  icon?: React.ReactNode
  warn?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-active={active}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left',
        'hover:bg-secondary data-[active=true]:bg-secondary',
      )}
    >
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-5">{label}</span>
        {detail && (
          <span className="truncate text-xs text-tertiary-foreground">{detail}</span>
        )}
      </span>
      {/* The one mark on the rail, and it is spent on the failure: a platform
          whose set does not cover a ratio it posts in. Everything else the row
          could say is available one click away. */}
      {warn && <WarningCircleIcon className="ml-auto size-4 shrink-0 text-destructive" />}
    </button>
  )
}

function PlatformRow({
  name,
  color,
  icon: Icon,
  connected,
  templates,
  active,
  onSelect,
}: {
  name: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean
  templates: BrandTemplate[]
  active: boolean
  onSelect: () => void
}) {
  const { template } = setFor(name, templates)
  const { missing } = coverage(template, ratiosFor(name))

  return (
    <RailRow
      label={name}
      detail={connected ? undefined : 'not connected'}
      active={active}
      onSelect={onSelect}
      warn={missing.length > 0}
      icon={
        <span
          className="flex size-5 flex-none items-center justify-center"
          // The platform's own brand hue, as everywhere else in the app.
          style={{ color }}
        >
          <Icon className="size-4" />
        </span>
      }
    />
  )
}

function Detail({
  selected,
  templates,
  onAdd,
  onOpen,
}: {
  selected: string
  templates: BrandTemplate[]
  onAdd?: () => void
  onOpen?: (id: string) => void
}) {
  if (selected === EVERYWHERE) {
    const fallback = templates.find((o) => o.isDefault) ?? null
    return (
      <DetailShell
        title="Everywhere"
        subtitle="What gets applied on any platform that has not been given one of its own."
        action={<AddButton label="ADD TEMPLATE" onClick={onAdd} />}
      >
        {fallback ? (
          <SetPanel
            template={fallback}
            needed={EXPECTED_RATIOS}
            neededLabel="every ratio the app produces"
            onOpen={onOpen}
          />
        ) : (
          <p className="text-sm text-secondary-foreground">
            No default template. Every platform without one of its own sends pictures
            bare.
          </p>
        )}
      </DetailShell>
    )
  }

  const platform = PLATFORMS.find((p) => p.name === selected)
  if (!platform) return null

  const needed = ratiosFor(platform.name)
  const { template, inherited } = setFor(platform.name, templates)
  const connected = isConnected(platform.name)

  return (
    <DetailShell
      title={platform.name}
      subtitle={
        inherited
          ? 'Falling through to the default — nothing here is specific to this platform yet.'
          : 'Has a template of its own.'
      }
      badge={
        connected ? (
          <span className="flex items-center gap-1 text-xs text-tertiary-foreground">
            <PlugsConnectedIcon className="size-3.5" />
            connected
          </span>
        ) : (
          // Stated flatly. Not a warning and not a call to connect: whether an
          // account exists has nothing to do with whether the artwork is right,
          // and nagging here would be nagging in the wrong place.
          <span className="text-xs text-tertiary-foreground">not connected</span>
        )
      }
      action={
        <Button variant="outline" size="sm" onClick={onAdd}>
          {inherited ? 'GIVE IT ITS OWN' : 'REPLACE'}
        </Button>
      }
    >
      {template ? (
        <SetPanel
          template={template}
          needed={needed}
          neededLabel={`the ${needed.length} ${needed.length === 1 ? 'ratio' : 'ratios'} ${platform.name} posts in`}
          onOpen={onOpen}
        />
      ) : (
        <p className="text-sm text-secondary-foreground">
          Nothing applies here, and there is no default to fall back on.
        </p>
      )}
    </DetailShell>
  )
}

function DetailShell({
  title,
  subtitle,
  badge,
  action,
  children,
}: {
  title: string
  subtitle: string
  badge?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-primary p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-medium leading-6">{title}</h2>
            {badge}
          </div>
          <p className="text-xs text-tertiary-foreground">{subtitle}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

/** One set, judged against the ratios the selected destination actually needs. */
function SetPanel({
  template,
  needed,
  neededLabel,
  onOpen,
}: {
  template: BrandTemplate
  needed: string[]
  neededLabel: string
  onOpen?: (id: string) => void
}) {
  const { missing } = coverage(template, needed)
  const have = new Map(template.ratios.map((r) => [r.ratio, r.url]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="font-grotesk text-sm font-medium">{template.name}</p>
        <p className="text-xs text-tertiary-foreground">
          {template.role === 'foreground' ? 'drawn over the picture' : 'sits under the picture'}
          {template.isDefault && ' · the default'}
        </p>
      </div>

      {/* Coverage is the whole point of the panel, so it is stated in words
          before it is drawn. A grid of thumbnails answers "what does it look
          like"; only the sentence answers "will this work here". */}
      {missing.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-secondary-foreground">
          <CheckIcon className="size-4 shrink-0" />
          Covers {neededLabel}.
        </p>
      ) : missing.length === needed.length ? (
        // Every ratio missing is a different finding from some ratios missing,
        // and the partial wording made it sound partial. A set that covers
        // nothing its platform posts in is not half-built — it is the wrong set
        // chosen, and the sentence has to say so or the row looks like progress.
        <p className="flex items-start gap-1.5 text-sm text-secondary-foreground">
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>Covers none of {neededLabel}. Every picture here goes out bare.</span>
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-sm text-secondary-foreground">
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            Missing {missing.join(', ')} — {missing.length === 1 ? 'that ratio goes' : 'those ratios go'} out bare against{' '}
            {neededLabel}.
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {needed.map((ratio) => (
          <RatioTile key={ratio} ratio={ratio} url={have.get(ratio)} />
        ))}
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={onOpen ? () => onOpen(template.id) : undefined}>
          OPEN IN COMPOSITOR
        </Button>
      </div>
    </div>
  )
}

const RATIO_BOX: Record<string, string> = {
  '1:1': 'h-20 w-20',
  '4:5': 'h-20 w-16',
  '9:16': 'h-20 w-[45px]',
  '16:9': 'h-[45px] w-20',
}

function RatioTile({ ratio, url }: { ratio: string; url?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Fixed-height slot so the labels sit on one line: the boxes are
          different shapes by definition, and a 16:9 caption riding higher than
          the 9:16 next to it reads as misalignment rather than as aspect. */}
      <div className="flex h-20 items-center">
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded',
          RATIO_BOX[ratio] ?? 'h-20 w-20',
          url ? 'border border-quaternary' : 'border border-dashed border-quaternary',
        )}
        style={
          url
            ? {
                // Checkerboard, so transparency reads as transparency rather
                // than as white artwork on a white card.
                backgroundImage:
                  'linear-gradient(45deg, var(--color-tertiary) 25%, transparent 25%), linear-gradient(-45deg, var(--color-tertiary) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-tertiary) 75%), linear-gradient(-45deg, transparent 75%, var(--color-tertiary) 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
              }
            : undefined
        }
      >
        {url && <img src={url} alt="" className="max-h-full max-w-full object-contain" />}
      </div>
      </div>
      <span
        className={cn(
          'font-mono text-xs',
          url ? 'text-tertiary-foreground' : 'text-destructive',
        )}
      >
        {ratio}
      </span>
    </div>
  )
}
