import { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  CircleNotchIcon,
  LinkSimpleIcon,
  PlusIcon,
  SparkleIcon,
  XIcon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib'
import { formatDate } from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'

import {
  GOALS,
  IDEAS,
  LANGUAGES,
  OTHER_PLATFORMS,
  WEEK_DAYS,
  addDays,
  firstMonday,
  type Account,
  type Brand,
  type Brief,
  type IdeaId,
  type PlatformId,
} from './-fixtures'
import {
  ChoiceCard,
  Chip,
  Field,
  OnboardingFrame,
  RailCaption,
  SaveMark,
  StepFooter,
  Title,
  platformName,
  useSavePulse,
} from './-frame'
import type { Role } from './-setup'

/* ------------------------------------------------------------------------ */
/* 5 · Accounts                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Accounts are connected during onboarding this time. A marketer knows
 * exactly which ones they run, and a campaign brief that can't name its
 * channels isn't one. A freelancer often doesn't hold the client's login, so
 * every row can be handed to the client as a link instead.
 */
export function AccountsStep({
  business,
  role,
  accounts,
  connected,
  onAccounts,
  onConnected,
  onBack,
  onNext,
}: {
  business: string
  role: Role | null
  accounts: Account[]
  connected: PlatformId[]
  onAccounts: (a: Account[]) => void
  onConnected: (update: (c: PlatformId[]) => PlatformId[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const isClient = role === 'freelancer'
  const others = OTHER_PLATFORMS.filter(
    (p) => !accounts.some((a) => a.platform === p),
  )

  return (
    <OnboardingFrame
      step="accounts"
      progress={connected.length / (accounts.length + 1)}
    >
      <Title
        sub={`Found on ${isClient ? 'their' : 'your'} website. Ogen never posts anything you haven’t scheduled.`}
      >
        Connect {business}’s accounts
      </Title>

      <ul className="flex flex-col border-t border-quaternary">
        {accounts.map((account) => (
          <AccountRow
            key={account.platform}
            account={account}
            isClient={isClient}
            connected={connected.includes(account.platform)}
            onConnected={() =>
              onConnected((c) =>
                c.includes(account.platform) ? c : [...c, account.platform],
              )
            }
            onDisconnect={() =>
              onConnected((c) => c.filter((p) => p !== account.platform))
            }
          />
        ))}
      </ul>

      {others.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-tertiary-foreground">Also on:</span>
          {others.map((p) => {
            const info = getPlatformByZernioId(p)
            return (
              <Chip
                key={p}
                on={false}
                onClick={() =>
                  onAccounts([
                    ...accounts,
                    { platform: p, handle: 'Not connected yet', note: '' },
                  ])
                }
              >
                <span className="flex items-center gap-1.5">
                  <PlusIcon className="size-3" />
                  {platformName(info?.name)}
                </span>
              </Chip>
            )
          })}
        </div>
      )}

      <StepFooter onBack={onBack}>
        {connected.length === 0 && (
          <Button variant="ghost" onClick={onNext}>
            Connect later
          </Button>
        )}
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={connected.length === 0}
          onClick={onNext}
        >
          Continue
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

function AccountRow({
  account,
  isClient,
  connected,
  onConnected,
  onDisconnect,
}: {
  account: Account
  isClient: boolean
  connected: boolean
  onConnected: () => void
  onDisconnect: () => void
}) {
  const info = getPlatformByZernioId(account.platform)
  const Icon = info?.icon
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  return (
    <li className="flex items-center gap-4 border-b border-quaternary py-4">
      {Icon && (
        <Icon
          weight="fill"
          className="size-7 shrink-0"
          style={{ color: info?.color }}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {platformName(info?.name)}
          <span className="ml-2 font-normal text-secondary-foreground">
            {account.handle}
          </span>
        </span>
        <span className="text-xs text-tertiary-foreground">
          {linkSent && !connected
            ? 'Link copied — the client connects it, you never see their password'
            : account.note}
        </span>
      </span>
      {connected ? (
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-accent">
            <CheckCircleIcon weight="fill" className="size-4" />
            Connected
          </span>
          <button
            type="button"
            aria-label="Disconnect"
            onClick={onDisconnect}
            className="text-tertiary-foreground hover:text-primary-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {isClient && !linkSent && (
            <Button variant="ghost" size="sm" onClick={() => setLinkSent(true)}>
              <LinkSimpleIcon />
              Ask the client
            </Button>
          )}
          <Button
            variant="neutral"
            loading={busy}
            onClick={() => {
              setBusy(true)
              window.setTimeout(() => {
                setBusy(false)
                onConnected()
              }, 1100)
            }}
          >
            Connect
          </Button>
        </span>
      )}
    </li>
  )
}

/* ------------------------------------------------------------------------ */
/* 6 · First campaign                                                       */
/* ------------------------------------------------------------------------ */

export function briefFromIdea(
  id: IdeaId,
  brand: Brand,
  platforms: PlatformId[],
): Brief {
  const idea = IDEAS.find((i) => i.id === id)!
  return {
    ...idea.brief,
    idea: id,
    audienceIds: idea.brief.audienceIds.filter((a) =>
      brand.audiences.some((x) => x.id === a),
    ),
    languages: idea.brief.languages.filter((l) => brand.languages.includes(l)),
    platforms,
  }
}

const WEEK_OPTIONS = [4, 7, 10, 12]

/**
 * The first campaign: three ideas Ogen proposes from the brand and the
 * season, then the brief itself, pre-filled and editable. Every field here is
 * one a marketer would write anyway; the test is whether a pre-filled one is
 * read and corrected, or skimmed.
 */
export function CampaignStep({
  brand,
  accounts,
  connected,
  brief,
  onBrief,
  onBack,
  onNext,
}: {
  brand: Brand
  accounts: Account[]
  connected: PlatformId[]
  brief: Brief | null
  onBrief: (b: Brief | null) => void
  onBack: () => void
  onNext: () => void
}) {
  const saving = useSavePulse(brief)
  const [other, setOther] = useState(false)
  const channels =
    connected.length > 0 ? connected : accounts.map((a) => a.platform)
  const ready =
    brief !== null &&
    brief.name.trim() !== '' &&
    brief.platforms.length > 0 &&
    brief.audienceIds.length > 0
  const needs = [
    { label: 'An idea', done: brief !== null },
    { label: 'A name', done: !!brief?.name.trim() },
    { label: 'Channels', done: (brief?.platforms.length ?? 0) > 0 },
    { label: 'An audience', done: (brief?.audienceIds.length ?? 0) > 0 },
  ]

  return (
    <OnboardingFrame
      step="campaign"
      progress={needs.filter((n) => n.done).length / (needs.length + 2)}
      aside={brief && <SaveMark saving={saving} />}
      detail={
        <div>
          <RailCaption>The brief needs</RailCaption>
          <ul className="flex flex-col gap-1.5">
            {needs.map((n) => (
              <li
                key={n.label}
                className={cn(
                  'flex items-center gap-2 text-xs',
                  n.done
                    ? 'text-secondary-foreground'
                    : 'text-tertiary-foreground',
                )}
              >
                {n.done ? (
                  <CheckIcon weight="bold" className="size-3.5 text-accent" />
                ) : (
                  <CircleIcon className="size-3.5 text-quaternary-foreground" />
                )}
                {n.label}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <Title sub="Suggested from the brand and the time of year.">
        Your first campaign
      </Title>

      <div className="grid gap-2 sm:grid-cols-2">
        {IDEAS.map((idea) => (
          <ChoiceCard
            key={idea.id}
            on={!other && brief?.idea === idea.id}
            onClick={() => {
              setOther(false)
              onBrief(briefFromIdea(idea.id, brand, channels))
            }}
            title={idea.name}
          >
            {idea.why}
          </ChoiceCard>
        ))}
        <ChoiceCard
          on={other}
          onClick={() => {
            setOther(true)
            onBrief(null)
          }}
          title="Something else"
        >
          Write your own brief from scratch.
        </ChoiceCard>
      </div>

      {other && (
        <p className="mt-6 bg-secondary px-4 py-3 text-sm leading-5 text-secondary-foreground">
          Not part of this prototype. What would you have run first?
        </p>
      )}

      {brief && (
        <div
          key={brief.idea}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-10 flex flex-col gap-7 border-t border-quaternary pt-8"
        >
          <BriefForm
            brief={brief}
            brand={brand}
            channels={channels}
            onChange={onBrief}
          />
        </div>
      )}

      <StepFooter onBack={onBack}>
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={!ready}
          onClick={onNext}
        >
          <SparkleIcon weight="fill" />
          Plan this campaign
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

/**
 * The brief's fields. Shared with the campaign's Brief tab, so the brief
 * written during onboarding is the same form you come back to.
 */
export function BriefForm({
  brief,
  brand,
  channels,
  onChange,
}: {
  brief: Brief
  brand: Brand
  channels: PlatformId[]
  onChange: (b: Brief) => void
}) {
  const start = firstMonday()
  const set = (patch: Partial<Brief>) => onChange({ ...brief, ...patch })
  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  return (
    <>
      <Field label="Name">
        <Input
          variant="primary"
          value={brief.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <Field label="Goal">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip
              key={g.id}
              on={brief.goal === g.id}
              onClick={() => set({ goal: g.id })}
            >
              {g.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="For" hint="From the brand’s audiences">
        <div className="flex flex-wrap gap-2">
          {brand.audiences.map((a) => (
            <Chip
              key={a.id}
              on={brief.audienceIds.includes(a.id)}
              onClick={() =>
                set({ audienceIds: toggle(brief.audienceIds, a.id) })
              }
            >
              {a.name || 'Unnamed audience'}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field
          label="Weeks"
          hint={`${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(start, brief.weeks * 7 - 1), { day: 'numeric', month: 'short' })}`}
        >
          <div className="flex flex-wrap gap-2">
            {WEEK_OPTIONS.map((w) => (
              <Chip
                key={w}
                on={brief.weeks === w}
                onClick={() => set({ weeks: w })}
              >
                {w}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Posts a week">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Chip
                key={n}
                on={brief.perWeek === n}
                onClick={() => set({ perWeek: n })}
              >
                {n}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Where">
          <div className="flex flex-wrap gap-2">
            {channels.map((p) => (
              <Chip
                key={p}
                on={brief.platforms.includes(p)}
                onClick={() => set({ platforms: toggle(brief.platforms, p) })}
              >
                {platformName(getPlatformByZernioId(p)?.name)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="In">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.filter((l) => brand.languages.includes(l.code)).map(
              (l) => (
                <Chip
                  key={l.code}
                  on={brief.languages.includes(l.code)}
                  disabled={
                    brief.languages.length === 1 &&
                    brief.languages[0] === l.code
                  }
                  onClick={() =>
                    set({ languages: toggle(brief.languages, l.code) })
                  }
                >
                  {l.label}
                </Chip>
              ),
            )}
          </div>
        </Field>
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Measured by">
          <Input
            variant="primary"
            value={brief.measure}
            onChange={(e) => set({ measure: e.target.value })}
          />
        </Field>
        <Field label="Target">
          <Input
            variant="primary"
            value={brief.target}
            onChange={(e) => set({ target: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Key messages" hint="Every post carries one of these">
        <div className="flex flex-col gap-2">
          {brief.messages.map((m, i) => (
            <div key={i} className="group flex items-center gap-2">
              <span className="w-4 text-xs tabular-nums text-tertiary-foreground">
                {i + 1}
              </span>
              <Input
                variant="primary"
                value={m}
                onChange={(e) =>
                  set({
                    messages: brief.messages.map((x, j) =>
                      j === i ? e.target.value : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label="Remove message"
                className="text-tertiary-foreground opacity-0 hover:text-primary-foreground group-hover:opacity-100"
                onClick={() =>
                  set({ messages: brief.messages.filter((_, j) => j !== i) })
                }
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))}
          {brief.messages.length < 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => set({ messages: [...brief.messages, ''] })}
            >
              <PlusIcon />
              Add a message
            </Button>
          )}
        </div>
      </Field>

      <Field label="Call to action">
        <Input
          variant="primary"
          value={brief.cta}
          onChange={(e) => set({ cta: e.target.value })}
        />
      </Field>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* 7 · Planning                                                             */
/* ------------------------------------------------------------------------ */

/**
 * The plan being made: every week gets its slots, the first week gets
 * written. Drafts are written a week ahead rather than all at once — the
 * screen says so, so that week two being angles and not posts reads as the
 * design rather than as unfinished.
 */
export function PlanningStep({
  brief,
  brand,
  speed,
  onDone,
}: {
  brief: Brief
  brand: Brand
  speed: number
  onDone: () => void
}) {
  const [done, setDone] = useState(0)
  const start = firstMonday()
  // Week 1 is written (slow), the rest are planned (quick), then the checks.
  const steps = brief.weeks + 1
  const ms = done === 0 ? 2600 : done < brief.weeks ? 220 : 1100

  useEffect(() => {
    if (done >= steps) return
    const timer = window.setTimeout(() => setDone((d) => d + 1), ms / speed)
    return () => window.clearTimeout(timer)
  }, [done, ms, speed, steps])

  const idea = IDEAS.find((i) => i.id === brief.idea)!
  const finished = done >= steps
  const perWeek = Math.min(brief.perWeek, 5)
  const langs = LANGUAGES.filter((l) => brief.languages.includes(l.code)).map(
    (l) => l.label,
  )

  return (
    <OnboardingFrame step="planning" progress={0.5 + done / steps / 2}>
      <Title
        sub={
          finished
            ? 'The first week is written for you to review. Ogen writes each following week a week ahead, so it can use what the last one taught.'
            : `${brief.weeks} weeks, ${perWeek} posts a week, in ${langs.join(' and ')}.`
        }
      >
        {finished ? `${brief.name} is planned` : `Planning ${brief.name}…`}
      </Title>

      <ul className="flex flex-col">
        {Array.from({ length: brief.weeks }, (_, w) => {
          const monday = addDays(start, w * 7)
          const state = done > w ? 'done' : done === w ? 'busy' : 'todo'
          return (
            <li
              key={w}
              className={cn(
                'flex items-center gap-3 border-b border-quaternary py-2 text-[13px]',
                state === 'todo' && 'text-tertiary-foreground',
              )}
            >
              {state === 'done' ? (
                <CheckIcon weight="bold" className="size-4 text-accent" />
              ) : state === 'busy' ? (
                <CircleNotchIcon className="size-4 animate-spin text-secondary-foreground" />
              ) : (
                <CircleIcon className="size-4 text-quaternary-foreground" />
              )}
              <span className="w-16 font-medium">Week {w + 1}</span>
              <span className="w-28 text-tertiary-foreground">
                {formatDate(monday, { day: 'numeric', month: 'short' })} –{' '}
                {formatDate(addDays(monday, 6), {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="flex-1 truncate text-secondary-foreground">
                {w === 0
                  ? state === 'done'
                    ? `${idea.drafts.length} drafts written`
                    : 'Writing drafts…'
                  : state === 'done'
                    ? WEEK_DAYS[perWeek]
                        .map(
                          (_, i) =>
                            idea.slots[
                              ((w - 1) * perWeek + i) % idea.slots.length
                            ].angle,
                        )
                        .join(' · ')
                    : ''}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 flex h-5 items-center gap-2 text-[13px] text-secondary-foreground">
        {done >= brief.weeks && (
          <span className="animate-in fade-in flex items-center gap-2">
            {finished ? (
              <CheckCircleIcon weight="fill" className="size-4 text-accent" />
            ) : (
              <CircleNotchIcon className="size-4 animate-spin" />
            )}
            {finished
              ? `Checked against ${brand.rules.length} rules — nothing to fix`
              : `Checking the drafts against ${brand.rules.length} rules`}
          </span>
        )}
      </div>

      <div className="mt-8 flex h-11 justify-end">
        {finished && (
          <Button variant="accent" size="xl" onClick={onDone}>
            Open the campaign
          </Button>
        )}
      </div>
    </OnboardingFrame>
  )
}
