import { useState, type ReactNode } from 'react'
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  CircleNotchIcon,
  ClockIcon,
  FileTextIcon,
  FolderSimpleIcon,
  GearSixIcon,
  GlobeSimpleIcon,
  ImageIcon,
  MegaphoneIcon,
  NotePencilIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  SealCheckIcon,
  SparkleIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'

import LogoFull from '@/assets/logo-full.svg?react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import { formatDate } from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'

import { BRAND_SECTIONS, BrandSectionBody, type BrandSection } from './-brand'
import { BriefForm } from './-campaign'
import {
  CLIENT,
  GOALS,
  IDEAS,
  LANGUAGES,
  PERSONA,
  SOURCE_FILES,
  WEB_PAGES,
  WEEK_DAYS,
  addDays,
  firstMonday,
  type Account,
  type Bilingual,
  type Brand,
  type Brief,
  type Draft,
  type PlatformId,
} from './-fixtures'
import { SaveMark, platformName, useSavePulse } from './-frame'
import type { Setup } from './-setup'

export type PostStatus = 'draft' | 'client' | 'scheduled'

export type PlanPost = Draft & {
  status: PostStatus
  image: string | null
}

/** The first week of the chosen idea, on the channels the brief picked. */
export function buildPosts(brief: Brief): PlanPost[] {
  const idea = IDEAS.find((i) => i.id === brief.idea)!
  return idea.drafts.map((d, i) => ({
    ...d,
    platform: brief.platforms.includes(d.platform)
      ? d.platform
      : brief.platforms[i % brief.platforms.length],
    status: 'draft',
    image: null,
  }))
}

type Place = 'campaigns' | 'calendar' | 'brand' | 'library' | 'results'

/**
 * Where onboarding lands: inside the campaign it just planned, with what is
 * left of the setup as a checklist on top. The client is the outer frame —
 * a freelancer's switcher sits above the menu, because everything below it
 * (brand, accounts, campaigns) belongs to one client.
 *
 * Five places. Campaigns stay first-class: for a marketer they are how the
 * work is organised, not a concept to hide.
 */
