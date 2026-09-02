/**
 * Human-readable labels for the assistant's tools, in running and completed
 * tense, for the thinking timeline. Mirrors the CON-42 prototype's vocabulary.
 */
import { i18next } from '@/i18n'
import type { AssistantThread } from '@/types/assistant'

type ToolInput = Record<string, unknown> | undefined

const TOOL_LABELS: Record<
  string,
  { running: (i: ToolInput) => string; done: (i: ToolInput) => string }
> = {
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

  // Campaign assistant (CON-112 and its sub-issues). The four mutating tools
  // write as they run, so their done-tense is a statement of fact.
  runContentPlan: {
    running: () => 'Generating a content plan',
    done: () => 'Generated a content plan',
  },
  generatePosts: {
    running: (i) => `Adding posts${platformSuffix(i)}`,
    done: (i) => `Added posts${platformSuffix(i)}`,
  },
  enrichBrief: {
    running: () => 'Improving the brief',
    done: () => 'Improved the brief',
  },
  setCampaignDates: {
    running: () => 'Updating the campaign dates',
    done: () => 'Updated the campaign dates',
  },
  redistributePosts: {
    running: () => 'Redistributing posts across the timeline',
    done: () => 'Redistributed posts across the timeline',
  },
  checkBrief: {
    running: () => 'Reviewing the brief',
    done: () => 'Reviewed the brief',
  },
  checkPostsConsistency: {
    running: () => 'Checking posts against the brief',
    done: () => 'Checked posts against the brief',
  },
  getCampaignOverview: {
    running: () => 'Building the campaign overview',
    done: () => 'Built the campaign overview',
  },
  listCampaignPosts: {
    running: () => 'Reading the campaign posts',
    done: () => 'Read the campaign posts',
  },
  getCampaignBrief: {
    running: () => 'Reading the campaign brief',
    done: () => 'Read the campaign brief',
  },
}

/** ` for Threads` when the model targeted one platform, else nothing. */
function platformSuffix(input: ToolInput): string {
  const platform = input?.platformId ?? input?.platform
  return typeof platform === 'string' && platform ? ` for ${platform}` : ''
}

export function describeTool(
  name: string,
  input: ToolInput,
  status: 'running' | 'done',
): string {
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

/**
 * What a thread is called: the subject it is attached to, never the thread
 * itself. Shared by the list and by the toast a finished turn raises, so the
 * notification names the row the user will go looking for.
 */
export function threadName(thread: AssistantThread): string {
  if (thread.subject.kind === 'campaign') {
    return (
      thread.campaignTitle.trim() || i18next.t('assistant.untitledCampaign')
    )
  }
  return thread.title.trim() || i18next.t('assistant.untitledPost')
}

/** Turns a sub-flow step key (`resolveTargets`, `build_context`) into a phrase. */
export function humanizeStep(step: string): string {
  return step
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim()
}

/**
 * Elapsed time at the precision the reader can act on. The audience is
 * marketers waiting for a turn to finish, not anyone profiling it: milliseconds
 * and tenths implied a meaning they never had, so a second is the floor and
 * everything rounds to whole units.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  if (ms < 1000) return '<1s'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${mins}m` : `${mins}m ${rest}s`
}
