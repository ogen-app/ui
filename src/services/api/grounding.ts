import type { Grounding, GroundingSource } from '@/types/assistant'
import { isRecord } from './json'

/**
 * A generating tool's `grounding` (CON-448, CON-469), read once for every
 * pack: `grounded` or `exploratory`, and the sources it drew on — the asset,
 * and, when known, the analysis and the idea it reached the output through.
 *
 * Absent is its own answer, never "not grounded": a draft written from pasted
 * material has no sources anyone knows of, and the server leaves the field
 * out rather than guess. So this is `undefined` then, and the card shows no
 * sources line at all.
 */
export function parseGrounding(value: unknown): Grounding | undefined {
  if (!isRecord(value)) return undefined
  if (value.mode !== 'grounded' && value.mode !== 'exploratory')
    return undefined
  return { mode: value.mode, sources: groundingSources(value.sources) }
}

function groundingSources(value: unknown): GroundingSource[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map((s) => ({
      id: text(s.id),
      title: text(s.title),
      ...(text(s.analysisId) ? { analysisId: text(s.analysisId) } : {}),
      ...(text(s.ideaId) ? { ideaId: text(s.ideaId) } : {}),
      ...(s.kind === 'post' ? { kind: 'post' as const } : {}),
    }))
    .filter((s) => s.id || s.title)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
