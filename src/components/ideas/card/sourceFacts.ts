import type { TFunction } from 'i18next'
import type { IdeaSourceAsset } from '@/lib/ideas'

/**
 * What a source document is, as words: its kind, its size and — when asked —
 * the reading that wrote the idea. "PDF · 7 pages · read for Beekeeping".
 * The opened card's Source section and a source band both say it.
 */
export function sourceFacts(
  t: TFunction,
  asset: IdeaSourceAsset,
  { reading = false }: { reading?: boolean } = {},
): string {
  return [
    asset.kind && t(`content.list.kind.${asset.kind}`),
    asset.pageCount != null &&
      t('ideas.card.source.pages', { count: asset.pageCount }),
    asset.durationMs != null &&
      asset.durationMs > 0 &&
      t('ideas.card.source.minutes', {
        count: Math.max(1, Math.round(asset.durationMs / 60_000)),
      }),
    asset.domain,
    reading &&
      (asset.reading
        ? t('ideas.card.source.readFor', {
            campaign: asset.reading.campaignName,
          })
        : t('ideas.card.source.readForWorkspace')),
  ]
    .filter(Boolean)
    .join(' · ')
}
