import type {
  Grounding,
  IdeaBrief,
  IdeasChanged,
  IdeasResults,
  IdeasShared,
} from '@/types/assistant'
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
      ? { ideas: briefs(found.ideas), total: num(found.total) }
      : undefined,
    decided:
      decided && brief(decided.idea)
        ? { idea: brief(decided.idea)!, undoId: optStr(decided.undoId) }
        : undefined,
    decidedMany: changed(r.setIdeaVerdicts),
    moved: changed(r.moveIdeas),
    deleted: changed(r.deleteIdeas),
    compiled:
      compiled && str(compiled.postId)
        ? {
            postId: str(compiled.postId),
            title: str(compiled.title),
            campaignId: str(compiled.campaignId),
            platformId: optStr(compiled.platformId),
            ideas: num(compiled.ideas),
            grounding: grounding(compiled.grounding),
            undoId: optStr(compiled.undoId),
          }
        : undefined,
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
    merged:
      merged && brief(merged.idea)
        ? {
            idea: brief(merged.idea)!,
            deleted: strings(merged.deleted).length,
          }
        : undefined,
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
): NonNullable<IdeasResults['drafted']>['posts'][number] | null {
  const id = str(raw.postId)
  if (!id) return null
  return {
    postId: id,
    title: str(raw.title),
    platformId: str(raw.platformId),
    grounding: grounding(raw.grounding),
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
    campaignId: optStr(i.campaignId),
    fitScore: typeof i.fitScore === 'number' ? i.fitScore : undefined,
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

/** Exploratory unless the result names what grounds it (CON-448). */
function grounding(raw: unknown): Grounding {
  const g = record(raw)
  const sources = list(g?.sources)
    .map((s) => ({ id: str(s.id), title: str(s.title) }))
    .filter((s) => s.id || s.title)
  return {
    mode:
      g?.mode === 'grounded' && sources.length > 0 ? 'grounded' : 'exploratory',
    sources,
  }
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
