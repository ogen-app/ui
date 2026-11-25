import { useState, type ReactNode } from 'react'
import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  FacebookLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MegaphoneIcon,
  PlusIcon,
  QuestionIcon,
  TrashIcon,
  XIcon,
  XLogoIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChipButton } from '@/components/ui/chip'
import { GradientButton } from '@/components/ui/gradient-button'
import { NewCard } from '@/components/ui/card'
import { Segmented } from '@/components/ui/segmented'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextButton } from '@/components/ui/text-button'
import { TextSelect } from '@/components/ui/text-select'
import { ToggleTile } from '@/components/ui/toggle-tile'
import { TextAction } from '@/components/assistant/blocks'
import { cn } from '@/lib'
import { CalendarSlotOptions, OgenActions } from './-ogen'
import { BUTTON_USAGE, OTHER_USAGE, type Usage } from './-usage'

type Variant =
  | 'default'
  | 'defaultInverted'
  | 'secondary'
  | 'neutral'
  | 'outline'
  | 'ghost'
  | 'accent'
  | 'gradient'
  | 'destructive'
  | 'destructiveInverted'
  | 'link'
  | 'tableHeader'
  | 'tableRow'
  | 'headerIcon'
  | 'menu'

type Size =
  | 'xl'
  | 'lg'
  | 'default'
  | 'bar'
  | 'sm'
  | 'xs'
  | 'xlIcon'
  | 'lgIcon'
  | 'defaultIcon'
  | 'smIcon'
  | 'rowIcon'
  | 'xsIcon'
  | 'excluded'

const VARIANTS: { v: Variant; note: string }[] = [
  { v: 'defaultInverted', note: 'Black. The primary action.' },
  { v: 'default', note: 'White, bordered; hovers to black.' },
  { v: 'secondary', note: 'White, bordered; hovers grey.' },
  { v: 'neutral', note: 'Grey fill, for a white surface.' },
  { v: 'outline', note: 'Bordered, no fill.' },
  { v: 'ghost', note: 'No box until hovered.' },
  { v: 'accent', note: 'Teal. One per screen.' },
  { v: 'gradient', note: 'GradientButton: sweep ink.' },
  { v: 'destructive', note: 'The way in: red icon.' },
  { v: 'destructiveInverted', note: 'The step that does it.' },
  { v: 'link', note: 'Words only.' },
  { v: 'tableHeader', note: 'A sortable column head.' },
  { v: 'tableRow', note: 'A table row action.' },
  { v: 'headerIcon', note: 'An icon in a header.' },
  { v: 'menu', note: 'The rail row.' },
]

const SIZES: { s: Size; px: string; icon?: boolean }[] = [
  { s: 'xl', px: '44' },
  { s: 'lg', px: '40' },
  { s: 'default', px: '40' },
  { s: 'bar', px: '36' },
  { s: 'sm', px: '32' },
  { s: 'xs', px: '24' },
  { s: 'xlIcon', px: '44□', icon: true },
  { s: 'lgIcon', px: '40□', icon: true },
  { s: 'defaultIcon', px: '40□', icon: true },
  { s: 'smIcon', px: '32□', icon: true },
  { s: 'rowIcon', px: '24□', icon: true },
  { s: 'xsIcon', px: '16□', icon: true },
  { s: 'excluded', px: 'own' },
]

type State = 'rest' | 'active' | 'disabled' | 'loading'

/** The definition of GradientButton counts as its own use otherwise. */
function usage(key: string): Usage {
  const u = BUTTON_USAGE[key] ?? OTHER_USAGE[key]
  if (!u) return { n: 0, files: [] }
  const files = u.files.filter((f) => !f.startsWith('components/ui/gradient-'))
  const dropped = u.files.length - files.length
  return { ...u, n: u.n - dropped, files }
}

function usageOf(prefix: string): Usage {
  return Object.keys(OTHER_USAGE)
    .filter((k) => k === prefix || k.startsWith(prefix + '/'))
    .map(usage)
    .reduce<Usage>(
      (a, u) => ({ n: a.n + u.n, files: [...a.files, ...u.files] }),
      { n: 0, files: [] },
    )
}

