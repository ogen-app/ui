import type { AssetPassage } from '@/types/assistant'
import { isRecord } from './json'

/**
 * Where in an asset an idea came from (CON-487), as `getIdea.sourceAsset` and
 * a trail's asset carry it: the passage's fields sit flat beside the asset's
 * `id` and `title`. Undefined when the asset says nothing about one — an
 * idea older than the locator, or from a web page or note, whose text is cut
 * into parts rather than chunks.
 */
export function parsePassage(raw: unknown): AssetPassage | undefined {
  if (!isRecord(raw)) return undefined
  const label = typeof raw.label === 'string' ? raw.label.trim() : ''
  const n = (key: string) =>
    typeof raw[key] === 'number' && Number.isFinite(raw[key])
      ? (raw[key] as number)
      : undefined
  const passage: AssetPassage = {
    ...(typeof raw.chunkId === 'string' && raw.chunkId
      ? { chunkId: raw.chunkId }
      : {}),
    ...(label ? { label } : {}),
    ...(n('page') !== undefined ? { page: n('page') } : {}),
    ...(n('pageEnd') !== undefined ? { pageEnd: n('pageEnd') } : {}),
    ...(n('slide') !== undefined ? { slide: n('slide') } : {}),
    ...(n('startMs') !== undefined ? { startMs: n('startMs') } : {}),
    ...(n('endMs') !== undefined ? { endMs: n('endMs') } : {}),
  }
  return passage.label || passage.page !== undefined ? passage : undefined
}
