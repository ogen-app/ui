/**
 * Human-readable labels for the assistant's tools, in running and completed
 * tense, for the thinking timeline. Mirrors the CON-42 prototype's vocabulary.
 *
 * Labels are worded at render time from the step's tool and input, never
 * stored: a label baked into the store would freeze whichever language the
 * turn ran in.
 */
import type { TFunction } from 'i18next'
import { i18next } from '@/i18n'
import type { AssistantStep, AssistantThread } from '@/types/assistant'

type ToolInput = Record<string, unknown> | undefined

/** Tools with a catalogue entry under `assistant.tool`. */
const SIMPLE_TOOLS = new Set([
  'listAssets',
  'getCurrentContent',
  'runContentPlan',
  'enrichBrief',
  'setCampaignDates',
  'redistributePosts',
  'checkBrief',
  'checkPostsConsistency',
  'getCampaignOverview',
  'listCampaignPosts',
  'getCampaignBrief',
  // The universal assistant's core and packs (CON-450–457).
  'findIdeas',
  'findDuplicateIdeas',
  'setIdeaVerdict',
  'setIdeaVerdicts',
  'compileIdeas',
  'draftIdeas',
  'moveIdeas',
  'deleteIdeas',
  'mergeIdeas',
  'findAssets',
  'askAssets',
  'analyseAsset',
  'distillMoreIdeas',
  'importPage',
  'tagAssets',
  'attachAssets',
  'checkCalendar',
  'optimiseCalendar',
  'applyCalendarMoves',
  'reviewCampaign',
  'analyticsOverview',
  'topPosts',
  'analyticsLessons',
  'postStats',
  'moreLikeThese',
  'getBrand',
  'addFact',
  'updateFact',
  'removeFact',
  'activityReport',
  'workspaceSetup',
  'navigate',
  'setFilter',
  'select',
  'openSavedView',
  'getSelection',
  'getFocus',
  'loadPack',
  'confirmOffer',
  'dismissOffer',
  'updateCampaignPlatforms',
  'draftPost',
  'editPost',
  'clonePost',
  'restoreVersion',
  'createNote',
  'schedulePost',
  'askCampaignAssets',
])

export function describeTool(
  t: TFunction,
  name: string,
  input: ToolInput,
  status: 'running' | 'done',
): string {
  // The post flow reports this one under two names.
  const tool = name === 'getCurrentDescription' ? 'getCurrentContent' : name
  if (SIMPLE_TOOLS.has(tool)) {
    return t(
      `assistant.tool.${tool}.${status}` as 'assistant.tool.listAssets.done',
    )
  }
  switch (tool) {
    case 'getAssetChunks':
      return t(`assistant.tool.getAssetChunks.${status}`, {
        target: chunkTarget(t, input),
      })
    case 'searchAssetChunks':
      return t(`assistant.tool.searchAssetChunks.${status}`, {
        asset: asset(t, input?.assetId),
        query: query(t, input?.query),
      })
    case 'generatePosts': {
      const platform = input?.platformId ?? input?.platform
      return typeof platform === 'string' && platform
        ? t(`assistant.tool.generatePostsFor.${status}`, { platform })
        : t(`assistant.tool.generatePosts.${status}`)
    }
    default:
      // A tool this build has no words for yet still gets a row, with its
      // name spelled out — better than a gap, and better than `findIdeas`.
      return sentenceCase(humanizeStep(name))
  }
}

/** A step's label, in the active language. */
export function stepLabel(t: TFunction, step: AssistantStep): string {
  if (step.kind === 'plan') return t('assistant.step.plan')
  if (step.kind === 'compose') return t('assistant.step.compose')
  return describeTool(
    t,
    step.tool ?? '',
    step.input,
    // A failed step keeps the tense of what it set out to do: "Deleted ideas"
    // with a check beside it would report a change that never happened.
    step.endedAt === null || step.failed ? 'running' : 'done',
  )
}

/**
 * A step's live sub-flow note: a running count while posts land, else the
 * sub-flow's own step key. Step keys are the server's, so they are humanised
 * rather than translated.
 */
export function stepDetail(
  t: TFunction,
  step: AssistantStep,
): string | undefined {
  if (step.failed) return t('assistant.step.failed')
  if (step.generated)
    return t('assistant.step.generated', { count: step.generated })
  return step.progress ? humanizeStep(step.progress) : undefined
}

function chunkTarget(t: TFunction, input: ToolInput): string {
  if (!input) return t('assistant.toolTarget.anAsset')
  const target = asset(t, input.assetId)
  const ids = Array.isArray(input.chunkIds) ? input.chunkIds : []
  if (ids.length === 0)
    return t('assistant.toolTarget.allOf', { asset: target })
  return t('assistant.toolTarget.chunks', { count: ids.length, asset: target })
}

function asset(t: TFunction, id: unknown): string {
  return typeof id === 'string' && id
    ? t('assistant.toolTarget.asset', { id })
    : t('assistant.toolTarget.anAsset')
}

function query(t: TFunction, q: unknown): string {
  if (typeof q !== 'string' || !q) return t('assistant.toolTarget.anyContent')
  return t('assistant.toolTarget.query', {
    query: q.length > 48 ? `${q.slice(0, 48)}…` : q,
  })
}

/**
 * What a thread is called: the subject it is attached to, never the thread
 * itself. Shared by the list and by the toast a finished turn raises, so the
 * notification names the row the user will go looking for.
 */
export function threadName(thread: AssistantThread): string {
  if (thread.subject.kind === 'workspace') {
    return i18next.t('assistant.workspaceThread')
  }
  if (thread.subject.kind === 'campaign') {
    return (
      thread.campaignTitle.trim() || i18next.t('assistant.untitledCampaign')
    )
  }
  return thread.title.trim() || i18next.t('assistant.untitledPost')
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
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
