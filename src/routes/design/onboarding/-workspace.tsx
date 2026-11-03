import { useState, type ReactNode } from 'react'
import {
  CalendarBlankIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  FileTextIcon,
  FolderSimpleIcon,
  GearSixIcon,
  GlobeSimpleIcon,
  ImageIcon,
  PencilSimpleLineIcon,
  PlusIcon,
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

import {
  DRAFTS,
  PERSONA,
  READ_PAGES,
  RHYTHM_DAYS,
  addDays,
  firstMonday,
  type DraftPost,
  type PlatformId,
  type Rhythm,
} from './-fixtures'
import { SaveMark, useSavePulse, type Profile } from './-steps'

export type PlanPost = DraftPost & {
  platform: PlatformId
  status: 'draft' | 'scheduled'
  image: string | null
}

/** The drafts the chosen rhythm asks for, platforms dealt out round-robin. */
export function buildWeek(rhythm: Rhythm, platforms: PlatformId[]): PlanPost[] {
  if (platforms.length === 0) return []
  return RHYTHM_DAYS[rhythm].map((day, i) => {
    const draft = DRAFTS.find((d) => d.day === day)!
    return {
      ...draft,
      platform: platforms[i % platforms.length],
      status: 'draft',
      image: null,
    }
  })
}

type Place = 'plan' | 'create' | 'library' | 'results'

/**
 * Where onboarding lands. Four places, not fourteen: Plan (the week, the one
 * screen that matters on day one), Create, Library (everything Ogen knows,
 * and the pictures you post) and Results. No campaign anywhere — a
 * solopreneur's posts are one stream, and whether they ever miss a campaign
 * is one of the things this test is for.
 */
export function Workspace({
  initialPosts,
  profile,
  onProfileChange,
  onRestart,
}: {
  initialPosts: PlanPost[]
  profile: Profile
  onProfileChange: (profile: Profile) => void
  onRestart: () => void
}) {
  const [place, setPlace] = useState<Place>('plan')
  const [posts, setPosts] = useState(initialPosts)
  const [openId, setOpenId] = useState<string | null>(null)
  const [connected, setConnected] = useState<PlatformId[]>([])
  const [connecting, setConnecting] = useState<{
    postId: string
    platform: PlatformId
  } | null>(null)
  const [media, setMedia] = useState<string[]>([])

  const open = posts.find((p) => p.id === openId) ?? null
  const update = (id: string, patch: Partial<PlanPost>) =>
    setPosts((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const schedule = (post: PlanPost) => {
    if (!connected.includes(post.platform)) {
      setConnecting({ postId: post.id, platform: post.platform })
      return
    }
    update(post.id, { status: 'scheduled' })
  }

  return (
    <div className="flex h-svh bg-background text-foreground">
      <Rail place={place} onPlace={(p) => (setPlace(p), setOpenId(null))} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {place === 'plan' && (
          <PlanPage
            posts={posts}
            openId={openId}
            onOpen={setOpenId}
            onRestart={onRestart}
            onNew={() => {
              const taken = new Set(posts.map((p) => p.day))
              const day = [0, 1, 2, 3, 4, 5, 6].find((d) => !taken.has(d)) ?? 6
              const post: PlanPost = {
                id: `new-${Date.now()}`,
                day,
                time: '10:00',
                angle: 'New post',
                body: '',
                wantsImage: false,
                platform: posts[0]?.platform ?? 'linkedin',
                status: 'draft',
                image: null,
              }
              setPosts((all) => [...all, post])
              setOpenId(post.id)
            }}
          />
        )}
        {place === 'library' && (
          <LibraryPage
            profile={profile}
            onProfileChange={onProfileChange}
            media={media}
          />
        )}
        {(place === 'create' || place === 'results') && (
          <OutOfScope place={place} />
        )}
      </main>

      {open && place === 'plan' && (
        <PostPanel
          key={open.id}
          post={open}
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
            setConnected((c) => [...c, connecting.platform])
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
  { id: 'plan', label: 'Plan', icon: CalendarBlankIcon },
  { id: 'create', label: 'Create', icon: PencilSimpleLineIcon },
  { id: 'library', label: 'Library', icon: FolderSimpleIcon },
  { id: 'results', label: 'Results', icon: ChartLineUpIcon },
]

function Rail({
  place,
  onPlace,
}: {
  place: Place
  onPlace: (p: Place) => void
}) {
  return (
    <nav className="flex w-56 shrink-0 flex-col border-r border-quaternary bg-primary px-3 py-5">
      <LogoFull className="mb-8 ml-2.5 h-5 w-auto self-start" />
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
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">
              {PERSONA.firstName} Lind
            </span>
            <span className="truncate text-xs text-tertiary-foreground">
              {PERSONA.business}
            </span>
          </span>
        </div>
      </div>
    </nav>
  )
}

/* ------------------------------------------------------------------------ */
/* Plan                                                                     */
/* ------------------------------------------------------------------------ */

function PlanPage({
  posts,
  openId,
  onOpen,
  onNew,
  onRestart,
}: {
  posts: PlanPost[]
  openId: string | null
  onOpen: (id: string) => void
  onNew: () => void
  onRestart: () => void
}) {
  const monday = firstMonday()
  const scheduled = posts.filter((p) => p.status === 'scheduled').length
  const first = [...posts]
    .filter((p) => p.status === 'scheduled')
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))[0]

  return (
    <div className="flex flex-col gap-6 px-8 py-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Plan
          </h1>
          <p className="mt-1 text-sm text-secondary-foreground">
            Week of {formatDate(monday, { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button variant="secondary" onClick={onNew}>
          <PlusIcon />
          New post
        </Button>
      </header>

      {posts.length === 0 ? (
        <section className="flex flex-col items-start gap-3 bg-primary px-6 py-6">
          <p className="text-base font-medium">Your week is empty</p>
          <p className="max-w-md text-sm leading-5 text-secondary-foreground">
            Tell Ogen about your business and it will draft your first week — or
            write a post yourself.
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="accent" onClick={onRestart}>
              <SparkleIcon weight="fill" />
              Draft my first week
            </Button>
            <Button variant="ghost" onClick={onNew}>
              Write one myself
            </Button>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            'flex items-center justify-between gap-4 px-5 py-4',
            scheduled === posts.length ? 'bg-accent/10' : 'bg-primary',
          )}
        >
          <p className="text-sm leading-5">
            {scheduled === 0 &&
              'These are drafts — nothing goes out until you schedule it. Open one to read it.'}
            {scheduled > 0 &&
              scheduled < posts.length &&
              `Nice. Your first post goes out ${dayLabel(monday, first!.day)} at ${first!.time}.`}
            {scheduled === posts.length &&
              'Your week is set. Ogen will draft next week on Friday for you to check.'}
          </p>
          <span className="shrink-0 text-xs font-medium text-secondary-foreground">
            {scheduled} of {posts.length} scheduled
          </span>
        </section>
      )}

      <div className="grid grid-cols-7 gap-px bg-quaternary">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const date = addDays(monday, day)
          return (
            <div
              key={day}
              className="flex min-h-[320px] flex-col gap-2 bg-background p-2"
            >
              <p className="px-1 text-xs text-tertiary-foreground">
                {formatDate(date, { weekday: 'short' })}{' '}
                <span className="font-medium text-secondary-foreground">
                  {formatDate(date, { day: 'numeric' })}
                </span>
              </p>
              {posts
                .filter((p) => p.day === day)
                .map((post) => (
                  <PostTile
                    key={post.id}
                    post={post}
                    active={post.id === openId}
                    onOpen={() => onOpen(post.id)}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function dayLabel(monday: Date, day: number) {
  return formatDate(addDays(monday, day), { weekday: 'long' })
}

function PostTile({
  post,
  active,
  onOpen,
}: {
  post: PlanPost
  active: boolean
  onOpen: () => void
}) {
  const info = getPlatformByZernioId(post.platform)
  const Icon = info?.icon
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
          {post.status === 'scheduled' ? (
            <CheckCircleIcon
              weight="fill"
              className="size-3.5 text-accent"
              aria-label="Scheduled"
            />
          ) : (
            <span className="rounded-sm bg-secondary px-1 py-px text-[10px] uppercase tracking-wide">
              Draft
            </span>
          )}
        </span>
      </span>
      <span className="text-[13px] font-medium leading-4">{post.angle}</span>
      <span className="line-clamp-3 text-xs leading-4 text-secondary-foreground">
        {post.body || 'Empty — click to write'}
      </span>
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
/* The post                                                                 */
/* ------------------------------------------------------------------------ */

const REWRITES: { label: string; apply: (body: string) => string }[] = [
  { label: 'Shorter', apply: (b) => b.split('\n\n').slice(0, 2).join('\n\n') },
  {
    label: 'More personal',
    apply: (b) => `Something I don’t say often enough:\n\n${b}`,
  },
  { label: 'End with a question', apply: (b) => `${b}\n\nWhat would you add?` },
]

function PostPanel({
  post,
  connected,
  onClose,
  onChange,
  onAddImage,
  onSchedule,
}: {
  post: PlanPost
  connected: boolean
  onClose: () => void
  onChange: (patch: Partial<PlanPost>) => void
  onAddImage: (name: string) => void
  onSchedule: () => void
}) {
  const info = getPlatformByZernioId(post.platform)
  const Icon = info?.icon
  const saving = useSavePulse(post.body)
  const [rewriting, setRewriting] = useState<string | null>(null)
  const when = `${dayLabel(firstMonday(), post.day)} at ${post.time}`
  const name = info?.name === 'Twitter' ? 'X' : info?.name

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-quaternary bg-primary">
      <header className="flex items-center gap-2 border-b border-quaternary px-5 py-4">
        {Icon && (
          <Icon
            weight="fill"
            className="size-5"
            style={{ color: info?.color }}
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-tertiary-foreground">{when}</span>
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
        <Textarea
          disabled={post.status === 'scheduled'}
          value={post.body}
          placeholder="What do you want to say?"
          onChange={(e) => onChange({ body: e.target.value })}
          className="min-h-56 text-sm leading-6"
        />

        {post.status === 'draft' && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-secondary-foreground">
              <SparkleIcon weight="fill" className="size-3.5 text-accent" /> Ask
              Ogen to make it…
            </p>
            <div className="flex flex-wrap gap-2">
              {REWRITES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  disabled={!post.body || rewriting !== null}
                  onClick={() => {
                    setRewriting(r.label)
                    window.setTimeout(() => {
                      onChange({ body: r.apply(post.body) })
                      setRewriting(null)
                    }, 900)
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-quaternary px-3 text-[13px] text-secondary-foreground transition-colors hover:border-primary-foreground hover:text-primary-foreground disabled:opacity-40"
                >
                  {rewriting === r.label && (
                    <CircleNotchIcon className="size-3.5 animate-spin" />
                  )}
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              {post.status === 'draft' && (
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
              disabled={post.status === 'scheduled'}
              onClick={() =>
                onAddImage(
                  post.wantsImage
                    ? 'harbour-coffee-cup.jpg'
                    : 'studio-desk.jpg',
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
        {post.status === 'draft' ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="accent"
              size="xl"
              className="justify-center"
              disabled={!post.body}
              onClick={onSchedule}
            >
              Schedule for {when}
            </Button>
            {!connected && (
              <p className="text-center text-xs text-tertiary-foreground">
                You’ll connect {name} first. It takes a few seconds.
              </p>
            )}
          </div>
        ) : (
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
        )}
      </footer>
    </aside>
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
  const name = info?.name === 'Twitter' ? 'X' : info?.name
  const [busy, setBusy] = useState(false)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-primary-foreground/40 p-4"
      style={{ zIndex: 50 }}
    >
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-[420px] bg-primary p-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {Icon && (
          <Icon
            weight="fill"
            className="size-10"
            style={{ color: info?.color }}
          />
        )}
        <h2 className="mt-4 font-display text-xl font-medium tracking-tight">
          Connect your {name}
        </h2>
        <p className="mt-2 text-sm leading-5 text-secondary-foreground">
          So Ogen can post this for you at the time you picked. It only ever
          posts what you schedule, and you can disconnect any time.
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
              window.setTimeout(onConnected, 1300)
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
/* Library                                                                  */
/* ------------------------------------------------------------------------ */

type LibraryTab = 'about' | 'references' | 'media'

/**
 * Everything Ogen knows, and the pictures you post — the decision of
 * 2026-11-03 drawn: References are read and never posted, Media is posted and
 * never read, and nothing is both.
 */
function LibraryPage({
  profile,
  onProfileChange,
  media,
}: {
  profile: Profile
  onProfileChange: (p: Profile) => void
  media: string[]
}) {
  const [tab, setTab] = useState<LibraryTab>('about')
  const saving = useSavePulse(profile)

  const TABS: { id: LibraryTab; label: string; sub: string }[] = [
    {
      id: 'about',
      label: 'About you',
      sub: 'What Ogen writes from — your business, who it’s for, how you sound.',
    },
    {
      id: 'references',
      label: 'References',
      sub: 'Pages and files Ogen reads to get the details right. They’re never posted.',
    },
    {
      id: 'media',
      label: 'Media',
      sub: 'Pictures and videos for your posts. Anything you add to a post is kept here too.',
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
        {tab === 'about' && <SaveMark saving={saving} />}
        {tab !== 'about' && (
          <Button variant="secondary">
            <PlusIcon />
            {tab === 'references' ? 'Add a reference' : 'Upload'}
          </Button>
        )}
      </header>

      <div role="tablist" className="flex gap-6 border-b border-quaternary">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
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

      {tab === 'about' && (
        <div className="flex flex-col gap-6 bg-primary p-6">
          <LibraryField label="What you do">
            <Textarea
              className="min-h-16"
              value={profile.what}
              onChange={(e) =>
                onProfileChange({ ...profile, what: e.target.value })
              }
            />
          </LibraryField>
          <LibraryField label="Who it’s for">
            <Textarea
              className="min-h-16"
              value={profile.who}
              onChange={(e) =>
                onProfileChange({ ...profile, who: e.target.value })
              }
            />
          </LibraryField>
          <LibraryField label="How you sound">
            <p className="text-sm">{profile.tone.join(' · ') || '—'}</p>
          </LibraryField>
          <LibraryField label="Facts Ogen can use">
            <ul className="flex flex-col gap-1.5 text-sm leading-5">
              {profile.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </LibraryField>
        </div>
      )}

      {tab === 'references' && (
        <ul className="flex flex-col bg-primary">
          {READ_PAGES.map((page) => (
            <li
              key={page.path}
              className="flex items-center gap-3 border-b border-quaternary px-5 py-3 last:border-b-0"
            >
              <GlobeSimpleIcon className="size-4 text-tertiary-foreground" />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm">{page.label}</span>
                <span className="truncate text-xs text-tertiary-foreground">
                  {PERSONA.website}
                  {page.path === '/' ? '' : page.path}
                </span>
              </span>
              <span className="ml-auto text-xs text-tertiary-foreground">
                From your website
              </span>
            </li>
          ))}
          <li className="flex items-center gap-3 px-5 py-4 text-[13px] text-tertiary-foreground">
            <FileTextIcon className="size-4" />
            Add a price list, a brochure or notes from a client call — anything
            Ogen should know.
          </li>
        </ul>
      )}

      {tab === 'media' &&
        (media.length === 0 ? (
          <div className="flex flex-col items-center gap-2 bg-primary px-6 py-14 text-center">
            <ImageIcon className="size-8 text-quaternary-foreground" />
            <p className="text-sm font-medium">No pictures yet</p>
            <p className="max-w-sm text-sm leading-5 text-secondary-foreground">
              Upload photos and videos here, or add one to a post — it’ll be
              kept here so you can use it again.
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

function LibraryField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  )
}

function OutOfScope({ place }: { place: Place }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-base font-medium">
        {place === 'create' ? 'Create' : 'Results'}
      </p>
      <p className="max-w-sm text-sm leading-5 text-secondary-foreground">
        Not part of this test. What did you expect to find here?
      </p>
    </div>
  )
}
