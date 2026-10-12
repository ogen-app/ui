import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { AssetTitle } from '@/components/content/AssetTitle'
import {
  ASSET_KIND_ICON,
  assetKindNoun,
} from '@/components/content/assetKindIcons'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { cn } from '@/lib'
import { metaStatus, type MetaStatus } from '@/lib/assetAnalysis'
import { extentLabel } from '@/lib/assetExtent'
import { assetKind } from '@/lib/assetKind'
import { formatBytes } from '@/lib/assetStatus'
import { formatDate, formatNumber } from '@/lib/intl'
import { relativeTime } from '@/lib/relativeTime'
import type { SheetSummary } from '@/lib/sheetChunks'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { Asset } from '@/types/content'
import { CampaignMark } from './CampaignMark'

type Props = {
  asset: Asset
  lenses: AssetAnalysis[]
  /** The picture at the top — `AssetStage`. */
  stage: ReactNode
  /**
   * A spreadsheet's sheets, as far as they are loaded (§5.4) — the kind line
   * counts them and their rows, and a Sheets fact names them.
   */
  sheets?: SheetSummary[]
  onTitleChange: (title: string) => void
  onDirty: () => void
}

const STATUS_DOT: Record<MetaStatus, string> = {
  reading: 'bg-tertiary-foreground animate-pulse',
  unreadable: 'bg-destructive',
  analysing: 'bg-accent animate-pulse',
  analysed: 'bg-accent',
  analysisFailed: 'bg-destructive',
  notAnalysed: 'bg-tertiary-foreground',
  ready: 'bg-accent',
}

/**
 * The left column of the asset page (CON-366): what the asset is, as opposed
 * to what it says. The picture, the kind, the title — the one thing here a
 * person edits — where the reading has got to, who added it and when, the
 * campaigns it serves and its tags.
 */
export function AssetMetaColumn({
  asset,
  lenses,
  stage,
  sheets,
  onTitleChange,
  onDirty,
}: Props) {
  const { t, i18n } = useTranslation()
  const members = useWorkspaceMembers()
  const campaigns = useCampaigns()
  const kind = assetKind(asset)
  const KindIcon = ASSET_KIND_ICON[kind]
  const workspaceLens = lenses.find((l) => l.campaign_id === null)
  const status = metaStatus(asset, workspaceLens)

  const extent = extentLabel(t, asset, i18n.language)
  const size = asset.file?.size_bytes ?? 0
  const sizeLabel = size > 0 ? formatBytes(size) : null
  const sheetRows = sheets?.reduce((sum, s) => sum + (s.rows ?? 0), 0) ?? 0
  const kindLine = (
    sheets
      ? [
          t('assetInsights.sheet.kind'),
          sheets.length > 0
            ? t('assetInsights.sheet.sheets', { count: sheets.length })
            : null,
          sheetRows > 0
            ? t('assetInsights.sheet.rows', {
                count: sheetRows,
                formatted: formatNumber(sheetRows, {}, i18n.language),
              })
            : null,
          sizeLabel,
        ]
      : [
          assetKindNoun(t, kind, 1),
          extent,
          sizeLabel !== extent ? sizeLabel : null,
        ]
  ).filter(Boolean)

  const addedBy = members.data?.find((m) => m.id === asset.created_by)?.name
  const language = languageName(workspaceLens?.language, i18n.language)
  const memberOf = (campaigns.data ?? []).filter((c) =>
    c.asset_ids.includes(asset.id),
  )

  return (
    <aside className="flex w-full flex-col overflow-hidden bg-primary lg:w-[360px] lg:shrink-0">
      {stage}
      <div className="flex flex-col gap-6 px-8 pt-6 pb-8">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
            <KindIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{kindLine.join(' · ')}</span>
          </p>
          <AssetTitle
            initialTitle={asset.title}
            onChange={onTitleChange}
            onDirty={onDirty}
            className="text-[28px] leading-tight"
          />
          <p className="flex items-center gap-2 text-xs text-tertiary-foreground">
            <span
              aria-hidden
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                STATUS_DOT[status],
              )}
            />
            <span>
              {t(`assetInsights.meta.status.${status}`, {
                when:
                  relativeTime(
                    workspaceLens?.analyzed_at,
                    new Date(),
                    i18n.language,
                  ) ?? '',
              })}
            </span>
          </p>
        </div>

        <dl className="grid grid-cols-[96px_1fr] gap-x-4 gap-y-2 border-t border-quaternary pt-5 text-sm">
          {addedBy && (
            <Fact label={t('assetInsights.meta.addedBy')}>{addedBy}</Fact>
          )}
          <Fact label={t('assetInsights.meta.added')}>
            {formatDate(
              asset.created_at,
              { dateStyle: 'medium', timeStyle: 'short' },
              i18n.language,
            )}
          </Fact>
          {asset.file?.original_name && (
            <Fact label={t('assetInsights.meta.file')}>
              <span className="break-all">{asset.file.original_name}</span>
            </Fact>
          )}
          {sheets && sheets.length > 0 && (
            <Fact label={t('assetInsights.sheet.fact')}>
              {sheetNames(sheets, (count) =>
                t('assetInsights.sheet.moreSheets', { count }),
              )}
            </Fact>
          )}
          {language && (
            <Fact label={t('assetInsights.meta.language')}>{language}</Fact>
          )}
        </dl>

        {asset.file?.url && (
          <Button variant="outline" className="self-start uppercase" asChild>
            <a href={asset.file.url} download={asset.file.original_name}>
              <DownloadSimpleIcon />
              <span>{t('assetInsights.meta.download')}</span>
            </a>
          </Button>
        )}

        <section className="flex flex-col gap-3 border-t border-quaternary pt-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
            {t('assetInsights.meta.campaigns')}
          </h2>
          {memberOf.length === 0 ? (
            <p className="text-sm text-tertiary-foreground">
              {t('assetInsights.meta.noCampaigns')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {memberOf.map((c) => {
                const score = lenses.find((l) => l.campaign_id === c.id)
                  ?.relevance?.score
                return (
                  <li key={c.id}>
                    <Link
                      to="/campaigns/$campaignId/assets/$assetId"
                      params={{ campaignId: c.id, assetId: asset.id }}
                      className="flex items-center gap-3 rounded-md py-1 text-sm text-foreground hover:text-primary-foreground"
                    >
                      <CampaignMark id={c.id} name={c.name} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {score !== undefined && (
                        <span className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
                          {t('assetInsights.fit', {
                            score: formatNumber(score, {}, i18n.language),
                          })}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {asset.tags.length > 0 && (
          <section className="flex flex-col gap-3 border-t border-quaternary pt-5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
              {t('assetInsights.meta.tags')}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {asset.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="rounded-full bg-tertiary px-3 py-1 text-xs text-secondary-foreground"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-tertiary-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </>
  )
}

/** "Pipeline, Regions, Targets", and "+N more" past four. */
function sheetNames(
  sheets: SheetSummary[],
  more: (count: number) => string,
): string {
  const names = sheets.slice(0, 4).map((s) => s.name)
  if (sheets.length > 4) names.push(more(sheets.length - 4))
  return names.join(', ')
}

/** "English" for `en`, in the reader's language; null when unknown. */
function languageName(code: string | undefined, locale: string): string | null {
  if (!code) return null
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? null
    )
  } catch {
    return null
  }
}