export function ButtonsHarness() {
  const [surface, setSurface] = useState<'canvas' | 'card'>('canvas')
  const [state, setState] = useState<State>('rest')
  const [hideUnused, setHideUnused] = useState(false)
  const [picked, setPicked] = useState<{ key: string; u: Usage } | null>(null)
  const pick = (key: string, u: Usage) =>
    setPicked((p) => (p?.key === key ? null : { key, u }))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        style={{ zIndex: 10 }}
        className="sticky top-0 flex flex-wrap items-center gap-6 border-b border-dashed border-quaternary bg-secondary px-8 py-2 text-xs/4"
      >
        <span className="font-medium">design/buttons</span>
        <Segmented
          size="sm"
          value={surface}
          onChange={setSurface}
          options={[
            { value: 'canvas', label: 'On the canvas' },
            { value: 'card', label: 'On a card' },
          ]}
          aria-label="Surface"
        />
        <Segmented
          size="sm"
          value={state}
          onChange={setState}
          options={[
            { value: 'rest', label: 'Rest' },
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
            { value: 'loading', label: 'Loading' },
          ]}
          aria-label="State"
        />
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={hideUnused}
            onCheckedChange={(v) => setHideUnused(v === true)}
          />
          Hide pairs nobody uses
        </label>
        <span className="text-tertiary-foreground">
          Counts are JSX uses in src/, regenerated by hand. Click a count to see
          where.
        </span>
      </div>

      <div className="flex flex-col gap-12 px-8 py-8">
        <Findings />

        <Section
          title="Ogen actions"
          lede="Every button that asks Ogen to do something, on the surfaces it really sits on. Before, and as decided 2026-11-25."
        >
          <OgenActions />
        </Section>

        <Section
          title="Calendar slot — undecided"
          lede="An idea with a date on the week view. Compile and Draft appear over it under the pointer. Now: outline + black. Rule 9 would make them black words with icons."
        >
          <CalendarSlotOptions />
        </Section>

        <Section
          title="Button"
          lede="ui/button — every variant in every size. A filled count is a pair the app uses; a dashed cell is one it doesn't. ‘+n?’ is a pair chosen at runtime (variant={cond ? … : …})."
        >
          <Surface surface={surface}>
            <ButtonMatrix
              state={state}
              hideUnused={hideUnused}
              picked={picked?.key}
              onPick={pick}
            />
          </Surface>
        </Section>

        <Section
          title="GradientButton"
          lede="ui/gradient-button — the default surface with the sweep on the mark and the label."
          usage={usage('gradient/default')}
          onPick={pick}
          k="GradientButton"
        >
          <Surface surface={surface}>
            <div className="flex items-center gap-4">
              <GradientButton {...stateProps(state)}>
                Fix with Ogen
              </GradientButton>
              <GradientButton size="sm" {...stateProps(state)}>
                Fix with Ogen
              </GradientButton>
            </div>
          </Surface>
        </Section>

        <Section
          title="TextButton"
          lede="ui/text-button — an action written as words in a line. Takes the line's size; three tones."
        >
          <Surface surface={surface}>
            <div className="grid grid-cols-[8rem_1fr_1fr_6rem] items-baseline gap-x-6 gap-y-4">
              <Head>Tone</Head>
              <Head>In a 14px line</Head>
              <Head>In a 12px caption</Head>
              <Head>Uses</Head>
              {(['accent', 'quiet', 'destructive'] as const).map((tone) => {
                const key = `TextButton/${tone}`
                const label =
                  tone === 'accent'
                    ? 'Read the whole'
                    : tone === 'quiet'
                      ? 'Clear all'
                      : 'Remove idea'
                return (
                  <Row key={tone}>
                    <code className="text-xs">{tone}</code>
                    <p className="text-sm">
                      Three posts are waiting.{' '}
                      <TextButton tone={tone} disabled={state === 'disabled'}>
                        {label}
                      </TextButton>
                    </p>
                    <p className="text-xs text-secondary-foreground">
                      Saved 2 min ago ·{' '}
                      <TextButton tone={tone} disabled={state === 'disabled'}>
                        <ArrowClockwiseIcon className="mr-1" />
                        {label}
                      </TextButton>
                    </p>
                    <Count
                      k={key}
                      u={usage(key)}
                      picked={picked?.key}
                      onPick={pick}
                    />
                  </Row>
                )
              })}
            </div>
          </Surface>
        </Section>

        <Section
          title="ChipButton"
          lede="ui/chip — a chip you press: 28px, round; at rest, pressed, crossed."
          usage={usage('ChipButton')}
          onPick={pick}
          k="ChipButton"
        >
          <Surface surface={surface}>
            <div className="flex flex-wrap items-center gap-2">
              <ChipButton disabled={state === 'disabled'}>
                Write a thread
              </ChipButton>
              <ChipButton pressed disabled={state === 'disabled'}>
                Product · 12
              </ChipButton>
              <ChipButton crossed disabled={state === 'disabled'}>
                synergy
              </ChipButton>
              <ChipButton disabled>Disabled</ChipButton>
            </div>
          </Surface>
        </Section>

        <Section
          title="Segmented"
          lede="ui/segmented — one choice of a few, every option on screen. A radio group."
          usage={usage('Segmented')}
          onPick={pick}
          k="Segmented"
        >
          <Surface surface={surface}>
            <SegmentedDemo />
          </Surface>
        </Section>

        <Section
          title="ToggleTile"
          lede="ui/toggle-tile — a thing that is in or out. A switch; out is outlined, grey and struck."
          usage={usageOf('ToggleTile')}
          onPick={pick}
          k="ToggleTile"
        >
          <Surface surface={surface}>
            <ToggleTileDemo />
          </Surface>
        </Section>

        <Section
          title="Tabs"
          lede="ui/tabs — a list that switches panels. Not a button, but it is pressed like one, so it is here to compare."
          usage={usageOf('TabsList')}
          onPick={pick}
          k="TabsList"
        >
          <Surface surface={surface}>
            <TabsDemo />
          </Surface>
        </Section>

        <Section
          title="TextSelect, the button variant"
          lede="ui/text-select variant='button' — a dropdown on a card or a bar is a button with a chevron."
          usage={usage('TextSelect/button')}
          onPick={pick}
          k="TextSelect/button"
        >
          <Surface surface={surface}>
            <SelectDemo disabled={state === 'disabled'} />
          </Surface>
        </Section>

        <Section
          title="TextAction (assistant)"
          lede="assistant/blocks — the assistant's own small-caps action on a headline. Kept apart on purpose."
          usage={usage('TextAction')}
          onPick={pick}
          k="TextAction"
        >
          <Surface surface={surface}>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                Moved 3 posts to Friday
              </span>
              <TextAction disabled={state === 'disabled'}>UNDO</TextAction>
              <TextAction disabled={state === 'disabled'}>OPEN</TextAction>
            </div>
          </Surface>
        </Section>

        <Section
          title="NewCard"
          lede="ui/card — what makes a new card looks like a blank one."
          usage={usage('NewCard')}
          onPick={pick}
          k="NewCard"
        >
          <Surface surface={surface}>
            <div className="grid max-w-xl">
              <NewCard label="New series" hint="A run of posts on one theme" />
            </div>
          </Surface>
        </Section>
      </div>

      {picked && (
        <div className="fixed right-6 bottom-6 max-h-[50vh] w-[28rem] overflow-y-auto rounded-lg border border-border bg-primary p-4 text-xs shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <code className="font-medium">{picked.key}</code>
            <Button
              variant="ghost"
              size="rowIcon"
              onClick={() => setPicked(null)}
              aria-label="Close"
            >
              <XIcon />
            </Button>
          </div>
          {picked.u.files.length === 0 ? (
            <p className="text-tertiary-foreground">Used nowhere.</p>
          ) : (
            <ul className="flex flex-col gap-1 font-mono">
              {picked.u.files.map((f) => (
                <li key={f} className="truncate" title={f}>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function stateProps(state: State) {
  return {
    active: state === 'active',
    disabled: state === 'disabled',
    loading: state === 'loading',
  }
}

function ButtonMatrix({
  state,
  hideUnused,
  picked,
  onPick,
}: {
  state: State
  hideUnused: boolean
  picked?: string
  onPick: (key: string, u: Usage) => void
}) {
  const rows = VARIANTS.filter(
    ({ v }) => !hideUnused || SIZES.some(({ s }) => usedAt(v, s)),
  )
  const cols = SIZES.filter(
    ({ s }) => !hideUnused || VARIANTS.some(({ v }) => usedAt(v, s)),
  )
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-x-3 border-spacing-y-2">
        <thead>
          <tr>
            <th />
            {cols.map(({ s, px }) => (
              <th key={s} className="text-left align-bottom">
                <div className="text-xs font-medium">{s}</div>
                <div className="text-xs font-normal text-tertiary-foreground">
                  {px}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ v, note }) => (
            <tr key={v}>
              <th className="w-44 pr-3 text-left align-top">
                <div className="text-xs font-medium">{v}</div>
                <div className="text-xs font-normal text-tertiary-foreground">
                  {note}
                </div>
              </th>
              {cols.map(({ s, icon }) => {
                const key = `${v}/${s}`
                const u = usage(key)
                const used = u.n + (u.maybe ?? 0) > 0
                return (
                  <td key={s} className="align-top">
                    <div
                      className={cn(
                        'flex min-h-20 min-w-20 flex-col items-start justify-between gap-2 rounded-md p-2',
                        used
                          ? 'border border-transparent'
                          : 'border border-dashed border-quaternary opacity-40',
                      )}
                    >
                      <Sample v={v} s={s} icon={icon} state={state} />
                      <Count k={key} u={u} picked={picked} onPick={onPick} />
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function usedAt(v: Variant, s: Size) {
  const u = usage(`${v}/${s}`)
  return u.n + (u.maybe ?? 0) > 0
}

function Sample({
  v,
  s,
  icon,
  state,
}: {
  v: Variant
  s: Size
  icon?: boolean
  state: State
}) {
  const props = stateProps(state)
  const danger = v === 'destructive' || v === 'destructiveInverted'
  const Glyph = danger ? TrashIcon : PlusIcon
  if (v === 'gradient')
    return (
      <GradientButton size={s} {...props} aria-label={icon ? 'Fix' : undefined}>
        {icon ? null : 'Fix with Ogen'}
      </GradientButton>
    )
  if (v === 'menu')
    return (
      <div className="w-56">
        <Button variant="menu" size={s} {...props}>
          <div>
            <MegaphoneIcon className="size-4" />
            <span>Campaigns</span>
          </div>
        </Button>
      </div>
    )
  if (v === 'headerIcon')
    return (
      <Button variant={v} size={s} {...props} aria-label="Help">
        <QuestionIcon className={s === 'excluded' ? 'size-5' : undefined} />
      </Button>
    )
  return (
    <Button
      variant={v}
      size={s}
      {...props}
      aria-label={icon ? 'Add' : undefined}
    >
      {icon ? (
        <Glyph />
      ) : (
        <>
          {danger && <Glyph />}
          {danger ? 'Delete' : 'Save'}
        </>
      )}
    </Button>
  )
}

function Count({
  k,
  u,
  picked,
  onPick,
}: {
  k: string
  u: Usage
  picked?: string
  onPick: (key: string, u: Usage) => void
}) {
  const maybe = u.maybe ?? 0
  if (u.n === 0 && maybe === 0)
    return <span className="text-xs text-tertiary-foreground">unused</span>
  return (
    <button
      type="button"
      onClick={() => onPick(k, u)}
      className={cn(
        'cursor-pointer rounded-full px-2 text-xs tabular-nums',
        picked === k
          ? 'bg-primary-foreground text-primary'
          : 'bg-tertiary text-foreground hover:bg-quaternary',
      )}
    >
      {u.n}×
      {maybe > 0 && (
        <span className="text-tertiary-foreground"> +{maybe}?</span>
      )}
    </button>
  )
}

function Findings() {
  return (
    <div className="max-w-3xl rounded-lg border border-dashed border-quaternary p-4 text-sm">
      <div className="mb-2 font-medium">What the matrix shows</div>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <code>lg</code> and <code>default</code> are the same class (40px,
          16px in). Seven buttons ask for <code>lg</code>.
        </li>
        <li>
          <code>secondary</code> and <code>tableHeader</code> have one use each;{' '}
          <code>link</code> and <code>tableRow</code> have none.
        </li>
        <li>
          <code>xl</code> (44px) is used only by the plans ledger, the
          auto-publish switch and the workspaces page.
        </li>
        <li>
          Four ghost buttons set <code>size=&quot;excluded&quot;</code> and size
          themselves.
        </li>
        <li>
          <code>destructive</code> with no icon has nothing that says danger —
          every sample here carries the bin.
        </li>
        <li>
          <code>default</code>, <code>secondary</code> and the gradient button
          now carry a border, so on a white card they keep a body.{' '}
          <code>neutral</code> and a ToggleTile that is on are{' '}
          <code>bg-tertiary</code>: on the grey canvas the fill disappears. Both
          are drawn for a white card — switch the surface to compare.
        </li>
      </ul>
    </div>
  )
}

function SegmentedDemo() {
  const [a, setA] = useState<'week' | 'month'>('week')
  const [b, setB] = useState(5)
  const [c, setC] = useState<'is' | 'not'>('is')
  return (
    <div className="flex flex-col gap-4">
      <Labelled label="default, w-fit">
        <Segmented
          value={a}
          onChange={setA}
          options={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          aria-label="Range"
        />
      </Labelled>
      <Labelled label="default, fill (DistillIdeasModal)">
        <div className="w-80">
          <Segmented
            fill
            value={b}
            onChange={setB}
            options={[3, 5, 10].map((n) => ({ value: n, label: String(n) }))}
            aria-label="Count"
          />
        </div>
      </Labelled>
      <Labelled label="sm, fill (FilterParts is / is not)">
        <div className="w-64">
          <Segmented
            size="sm"
            fill
            value={c}
            onChange={setC}
            options={[
              { value: 'is', label: 'is' },
              { value: 'not', label: 'is not' },
            ]}
            aria-label="Match"
          />
        </div>
      </Labelled>
    </div>
  )
}

function ToggleTileDemo() {
  const [days, setDays] = useState([
    true,
    false,
    true,
    false,
    true,
    false,
    false,
  ])
  const [platforms, setPlatforms] = useState([true, true, false, true])
  const [scope, setScope] = useState([true, false])
  const flip = (xs: boolean[], i: number) =>
    xs.map((x, j) => (j === i ? !x : x))
  const logos = [
    LinkedinLogoIcon,
    FacebookLogoIcon,
    InstagramLogoIcon,
    XLogoIcon,
  ]
  return (
    <div className="flex flex-col gap-4">
      <Labelled label="lg (strategy days)">
        <div className="grid max-w-xl grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
            <ToggleTile
              key={d}
              on={days[i]}
              onToggle={() => setDays(flip(days, i))}
              label={d}
            />
          ))}
        </div>
      </Labelled>
      <Labelled label="square (PlatformFilter)">
        <div className="flex gap-2">
          {logos.map((Logo, i) => (
            <ToggleTile
              key={i}
              size="square"
              on={platforms[i]}
              onToggle={() => setPlatforms(flip(platforms, i))}
              aria-label={`Platform ${i + 1}`}
            >
              <Logo className="size-5" />
            </ToggleTile>
          ))}
        </div>
      </Labelled>
      <Labelled label="sm (WorkspaceScopeBar)">
        <div className="flex gap-2">
          {['Spring launch', 'Hiring'].map((l, i) => (
            <ToggleTile
              key={l}
              size="sm"
              on={scope[i]}
              onToggle={() => setScope(flip(scope, i))}
              label={l}
            />
          ))}
        </div>
      </Labelled>
    </div>
  )
}

function TabsDemo() {
  const variants = [
    'segmented',
    'underline',
    'underlineSecondary',
    'switcher',
    'default',
  ] as const
  return (
    <div className="flex flex-col gap-4">
      {variants.map((v) => (
        <Labelled key={v} label={v}>
          <Tabs defaultValue="a">
            <TabsList
              variant={v}
              size={v === 'segmented' ? 'excluded' : 'default'}
            >
              <TabsTrigger variant={v} value="a">
                Overview
              </TabsTrigger>
              <TabsTrigger variant={v} value="b">
                Posts
              </TabsTrigger>
              <TabsTrigger variant={v} value="c">
                Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Labelled>
      ))}
    </div>
  )
}

function SelectDemo({ disabled }: { disabled: boolean }) {
  const [v, setV] = useState('28')
  const elements = [
    { id: '7', displayValue: 'Last 7 days' },
    { id: '28', displayValue: 'Last 28 days' },
    { id: '90', displayValue: 'Last 90 days' },
  ]
  return (
    <div className="flex items-center gap-4">
      <TextSelect
        variant="button"
        size="sm"
        lead="Period"
        value={v}
        onValueChange={setV}
        elements={elements}
        disabled={disabled}
        ariaLabel="Period"
      />
      <Button variant="outline" size="sm">
        Beside an outline sm
        <CaretDownIcon />
      </Button>
    </div>
  )
}

function Section({
  title,
  lede,
  usage: u,
  k,
  onPick,
  children,
}: {
  title: string
  lede: string
  usage?: Usage
  k?: string
  onPick?: (key: string, u: Usage) => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-medium">{title}</h2>
        {u && k && onPick && <Count k={k} u={u} onPick={onPick} />}
      </div>
      <p className="max-w-3xl text-sm text-secondary-foreground">{lede}</p>
      {children}
    </section>
  )
}

function Surface({
  surface,
  children,
}: {
  surface: 'canvas' | 'card'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-lg p-6',
        surface === 'card'
          ? 'border border-border bg-primary'
          : 'border border-dashed border-quaternary bg-background',
      )}
    >
      {children}
    </div>
  )
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-6">
      <code className="w-64 shrink-0 text-xs text-tertiary-foreground">
        {label}
      </code>
      {children}
    </div>
  )
}

function Head({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-medium text-tertiary-foreground">
      {children}
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <>{children}</>
}
