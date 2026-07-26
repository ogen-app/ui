/**
 * Human-readable labels for the assistant's tools, in running and completed
 * tense, for the thinking timeline. Mirrors the CON-42 prototype's vocabulary.
 */
type ToolInput = Record<string, unknown> | undefined

const TOOL_LABELS: Record<string, { running: (i: ToolInput) => string; done: (i: ToolInput) => string }> = {
  listAssets: {
    running: () => 'Listing attached assets',
    done: () => 'Listed attached assets',
  },
  getAssetChunks: {
    running: (i) => `Reading ${chunkTarget(i)}`,
    done: (i) => `Read ${chunkTarget(i)}`,
  },
  searchAssetChunks: {
    running: (i) => `Searching ${asset(i?.assetId)} for ${query(i?.query)}`,
    done: (i) => `Searched ${asset(i?.assetId)} for ${query(i?.query)}`,
  },
  getCurrentContent: {
    running: () => 'Re-reading the current post',
    done: () => 'Re-read the current post',
  },
  getCurrentDescription: {
    running: () => 'Re-reading the current post',
    done: () => 'Re-read the current post',
  },
}

export function describeTool(name: string, input: ToolInput, status: 'running' | 'done'): string {
  const entry = TOOL_LABELS[name]
  // An unrecognised tool still gets a row — better a raw name than a gap.
  if (!entry) return name
  return status === 'done' ? entry.done(input) : entry.running(input)
}

function chunkTarget(input: ToolInput): string {
  if (!input) return 'an asset'
  const target = asset(input.assetId)
  const ids = Array.isArray(input.chunkIds) ? input.chunkIds : []
  if (ids.length === 0) return `all of ${target}`
  if (ids.length === 1) return `1 chunk of ${target}`
  return `${ids.length} chunks of ${target}`
}

function asset(id: unknown): string {
  return typeof id === 'string' && id ? `asset ${id}` : 'an asset'
}

function query(q: unknown): string {
  if (typeof q !== 'string' || !q) return 'content'
  return `"${q.length > 48 ? `${q.slice(0, 48)}…` : q}"`
}

/** Turns a sub-flow step key (`resolveTargets`, `build_context`) into a phrase. */
export function humanizeStep(step: string): string {
  return step
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim()
}

/** Compact elapsed time: sub-second in ms, then seconds, then m:ss. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  if (ms < 950) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  return `${mins}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