export function Workspace({
  setup,
  brand,
  onBrand,
  brief,
  onBrief,
  accounts,
  connected,
  onConnected,
  domain,
}: {
  setup: Setup
  brand: Brand
  onBrand: (b: Brand) => void
  brief: Brief
  onBrief: (b: Brief) => void
  accounts: Account[]
  connected: PlatformId[]
  onConnected: (c: PlatformId[]) => void
  domain: string
}) {
  const [place, setPlace] = useState<Place>('campaigns')
  const [campaignOpen, setCampaignOpen] = useState(true)
  const [posts, setPosts] = useState(() => buildPosts(brief))
  const [openId, setOpenId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<{
    platform: PlatformId
    postId?: string
  } | null>(null)
  const [media, setMedia] = useState<string[]>([])
  const [invited, setInvited] = useState(false)
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('references')

  const isClient = setup.role === 'freelancer'
  const business = setup.business || CLIENT.name
  const open = posts.find((p) => p.id === openId) ?? null
  const update = (id: string, patch: Partial<PlanPost>) =>
    setPosts((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const schedule = (post: PlanPost) => {
    if (!connected.includes(post.platform)) {
      setConnecting({ platform: post.platform, postId: post.id })
      return
    }
    update(post.id, { status: 'scheduled' })
  }

  const go = (p: Place) => {
    setPlace(p)
    setOpenId(null)
    if (p === 'campaigns') setCampaignOpen(false)
  }

  const checklist: CheckItem[] = [
    { label: 'Review the brand', done: true },
    {
      label:
        connected.length === accounts.length
          ? 'Connect accounts'
          : `Connect accounts — ${connected.length} of ${accounts.length}`,
      done: connected.length === accounts.length,
      action: {
        label: 'Connect',
        run: () => {
          const next = accounts.find((a) => !connected.includes(a.platform))
          if (next) setConnecting({ platform: next.platform })
        },
      },
    },
    { label: 'Plan a first campaign', done: true },
    {
      label: 'Review the first week’s drafts',
      done: posts.every((p) => p.status !== 'draft'),
      action: {
        label: 'Open',
        run: () =>
          setOpenId(posts.find((p) => p.status === 'draft')?.id ?? null),
      },
    },
    ...(isClient
      ? [
          {
            label: invited
              ? `${business} is invited to approve posts`
              : `Invite ${business} to approve posts`,
            done: invited,
            action: { label: 'Copy invite link', run: () => setInvited(true) },
          },
        ]
      : []),
    {
      label: 'Add photos to Media',
      done: media.length > 0,
      action: {
        label: 'Open Media',
        run: () => {
          setLibraryTab('media')
          go('library')
        },
      },
    },
    ...(isClient && setup.clients !== '1'
      ? [{ label: 'Set up your next client', done: false, later: true }]
      : []),
  ]

  return (
    <div className="flex h-svh bg-background text-foreground">
      <Rail
        place={place}
        onPlace={go}
        business={business}
        isClient={isClient}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {place === 'campaigns' &&
          (campaignOpen ? (
            <CampaignPage
              brief={brief}
              onBrief={onBrief}
              brand={brand}
              posts={posts}
              openId={openId}
              onOpen={setOpenId}
              onBack={() => setCampaignOpen(false)}
              checklist={checklist}
              business={business}
              isClient={isClient}
              channels={
                connected.length > 0
                  ? connected
                  : accounts.map((a) => a.platform)
              }
            />
          ) : (
            <CampaignList
              brief={brief}
              posts={posts}
              onOpen={() => setCampaignOpen(true)}
            />
          ))}
        {place === 'calendar' && (
          <CalendarPage
            brief={brief}
            posts={posts}
            onOpen={(id) => {
              setOpenId(id)
            }}
            openId={openId}
          />
        )}
        {place === 'brand' && (
          <BrandPage business={business} brand={brand} onBrand={onBrand} />
        )}
        {place === 'library' && (
          <LibraryPage
            tab={libraryTab}
            onTab={setLibraryTab}
            setup={setup}
            domain={domain}
            media={media}
          />
        )}
        {place === 'results' && <OutOfScope label="Results" />}
      </main>

      {open && (place === 'campaigns' || place === 'calendar') && (
        <PostPanel
          key={open.id}
          post={open}
          brand={brand}
          brief={brief}
          business={business}
          isClient={isClient}
          connected={connected.includes(open.platform)}
          onClose={() => setOpenId(null)}
          onChange={(patch) => update(open.id, patch)}
          onAddImage={(name) => {
            update(open.id, { image: name })
            // Decision 2026-11-03: a picture added to a post is copied into
            // Media, so it can be found and reused.
            setMedia((m) => (m.includes(name) ? m : [name, ...m]))
          }}
          onSchedule={() => schedule(open)}
        />
      )}

      {connecting && (
        <ConnectDialog
          platform={connecting.platform}
          onCancel={() => setConnecting(null)}
          onConnected={() => {
            onConnected([...connected, connecting.platform])
            if (connecting.postId)
              update(connecting.postId, { status: 'scheduled' })
            setConnecting(null)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Rail                                                                     */
/* ------------------------------------------------------------------------ */

const PLACES: { id: Place; label: string; icon: typeof CalendarBlankIcon }[] = [
  { id: 'campaigns', label: 'Campaigns', icon: MegaphoneIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarBlankIcon },
  { id: 'brand', label: 'Brand', icon: SealCheckIcon },
  { id: 'library', label: 'Library', icon: FolderSimpleIcon },
  { id: 'results', label: 'Results', icon: ChartLineUpIcon },
]

function Rail({
  place,
  onPlace,
  business,
  isClient,
}: {
  place: Place
  onPlace: (p: Place) => void
  business: string
  isClient: boolean
}) {
  const [switcher, setSwitcher] = useState(false)
  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-quaternary bg-primary px-3 py-5">
      <LogoFull className="mb-6 ml-2.5 h-5 w-auto self-start" />

      <div className="relative mb-5">
        <button
          type="button"
          onClick={() => setSwitcher((s) => !s)}
          className="flex h-12 w-full items-center gap-2.5 border border-quaternary px-2.5 text-left transition-colors hover:border-tertiary-foreground"
        >
          <span className="flex size-7 shrink-0 items-center justify-center bg-primary-foreground text-xs font-medium text-primary">
            {business.slice(0, 1)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-medium">{business}</span>
            <span className="text-[11px] text-tertiary-foreground">
              {isClient ? 'Client' : 'Your business'}
            </span>
          </span>
          <CaretDownIcon className="size-3.5 text-tertiary-foreground" />
        </button>
        {switcher && (
          <div
            className="absolute inset-x-0 top-full mt-1 flex flex-col border border-quaternary bg-primary py-1 shadow-lg"
            style={{ zIndex: 20 }}
          >
            <span className="flex items-center gap-2 px-3 py-2 text-[13px]">
              <CheckIcon weight="bold" className="size-3.5 text-accent" />
              {business}
            </span>
            <button
              type="button"
              className="flex items-center gap-2 border-t border-quaternary px-3 py-2 text-left text-[13px] text-secondary-foreground hover:text-primary-foreground"
              onClick={() => setSwitcher(false)}
            >
              <PlusIcon className="size-3.5" />
              {isClient ? 'Add a client' : 'Add a business'}
            </button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-0.5">
        {PLACES.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPlace(id)}
              aria-current={place === id ? 'page' : undefined}
              className={cn(
                'flex h-10 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors',
                place === id
                  ? 'bg-secondary text-primary-foreground'
                  : 'text-secondary-foreground hover:bg-secondary hover:text-primary-foreground',
              )}
            >
              <Icon
                className="size-[18px]"
                weight={place === id ? 'fill' : 'regular'}
              />
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-quaternary pt-3">
        <button
          type="button"
          className="flex h-10 items-center gap-3 rounded-md px-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-primary-foreground"
        >
          <GearSixIcon className="size-[18px]" />
          Settings
        </button>
        <div className="flex items-center gap-3 px-2.5 pt-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary">
            {PERSONA.firstName[0]}
          </span>
          <span className="truncate text-[13px] font-medium">
            {PERSONA.firstName} {PERSONA.lastName}
          </span>
        </div>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------------ */
/* Campaigns                                                                */
/* ------------------------------------------------------------------------ */

function campaignDates(brief: Brief) {
  const start = firstMonday()
  return `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(start, brief.weeks * 7 - 1), { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function CampaignList({
  brief,
  posts,
  onOpen,
}: {
  brief: Brief
  posts: PlanPost[]
  onOpen: () => void
}) {
  const ready = posts.filter((p) => p.status !== 'draft').length
  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      <header className="flex items-end justify-between gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Campaigns
        </h1>
        <Button variant="secondary">
          <PlusIcon />
          New campaign
        </Button>
      </header>
      <button
        type="button"
        onClick={onOpen}
        className="flex max-w-[560px] flex-col gap-2 border border-transparent bg-primary px-5 py-4 text-left transition-colors hover:border-quaternary"
      >
        <span className="flex items-center justify-between">
          <span className="text-base font-medium">{brief.name}</span>
          <CaretRightIcon className="size-4 text-tertiary-foreground" />
        </span>
        <span className="text-[13px] text-secondary-foreground">
          {campaignDates(brief)} ·{' '}
          {GOALS.find((g) => g.id === brief.goal)?.label}
        </span>
        <span className="text-xs text-tertiary-foreground">
          This week: {ready} of {posts.length} drafts reviewed
        </span>
      </button>
    </div>
  )
}

type CheckItem = {
  label: string
  done: boolean
  later?: boolean
  action?: { label: string; run: () => void }
}

type CampaignTab = 'plan' | 'brief'

function CampaignPage({
  brief,
  onBrief,
  brand,
  posts,
  openId,
  onOpen,
  onBack,
  checklist,
  business,
  isClient,
  channels,
}: {
  brief: Brief
  onBrief: (b: Brief) => void
  brand: Brand
  posts: PlanPost[]
  openId: string | null
  onOpen: (id: string) => void
  onBack: () => void
  checklist: CheckItem[]
  business: string
  isClient: boolean
  channels: PlatformId[]
}) {
  const [tab, setTab] = useState<CampaignTab>('plan')
  const [hideChecklist, setHideChecklist] = useState(false)
  const saving = useSavePulse(brief)
  const audiences = brand.audiences
    .filter((a) => brief.audienceIds.includes(a.id))
    .map((a) => a.name)

  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      <header className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-xs text-tertiary-foreground hover:text-primary-foreground"
        >
          Campaigns /
        </button>
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {brief.name}
          </h1>
          {tab === 'brief' && <SaveMark saving={saving} />}
        </div>
        <p className="text-[13px] text-secondary-foreground">
          {campaignDates(brief)} ·{' '}
          {GOALS.find((g) => g.id === brief.goal)?.label} · for{' '}
          {audiences.join(' and ')}
        </p>
      </header>

      {!hideChecklist && (
        <Checklist
          business={business}
          items={checklist}
          onHide={() => setHideChecklist(true)}
        />
      )}

      <div role="tablist" className="flex gap-6 border-b border-quaternary">
        {(
          [
            ['plan', 'Plan'],
            ['brief', 'Brief'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
              tab === id
                ? 'border-primary-foreground text-primary-foreground'
                : 'border-transparent text-tertiary-foreground hover:text-primary-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'plan' ? (
        <PlanTab
          brief={brief}
          brand={brand}
          posts={posts}
          openId={openId}
          onOpen={onOpen}
          business={business}
          isClient={isClient}
        />
      ) : (
        <div className="flex max-w-[720px] flex-col gap-7 bg-primary p-6">
          <BriefForm
            brief={brief}
            brand={brand}
            channels={channels}
            onChange={onBrief}
          />
        </div>
      )}
    </div>
  )
}

/**
 * What is left of the setup, on the screen you work in rather than behind a
 * wall at the start. Hideable; it is a list of jobs, not teaching.
 */
function Checklist({
  business,
  items,
  onHide,
}: {
  business: string
  items: CheckItem[]
  onHide: () => void
}) {
  const done = items.filter((i) => i.done).length
  return (
    <section className="bg-primary px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-sm font-medium">
          Finish setting up {business}
          <span className="ml-2 font-normal text-tertiary-foreground">
            {done} of {items.length}
          </span>
        </p>
        <button
          type="button"
          onClick={onHide}
          className="text-xs text-tertiary-foreground hover:text-primary-foreground"
        >
          Hide
        </button>
      </div>
      <div className="mb-3 h-1 bg-secondary">
        <div
          className="h-1 bg-accent transition-all duration-500"
          style={{ width: `${(done / items.length) * 100}%` }}
        />
      </div>
      <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex h-8 items-center gap-2.5 text-[13px]"
          >
            {item.done ? (
              <CheckCircleIcon
                weight="fill"
                className="size-4 shrink-0 text-accent"
              />
            ) : (
              <CircleIcon className="size-4 shrink-0 text-quaternary-foreground" />
            )}
            <span
              className={cn(
                'truncate',
                item.done && 'text-tertiary-foreground line-through',
              )}
            >
              {item.label}
            </span>
            {!item.done && item.action && (
              <button
                type="button"
                onClick={item.action.run}
                className="ml-auto shrink-0 text-xs font-medium text-accent hover:underline"
              >
                {item.action.label}
              </button>
            )}
            {!item.done && item.later && (
              <span className="ml-auto shrink-0 text-xs text-tertiary-foreground">
                When this one is running
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function PlanTab({
  brief,
  brand,
  posts,
  openId,
  onOpen,
  business,
  isClient,
}: {
  brief: Brief
  brand: Brand
  posts: PlanPost[]
  openId: string | null
  onOpen: (id: string) => void
  business: string
  isClient: boolean
}) {
  const monday = firstMonday()
  const idea = IDEAS.find((i) => i.id === brief.idea)!
  const perWeek = Math.min(brief.perWeek, 5)
  const reviewed = posts.filter((p) => p.status !== 'draft').length
  const withClient = posts.filter((p) => p.status === 'client').length

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">
            Week 1
            <span className="ml-2 font-normal text-tertiary-foreground">
              {formatDate(monday, { day: 'numeric', month: 'short' })} –{' '}
              {formatDate(addDays(monday, 6), {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </p>
          <span className="text-xs text-secondary-foreground">
            {reviewed} of {posts.length} reviewed
            {withClient > 0 && ` · ${withClient} with ${business}`}
          </span>
        </div>
        {reviewed === 0 && (
          <p className="text-[13px] text-secondary-foreground">
            Drafts — nothing goes out until you schedule it.
            {isClient &&
              ` You can send any of them to ${business} for approval first.`}
          </p>
        )}
        <div className="grid grid-cols-7 gap-px bg-quaternary">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div
              key={day}
              className="flex min-h-[220px] flex-col gap-2 bg-background p-2"
            >
              <DayLabel date={addDays(monday, day)} />
              {posts
                .filter((p) => p.day === day)
                .map((post) => (
                  <PostTile
                    key={post.id}
                    post={post}
                    brand={brand}
                    business={business}
                    active={post.id === openId}
                    onOpen={() => onOpen(post.id)}
                  />
                ))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium">Coming up</p>
        <p className="text-[13px] text-secondary-foreground">
          Ogen writes each week the Monday before, using what the last one
          taught. You can change an angle before it’s written.
        </p>
        <ul className="mt-2 flex flex-col bg-primary">
          {Array.from({ length: brief.weeks - 1 }, (_, i) => {
            const w = i + 1
            const start = addDays(monday, w * 7)
            return (
              <li
                key={w}
                className="flex items-center gap-4 border-b border-quaternary px-4 py-2.5 text-[13px] last:border-b-0"
              >
                <span className="w-16 shrink-0 font-medium">Week {w + 1}</span>
                <span className="w-28 shrink-0 text-tertiary-foreground">
                  {formatDate(start, { day: 'numeric', month: 'short' })}
                </span>
                <span className="min-w-0 flex-1 truncate text-secondary-foreground">
                  {WEEK_DAYS[perWeek]
                    .map(
                      (_, k) =>
                        idea.slots[(i * perWeek + k) % idea.slots.length].angle,
                    )
                    .join(' · ')}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-tertiary-foreground">
                  <ClockIcon className="size-3.5" />
                  Drafts arrive{' '}
                  {formatDate(addDays(start, -7), {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function DayLabel({ date }: { date: Date }) {
  return (
    <p className="px-1 text-xs text-tertiary-foreground">
      {formatDate(date, { weekday: 'short' })}{' '}
      <span className="font-medium text-secondary-foreground">
        {formatDate(date, { day: 'numeric' })}
      </span>
    </p>
  )
}

function StatusTag({
  status,
  business,
}: {
  status: PostStatus
  business: string
}) {
  if (status === 'scheduled')
    return (
      <CheckCircleIcon
        weight="fill"
        className="size-3.5 text-accent"
        aria-label="Scheduled"
      />
    )
  return (
    <span
      className={cn(
        'rounded-sm px-1 py-px text-[10px] uppercase tracking-wide',
        status === 'client' ? 'bg-accent/15 text-accent' : 'bg-secondary',
      )}
      title={status === 'client' ? `With ${business}` : undefined}
    >
      {status === 'client' ? 'Client' : 'Draft'}
    </span>
  )
}

function PostTile({
  post,
  brand,
  business,
  active,
  onOpen,
}: {
  post: PlanPost
  brand: Brand
  business: string
  active: boolean
  onOpen: () => void
}) {
  const info = getPlatformByZernioId(post.platform)
  const Icon = info?.icon
  const audience = brand.audiences.find((a) => a.id === post.audienceId)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex flex-col gap-1.5 border bg-primary p-2.5 text-left transition-colors',
        active
          ? 'border-primary-foreground'
          : 'border-transparent hover:border-quaternary',
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] text-tertiary-foreground">
        {Icon && (
          <Icon
            weight="fill"
            className="size-3.5"
            style={{ color: info?.color }}
          />
        )}
        {post.time}
        <span className="ml-auto">
          <StatusTag status={post.status} business={business} />
        </span>
      </span>
      <span className="text-[13px] font-medium leading-4">{post.angle}</span>
      {audience && (
        <span className="truncate text-[11px] text-tertiary-foreground">
          For {audience.name}
        </span>
      )}
      {post.image ? (
        <span className="mt-0.5 flex h-10 items-center justify-center bg-quaternary text-tertiary-foreground">
          <ImageIcon className="size-4" />
        </span>
      ) : (
        post.wantsImage && (
          <span className="flex items-center gap-1 text-[11px] text-warning">
            <ImageIcon className="size-3" /> Needs a picture
          </span>
        )
      )}
    </button>
  )
}

/* ------------------------------------------------------------------------ */
/* Calendar                                                                 */
/* ------------------------------------------------------------------------ */

/** Every campaign's posts, two weeks at a time. Only one campaign exists. */
function CalendarPage({
  brief,
  posts,
  openId,
  onOpen,
}: {
  brief: Brief
  posts: PlanPost[]
  openId: string | null
  onOpen: (id: string) => void
}) {
  const monday = firstMonday()
  const idea = IDEAS.find((i) => i.id === brief.idea)!
  const perWeek = Math.min(brief.perWeek, 5)
  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      <header>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-secondary-foreground">
          All campaigns · next two weeks
        </p>
      </header>
      {[0, 1].map((w) => (
        <div key={w} className="grid grid-cols-7 gap-px bg-quaternary">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const slotIndex = WEEK_DAYS[perWeek].indexOf(day)
            return (
              <div
                key={day}
                className="flex min-h-[150px] flex-col gap-2 bg-background p-2"
              >
                <DayLabel date={addDays(monday, w * 7 + day)} />
                {w === 0 &&
                  posts
                    .filter((p) => p.day === day)
                    .map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => onOpen(post.id)}
                        className={cn(
                          'flex flex-col gap-1 border bg-primary p-2 text-left',
                          post.id === openId
                            ? 'border-primary-foreground'
                            : 'border-transparent hover:border-quaternary',
                        )}
                      >
                        <span className="text-[11px] text-tertiary-foreground">
                          {post.time} · {brief.name}
                        </span>
                        <span className="text-[13px] font-medium leading-4">
                          {post.angle}
                        </span>
                      </button>
                    ))}
                {w === 1 && slotIndex !== -1 && (
                  <span className="flex flex-col gap-1 border border-dashed border-quaternary p-2">
                    <span className="text-[11px] text-tertiary-foreground">
                      Planned · {brief.name}
                    </span>
                    <span className="text-[13px] leading-4 text-secondary-foreground">
                      {idea.slots[slotIndex % idea.slots.length].angle}
                    </span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* The post                                                                 */
/* ------------------------------------------------------------------------ */

const REWRITES: {
  label: string
  apply: (body: string, lang: keyof Bilingual) => string
}[] = [
  {
    label: 'Shorter',
    apply: (b) => b.split('\n\n')[0],
  },
  {
    label: 'End with the call to action',
    apply: (b, lang) =>
      `${b}\n\n${lang === 'de' ? 'Mehr über den Link in der Bio.' : 'More through the link in our bio.'}`,
  },
]

const CHECK_LABELS: Record<string, string> = {
  prices: 'No prices',
  faces: 'No guest faces',
  names: 'No guest names',
  michelin: 'Restaurant credited correctly',
  direct: 'Links to your own booking page',
  luxury: 'No “luxury”',
}

function PostPanel({
  post,
  brand,
  brief,
  business,
  isClient,
  connected,
  onClose,
  onChange,
  onAddImage,
  onSchedule,
}: {
  post: PlanPost
  brand: Brand
  brief: Brief
  business: string
  isClient: boolean
  connected: boolean
  onClose: () => void
  onChange: (patch: Partial<PlanPost>) => void
  onAddImage: (name: string) => void
  onSchedule: () => void
}) {
  const info = getPlatformByZernioId(post.platform)
  const Icon = info?.icon
  const name = platformName(info?.name)
  const saving = useSavePulse(post.body)
  const langs = LANGUAGES.filter((l) => brief.languages.includes(l.code))
  const [lang, setLang] = useState(langs[0]?.code ?? 'en')
  const [rewriting, setRewriting] = useState<string | null>(null)
  const date = addDays(firstMonday(), post.day)
  const when = `${formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' })} at ${post.time}`
  const audience = brand.audiences.find((a) => a.id === post.audienceId)
  const facts = brand.facts.filter((f) => post.uses.includes(f.id))
  const locked = post.status === 'scheduled'
  const written = lang === 'en' || lang === 'de'
  const body = written ? post.body[lang] : ''

  return (
    <aside className="flex w-[460px] shrink-0 flex-col border-l border-quaternary bg-primary">
      <header className="flex items-center gap-2 border-b border-quaternary px-5 py-4">
        {Icon && (
          <Icon
            weight="fill"
            className="size-5"
            style={{ color: info?.color }}
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{post.angle}</span>
          <span className="text-xs text-tertiary-foreground">
            {name} · {when}
          </span>
        </div>
        <span className="ml-auto">
          <SaveMark saving={saving} />
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ml-2 text-tertiary-foreground hover:text-primary-foreground"
        >
          <XIcon className="size-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {langs.length > 1 && (
          <div className="flex gap-1" role="tablist" aria-label="Language">
            {langs.map((l) => (
              <button
                key={l.code}
                role="tab"
                type="button"
                aria-selected={lang === l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  'h-7 px-2.5 text-xs font-medium transition-colors',
                  lang === l.code
                    ? 'bg-primary-foreground text-primary'
                    : 'text-secondary-foreground hover:bg-secondary',
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {written ? (
          <Textarea
            disabled={locked}
            value={body}
            onChange={(e) =>
              onChange({
                body: { ...post.body, [lang]: e.target.value } as Bilingual,
              })
            }
            className="min-h-48 text-sm leading-6"
          />
        ) : (
          <p className="bg-secondary px-4 py-3 text-sm leading-5 text-secondary-foreground">
            Ogen writes this version from the English once you’re happy with it
            — not part of this prototype.
          </p>
        )}

        {post.status === 'draft' && written && (
          <div className="flex flex-wrap items-center gap-2">
            <SparkleIcon weight="fill" className="size-3.5 text-accent" />
            {REWRITES.map((r) => (
              <button
                key={r.label}
                type="button"
                disabled={!body || rewriting !== null}
                onClick={() => {
                  setRewriting(r.label)
                  window.setTimeout(() => {
                    onChange({
                      body: {
                        ...post.body,
                        [lang]: r.apply(body, lang as keyof Bilingual),
                      } as Bilingual,
                    })
                    setRewriting(null)
                  }, 900)
                }}
                className="flex h-7 items-center gap-1.5 rounded-full border border-quaternary px-3 text-xs text-secondary-foreground transition-colors hover:border-primary-foreground hover:text-primary-foreground disabled:opacity-40"
              >
                {rewriting === r.label && (
                  <CircleNotchIcon className="size-3 animate-spin" />
                )}
                {r.label}
              </button>
            ))}
          </div>
        )}

        <dl className="flex flex-col gap-3 border-t border-quaternary pt-4 text-[13px]">
          {audience && (
            <Meta label="For">
              {audience.name}
              <span className="text-tertiary-foreground">
                {' '}
                · message:{' '}
                {brief.messages[
                  post.uses.length % Math.max(brief.messages.length, 1)
                ] ?? '—'}
              </span>
            </Meta>
          )}
          {facts.length > 0 && (
            <Meta label="Ogen used">
              <span className="flex flex-col gap-0.5">
                {facts.map((f) => (
                  <span key={f.id}>{f.text}</span>
                ))}
              </span>
            </Meta>
          )}
          <Meta label="Checked">
            <span className="flex flex-col gap-0.5">
              {brand.rules.map((r) => (
                <span key={r.id} className="flex items-center gap-1.5">
                  <CheckIcon weight="bold" className="size-3 text-accent" />
                  {CHECK_LABELS[r.id] ?? r.text}
                </span>
              ))}
            </span>
          </Meta>
        </dl>

        <div>
          <p className="mb-2 text-xs font-medium text-secondary-foreground">
            Picture
          </p>
          {post.image ? (
            <div className="flex items-center gap-3 bg-secondary p-2">
              <span className="flex size-14 items-center justify-center bg-quaternary text-tertiary-foreground">
                <ImageIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {post.image}
              </span>
              {!locked && (
                <button
                  type="button"
                  className="text-xs text-tertiary-foreground hover:text-primary-foreground"
                  onClick={() => onChange({ image: null })}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                onAddImage(
                  post.id === 'w1'
                    ? 'spa-evening-pool.jpg'
                    : `${post.angle.toLowerCase().replace(/[^a-z]+/g, '-')}.jpg`,
                )
              }
              className="flex h-20 w-full flex-col items-center justify-center gap-1 border border-dashed border-quaternary text-[13px] text-secondary-foreground transition-colors hover:border-primary-foreground hover:text-primary-foreground disabled:opacity-40"
            >
              <UploadSimpleIcon className="size-4" />
              {post.wantsImage
                ? 'This post needs a picture — add one'
                : 'Add a picture (optional)'}
            </button>
          )}
        </div>
      </div>

      <footer className="border-t border-quaternary px-5 py-4">
        {post.status === 'scheduled' ? (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm">
              <CheckCircleIcon weight="fill" className="size-4 text-accent" />
              Goes out {when}
            </p>
            <Button
              variant="ghost"
              onClick={() => onChange({ status: 'draft' })}
            >
              Unschedule
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {post.status === 'client' && (
              <p className="flex items-center gap-2 pb-1 text-[13px] text-secondary-foreground">
                <PaperPlaneTiltIcon className="size-4 text-accent" />
                With {business} for approval — you’ll hear when they answer.
              </p>
            )}
            <div className="flex gap-2">
              {isClient && post.status === 'draft' && (
                <Button
                  variant="neutral"
                  size="xl"
                  className="flex-1 justify-center"
                  onClick={() => onChange({ status: 'client' })}
                >
                  Send to {business}
                </Button>
              )}
              <Button
                variant="accent"
                size="xl"
                className="flex-1 justify-center"
                onClick={onSchedule}
              >
                {post.status === 'client' ? 'Schedule anyway' : 'Schedule'}
              </Button>
            </div>
            {!connected && (
              <p className="text-center text-xs text-tertiary-foreground">
                {name} isn’t connected yet — you’ll connect it first.
              </p>
            )}
          </div>
        )}
      </footer>
    </aside>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-2">
      <dt className="text-tertiary-foreground">{label}</dt>
      <dd className="leading-5">{children}</dd>
    </div>
  )
}

function ConnectDialog({
  platform,
  onCancel,
  onConnected,
}: {
  platform: PlatformId
  onCancel: () => void
  onConnected: () => void
}) {
  const info = getPlatformByZernioId(platform)
  const Icon = info?.icon
  const name = platformName(info?.name)
  const [busy, setBusy] = useState(false)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-primary-foreground/40 p-4"
      style={{ zIndex: 50 }}
    >
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-[420px] animate-in fade-in zoom-in-95 bg-primary p-8 duration-200"
      >
        {Icon && (
          <Icon
            weight="fill"
            className="size-10"
            style={{ color: info?.color }}
          />
        )}
        <h2 className="mt-4 font-display text-xl font-medium tracking-tight">
          Connect {name}
        </h2>
        <p className="mt-2 text-sm leading-5 text-secondary-foreground">
          So Ogen can publish what you schedule and read how it performs. It
          never posts anything you haven’t scheduled.
        </p>
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Not now
          </Button>
          <Button
            variant="accent"
            loading={busy}
            onClick={() => {
              setBusy(true)
              window.setTimeout(onConnected, 1200)
            }}
          >
            Connect {name}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Brand                                                                    */
/* ------------------------------------------------------------------------ */

/** The review's screens, kept: the brand is edited where it was set up. */
function BrandPage({
  business,
  brand,
  onBrand,
}: {
  business: string
  brand: Brand
  onBrand: (b: Brand) => void
}) {
  const [section, setSection] = useState<BrandSection>('positioning')
  const saving = useSavePulse(brand)
  const current = BRAND_SECTIONS.find((s) => s.id === section)!
  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Brand
          </h1>
          <p className="mt-1 text-sm text-secondary-foreground">
            What Ogen writes {business}’s posts from. Changes apply to the next
            draft.
          </p>
        </div>
        <SaveMark saving={saving} />
      </header>
      <div className="grid max-w-[1000px] gap-8 md:grid-cols-[180px_1fr]">
        <nav className="flex flex-col gap-0.5">
          {BRAND_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                'flex h-9 items-center px-2.5 text-left text-sm transition-colors',
                s.id === section
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-secondary-foreground hover:text-primary-foreground',
              )}
            >
              {s.label}
              {s.count && (
                <span className="ml-auto text-xs text-tertiary-foreground">
                  {s.count(brand)}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="bg-primary p-6">
          <p className="mb-6 text-sm text-secondary-foreground">
            {current.sub}
          </p>
          <BrandSectionBody
            section={section}
            brand={brand}
            onChange={onBrand}
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Library                                                                  */
/* ------------------------------------------------------------------------ */

type LibraryTab = 'references' | 'media'

/**
 * The 2026-11-03 split drawn: References are read and never posted, Media is
 * posted and never read, and nothing is both. The brand itself is not in
 * here — it has its own place now, because for a marketer it is the thing
 * they edit most.
 */
function LibraryPage({
  tab,
  onTab,
  setup,
  domain,
  media,
}: {
  tab: LibraryTab
  onTab: (t: LibraryTab) => void
  setup: Setup
  domain: string
  media: string[]
}) {
  const TABS: { id: LibraryTab; label: string; sub: string }[] = [
    {
      id: 'references',
      label: 'References',
      sub: 'What Ogen reads to get the details right. Never posted.',
    },
    {
      id: 'media',
      label: 'Media',
      sub: 'Photos and videos for posts. Anything added to a post is kept here too.',
    },
  ]
  const current = TABS.find((t) => t.id === tab)!
  return (
    <div className="flex max-w-[860px] flex-col gap-6 px-8 py-7">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Library
          </h1>
          <p className="mt-1 text-sm text-secondary-foreground">
            {current.sub}
          </p>
        </div>
        <Button variant="secondary">
          <PlusIcon />
          {tab === 'references' ? 'Add a reference' : 'Upload'}
        </Button>
      </header>

      <div role="tablist" className="flex gap-6 border-b border-quaternary">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={cn(
              '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-primary-foreground text-primary-foreground'
                : 'border-transparent text-tertiary-foreground hover:text-primary-foreground',
            )}
          >
            {t.label}
            {t.id === 'media' && media.length > 0 && (
              <span className="ml-1.5 text-xs text-tertiary-foreground">
                {media.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'references' && (
        <ul className="flex flex-col bg-primary">
          {setup.files.map((id) => {
            const f = SOURCE_FILES.find((s) => s.id === id)!
            return (
              <RefRow
                key={id}
                icon={FileTextIcon}
                title={f.name}
                sub={`${f.kind} · ${f.pages} pages`}
              />
            )
          })}
          {setup.notes.trim() && (
            <RefRow
              icon={NotePencilIcon}
              title="Your notes"
              sub={setup.notes.trim()}
            />
          )}
          {WEB_PAGES.map((p) => (
            <RefRow
              key={p.path}
              icon={GlobeSimpleIcon}
              title={p.label}
              sub={`${domain}${p.path === '/' ? '' : p.path}`}
            />
          ))}
        </ul>
      )}

      {tab === 'media' &&
        (media.length === 0 ? (
          <div className="flex flex-col items-center gap-2 bg-primary px-6 py-14 text-center">
            <ImageIcon className="size-8 text-quaternary-foreground" />
            <p className="text-sm font-medium">No photos yet</p>
            <p className="max-w-sm text-sm leading-5 text-secondary-foreground">
              Upload the client’s photos and videos here, or add one to a post —
              it’s kept here so you can use it again.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {media.map((name) => (
              <figure key={name} className="flex flex-col gap-1.5">
                <span className="flex aspect-square items-center justify-center bg-quaternary text-tertiary-foreground">
                  <ImageIcon className="size-6" />
                </span>
                <figcaption className="truncate text-xs text-secondary-foreground">
                  {name}
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
    </div>
  )
}

function RefRow({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof FileTextIcon
  title: string
  sub: string
}) {
  return (
    <li className="flex items-center gap-3 border-b border-quaternary px-5 py-3 last:border-b-0">
      <Icon className="size-4 shrink-0 text-tertiary-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{title}</span>
        <span className="truncate text-xs text-tertiary-foreground">{sub}</span>
      </span>
    </li>
  )
}

function OutOfScope({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-base font-medium">{label}</p>
      <p className="max-w-sm text-sm leading-5 text-secondary-foreground">
        Not part of this test. What did you expect to find here?
      </p>
    </div>
  )
}
