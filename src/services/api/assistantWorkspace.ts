import type {
  ActivityRange,
  DigestFigure,
  PostHistory,
  WeeklyDigest,
  WorkspaceResults,
  WorkspaceSetup,
} from '@/types/assistant'
import { isRecord } from './json'

/**
 * The workspace pack's typed results (CON-464): `results.workspace` holds each
 * tool's last output in the turn — the activity over a day or a range, the
 * setup, the weekly report shown or emailed, a post's history, and an
 * auto-publish change with its `undoId`. `openConnect` has no card: what it did
 * is the turn's `open_connect` UI action.
 */
export function workspaceResults(
  results: Record<string, unknown>,
): WorkspaceResults | undefined {
  const w = record(results.workspace)
  if (!w) return undefined
  const emailed = record(w.emailWeeklyDigest)
  const auto = record(w.setAutoPublish)
  const out: WorkspaceResults = {
    activity: activity(w.activityReport),
    setup: setup(w.workspaceSetup),
    digest: digest(w.weeklyDigest),
    emailed:
      emailed && str(emailed.from)
        ? { from: str(emailed.from), to: str(emailed.to) }
        : undefined,
    history: history(w.postHistory),
    autoPublish: auto
      ? { platforms: strings(auto.autoPublish), undoId: optStr(auto.undoId) }
      : undefined,
  }
  for (const key of Object.keys(out) as (keyof WorkspaceResults)[]) {
    if (out[key] === undefined) delete out[key]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function activity(raw: unknown): ActivityRange | undefined {
  const r = record(raw)
  if (!r || !str(r.from)) return undefined
  const published = record(r.published) ?? {}
  const failed = record(r.failed) ?? {}
  const created = record(r.created) ?? {}
  const campaigns = record(r.campaigns_created) ?? {}
  return {
    from: str(r.from),
    to: str(r.to),
    tz: str(r.tz),
    published: num(published.total),
    failed: num(failed.total),
    failedPosts: list(failed.posts).map((p) => ({
      postId: str(p.post_id),
      status: str(p.status),
      reason: str(p.failure_reason),
    })),
    created: num(created.posts_total),
    scheduled: num(created.scheduled_total),
    campaignsCreated: num(campaigns.total),
    days: list(r.days)
      .map((d) => ({
        date: str(d.date),
        published: num(d.published_total),
        failed: num(d.failed_total),
        created: num(d.created_total),
        campaignsCreated: num(d.campaigns_created_total),
      }))
      .filter((d) => d.date),
  }
}

function setup(raw: unknown): WorkspaceSetup | undefined {
  const s = record(raw)
  if (!s) return undefined
  return {
    timezone: str(s.timezone),
    // Null when the list can't be read here: unknown, not "none".
    autoPublish: Array.isArray(s.autoPublish)
      ? strings(s.autoPublish)
      : undefined,
    accounts: list(s.accounts)
      .map((a) => ({
        id: str(a.id),
        platform: str(a.platform),
        username: str(a.username),
        needsReconnect: a.needsReconnect === true,
        health: optStr(a.health),
        tokenExpiresAt: optStr(a.tokenExpiresAt),
        autoPublish: a.autoPublish === true,
      }))
      .filter((a) => a.id),
  }
}

function figure(raw: unknown): DigestFigure {
  const f = record(raw) ?? {}
  return { value: str(f.value), delta: optStr(f.delta), good: f.good === true }
}

function digest(raw: unknown): WeeklyDigest | undefined {
  const d = record(raw)
  const r = record(d?.report)
  if (!d || !r) return undefined
  const pub = record(r.publishing)
  const perf = record(r.performance)
  const camp = record(r.campaigns)
  const ideas = record(r.ideas)
  const team = record(r.team)
  return {
    from: str(d.from),
    to: str(d.to),
    empty: d.empty === true,
    headline: str(r.headline),
    lede: str(r.lede),
    attention: list(r.attention)
      .map((a) => ({ text: str(a.text), detail: optStr(a.detail) }))
      .filter((a) => a.text),
    publishing: pub
      ? {
          published: figure(pub.published),
          failed: optStr(pub.failed),
          failures: list(pub.failures).map((f) => ({
            title: str(f.title),
            meta: str(f.meta),
            reason: str(f.reason),
          })),
          nextWeek: optStr(pub.next_week),
        }
      : undefined,
    performance: perf
      ? {
          reach: figure(perf.reach),
          interactions: figure(perf.interactions),
          engagement: figure(perf.engagement),
          followers: figure(perf.followers),
          top: list(perf.top).map((p) => ({
            title: str(p.title),
            meta: str(p.meta),
            reach: str(p.reach),
            multiple: str(p.multiple),
          })),
        }
      : undefined,
    campaigns: camp
      ? {
          rows: list(camp.rows).map((c) => ({
            name: str(c.name),
            goal: str(c.goal),
            status: str(c.status),
            met: c.met === true,
          })),
          summary: optStr(camp.summary),
        }
      : undefined,
    ideas:
      ideas && (str(ideas.waiting) || str(ideas.summary))
        ? { waiting: optStr(ideas.waiting), summary: optStr(ideas.summary) }
        : undefined,
    team: optStr(team?.summary),
  }
}

function history(raw: unknown): PostHistory | undefined {
  const h = record(raw)
  if (!h || !str(h.postId)) return undefined
  return {
    postId: str(h.postId),
    title: str(h.title),
    more: h.more === true,
    unrecorded: Boolean(optStr(h.note)),
    entries: list(h.entries)
      .map((e) => ({
        at: str(e.at),
        kind: e.kind === 'version' ? ('version' as const) : ('event' as const),
        what: str(e.what),
        version:
          typeof e.version === 'number' && e.version > 0
            ? e.version
            : undefined,
        by: str(e.by),
        byId: optStr(e.byId),
        source: optStr(e.source),
      }))
      .filter((e) => e.at),
  }
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function record(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optStr(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : []
}
