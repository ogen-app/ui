import type {
  CompiledPost,
  DraftedIdeaPost,
  Grounding,
  IdeaBrief,
  IdeaPlanBrief,
  IdeasChanged,
  IdeasResults,
  IdeasShared,
} from '@/types/assistant'
import { parseGrounding } from './grounding'
import { isRecord } from './json'

/**
 * The ideas pack's typed results (CON-465): `results.ideas` holds each tool's
 * last output in the turn — found, decided, moved, deleted, compiled, drafted,
 * read, edited, compared and merged — with the `undoId` of each change that
 * can be put back.
 */
export function ideasResults(
  results: Record<string, unknown>,
): IdeasResults | undefined {
  const r = record(results.ideas)
  if (!r) return undefined
  const found = record(r.findIdeas)
  const decided = record(r.setIdeaVerdict)
  const compiled = record(r.compileIdeas)
  const drafted = record(r.draftIdeas)
  const edited = record(r.editIdea)
  const similar = record(r.similarIdeas)
  const dupes = record(r.findDuplicateIdeas)
  const merged = record(r.mergeIdeas)
  const out: IdeasResults = {
    found: found
      ? {
          ideas: briefs(found.ideas),
          total: num(found.total),
          pileTotal:
            typeof found.pileTotal === 'number' ? found.pileTotal : undefined,
        }
      : undefined,
    decided:
      decided && brief(decided.idea)
        ? { idea: brief(decided.idea)!, undoId: optStr(decided.undoId) }
        : undefined,
    decidedMany: triaged(r.setIdeaVerdicts),
    moved: withIdeas(r.moveIdeas),
    deleted: changed(r.deleteIdeas),
    compiled: compiled ? compiledResult(compiled) : undefined,
    drafted: drafted
      ? {
          posts: list(drafted.posts)
            .map(draftedPost)
            .filter((p): p is NonNullable<typeof p> => p !== null),
          warnings: strings(drafted.warnings),
        }
      : undefined,
    idea: idea(r.getIdea),
    edited:
      edited && brief(edited.idea)
        ? {
            idea: brief(edited.idea)!,
            changed: strings(edited.changed),
            before: record(edited.before)
              ? {
                  title: str(record(edited.before)!.title),
                  note: optStr(record(edited.before)!.note),
                  plan: plan(record(edited.before)!.plan),
                }
              : undefined,
            undoId: optStr(edited.undoId),
          }
        : undefined,
    similar: similar
      ? {
          ideaId: str(similar.ideaId),
          title: str(similar.title),
          items: list(similar.similar)
            .map((s) => ({ idea: brief(s.idea), why: strings(s.why) }))
            .filter((s): s is { idea: IdeaBrief; why: string[] } =>
              Boolean(s.idea),
            ),
        }
      : undefined,
    common: common(r.ideasInCommon),
    duplicates: dupes
      ? {
          total: num(dupes.total),
          groups: list(dupes.groups).map((g) => ({
            keepId: str(g.keepId),
            similarity: num(g.similarity),
            ideas: briefs(g.ideas),
          })),
        }
      : undefined,
    merged: merged ? mergedResult(merged) : undefined,
  }
  for (const key of Object.keys(out) as (keyof IdeasResults)[]) {
    if (out[key] === undefined) delete out[key]
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * One `idea_draft_post` event (CON-466): a draft written from ideas, already
 * saved, with what grounds it. Null for one without a post.
 */
export function draftedPost(
  raw: Record<string, unknown>,
): DraftedIdeaPost | null {
  const id = str(raw.postId)
  if (!id) return null
  return {
    postId: id,
    title: str(raw.title),
    platformId: str(raw.platformId),
    publishDate: optStr(raw.publishDate),
    campaignId: optStr(raw.campaignId),
    ideaIds: strings(raw.ideaIds),
    excerpt: optStr(raw.excerpt),
    grounding: grounding(raw.grounding),
  }
}

/** A merge (CON-481): every group, or the one an older server sent. */
function mergedResult(
  raw: Record<string, unknown>,
): IdeasResults['merged'] | undefined {
  const groups = list(raw.groups)
    .map((g) => ({ idea: brief(g.idea), deleted: strings(g.deleted).length }))
    .filter((g): g is { idea: IdeaBrief; deleted: number } => Boolean(g.idea))
  const one = brief(raw.idea)
  const all =
    groups.length > 0
      ? groups
      : one
        ? [{ idea: one, deleted: strings(raw.deleted).length }]
        : []
  return all.length > 0
    ? { groups: all, stopped: optStr(raw.stopped) }
    : undefined
}

function withIdeas(
  raw: unknown,
): (IdeasChanged & { ideas: IdeaBrief[] }) | undefined {
  const c = changed(raw)
  return c ? { ...c, ideas: briefs(record(raw)?.ideas) } : undefined
}

const TRIAGE = ['yes', 'later', 'no', 'none'] as const

function triaged(raw: unknown): IdeasResults['decidedMany'] {
  const c = withIdeas(raw)
  const r = record(raw)
  return c && r
    ? {
        ...c,
        verdict: TRIAGE.find((v) => v === r.verdict),
        remindAt: optStr(r.remindAt),
      }
    : undefined
}

/** An idea's plan, from the server's camel or snake keys. */
function plan(raw: unknown): IdeaPlanBrief {
  const p = record(raw) ?? {}
  return {
    platformId: optStr(p.platformId) ?? optStr(p.platform_id),
    postType: optStr(p.postType) ?? optStr(p.post_type),
    phaseId: optStr(p.phaseId) ?? optStr(p.phase_id),
    targetDate: optStr(p.targetDate) ?? optStr(p.target_date),
  }
}

/** `compileIdeas` (CON-470): a planned post per platform, under `posts`. */
function compiledResult(
  raw: Record<string, unknown>,
): IdeasResults['compiled'] | undefined {
  const posts = list(raw.posts)
    .filter((p) => str(p.postId))
    .map((p): CompiledPost => ({
      postId: str(p.postId),
      title: str(p.title),
      platformId: optStr(p.platformId),
      postType: optStr(p.postType),
      date: optStr(p.date),
    }))
  if (posts.length === 0) return undefined
  return {
    posts,
    campaignId: str(raw.campaignId),
    ideas: num(raw.ideas),
    builtFrom: list(raw.builtFrom)
      .map((i) => ({ id: str(i.id), title: str(i.title) }))
      .filter((i) => i.id),
    theses: list(raw.theses)
      .map((th) => ({ title: str(th.title), points: strings(th.points) }))
      .filter((th) => th.title || th.points.length > 0),
    grounding: grounding(raw.grounding),
    undoId: optStr(raw.undoId),
  }
}

const VERDICTS = ['yes', 'later', 'no'] as const

function brief(raw: unknown): IdeaBrief | undefined {
  const i = record(raw)
  if (!i || !str(i.id)) return undefined
  return {
    id: str(i.id),
    title: str(i.title),
    verdict: VERDICTS.find((v) => v === i.verdict),
    remindAt: optStr(i.remindAt),
    campaignId: optStr(i.campaignId),
    fitScore: typeof i.fitScore === 'number' ? i.fitScore : undefined,
    posts: typeof i.posts === 'number' ? i.posts : undefined,
    plan: isRecord(i.plan) ? plan(i.plan) : undefined,
  }
}

function briefs(raw: unknown): IdeaBrief[] {
  return list(raw)
    .map(brief)
    .filter((i): i is IdeaBrief => i !== undefined)
}

function changed(raw: unknown): IdeasChanged | undefined {
  const c = record(raw)
  if (!c) return undefined
  return {
    done: num(c.done),
    failed: strings(c.failed).length,
    stopped: optStr(c.stopped),
    undoId: optStr(c.undoId),
  }
}

/**
 * Compile and draft always say how they were grounded (CON-448). Grounded
 * means a named source: a turn stored before they said, or one claiming
 * grounding with nothing to show for it, reads as exploratory.
 */
function grounding(raw: unknown): Grounding {
  const g = parseGrounding(raw)
  return g && (g.mode === 'exploratory' || g.sources.length > 0)
    ? g
    : { mode: 'exploratory', sources: g?.sources ?? [] }
}

function idea(raw: unknown): IdeasResults['idea'] {
  const g = record(raw)
  const ref = brief(g?.idea)
  if (!g || !ref) return undefined
  const fit = record(g.fit)
  const asset = record(g.sourceAsset)
  const analysis = record(g.analysis)
  return {
    idea: ref,
    angle: optStr(g.angle),
    rationale: optStr(g.rationale),
    fit: fit
      ? {
          score: typeof fit.score === 'number' ? fit.score : undefined,
          lens: fit.lens === 'campaign' ? 'campaign' : 'workspace',
          campaignId: optStr(fit.campaignId),
          criteria: list(fit.criteria)
            .map((c) => ({
              key: str(c.key),
              level: num(c.level),
              why: str(c.why),
              phase: optStr(c.phase),
              campaign: optStr(c.campaign),
            }))
            .filter((c) => c.key),
          caps: list(fit.caps)
            .map((c) => str(c.cap))
            .filter(Boolean),
        }
      : undefined,
    sourceAsset:
      asset && str(asset.id)
        ? { id: str(asset.id), title: str(asset.title) }
        : undefined,
    analysisGist: optStr(analysis?.gist),
    lens: record(analysis?.lens)
      ? {
          campaignId: optStr(record(analysis?.lens)!.campaignId),
          campaignName: optStr(record(analysis?.lens)!.campaignName),
        }
      : undefined,
    posts: list(g.posts)
      .map((p) => ({
        id: str(p.id),
        title: str(p.title),
        status: str(p.status),
        campaignId: str(p.campaign_id),
      }))
      .filter((p) => p.id),
  }
}

/** What a selection shares, in the order the card reads it. */
const SHARED_KINDS = [
  'assets',
  'lenses',
  'campaigns',
  'platforms',
  'postTypes',
  'phases',
  'origins',
  'terms',
] as const

function common(raw: unknown): IdeasResults['common'] {
  const c = record(raw)
  if (!c) return undefined
  return {
    ideas: list(c.ideas)
      .map((i) => ({ id: str(i.id), title: str(i.title) }))
      .filter((i) => i.id),
    shared: SHARED_KINDS.map((kind) => ({
      kind,
      values: list(c[kind])
        .map((v): IdeasShared => ({
          value: str(v.value),
          label: str(v.label) || str(v.value),
          ideaIds: strings(v.ideaIds),
        }))
        .filter((v) => v.value),
    })).filter((s) => s.values.length > 0),
    theme: optStr(c.theme),
    angle: optStr(c.angle),
    splits: list(c.splits)
      .map((sp) => ({
        field: str(sp.field),
        values: list(sp.values)
          .map((v): IdeasShared => ({
            value: str(v.value),
            label: str(v.label) || str(v.value),
            ideaIds: strings(v.ideaIds),
          }))
          .filter((v) => v.value),
      }))
      .filter((sp) => sp.field && sp.values.length > 0),
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
