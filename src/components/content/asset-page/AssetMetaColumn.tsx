import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { AssetTitle } from '@/components/content/AssetTitle'
import {
  ASSET_KIND_ICON,
  assetKindNoun,
} from '@/components/content/assetKindIcons'
import { useAudioStatus } from '@/hooks/useContent'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { cn } from '@/lib'
import { metaStatus, type MetaStatus } from '@/lib/assetAnalysis'
import { extentLabel } from '@/lib/assetExtent'
import { assetKind } from '@/lib/assetKind'
import { formatBytes, isTerminalStatus } from '@/lib/assetStatus'
import { formatDate, formatNumber } from '@/lib/intl'
import { relativeTime } from '@/lib/relativeTime'
import type { SheetSummary } from '@/lib/sheetChunks'
import { pageUrlLabel } from '@/lib/webPageUrl'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { Asset, AudioStatus } from '@/types/content'
import { MetaCampaigns } from './MetaCampaigns'

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
 *
 * Sticky beside the right column on a wide screen, so the player and the
 * title stay in reach while the insights scroll. Narrower, it stacks above
 * them, its picture cropped and its campaigns and tags side by side, so the
 * insights are not a screen away.
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
  const kind = assetKind(asset)
  const KindIcon = ASSET_KIND_ICON[kind]
  // `''` keeps the query off for everything but a recording.
  const run = useAudioStatus(kind === 'audio' ? asset.id : '', {
    assetSettled: isTerminalStatus(asset.status),
  })
  const workspaceLens = lenses.find((l) => l.campaign_id === null)
  const status = metaStatus(asset, workspaceLens)

  const kindLine = kindFacts(t, asset, i18n.language, sheets, run.data)

  const addedBy = memberName(t, members.data, asset.created_by)
  const language = languageName(workspaceLens?.language, i18n.language)

  return (
    <aside className="flex w-full flex-col bg-primary lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:w-[360px] lg:shrink-0 lg:overflow-y-auto">
      <div
        className={cn(
          'overflow-hidden lg:max-h-none',
          kind !== 'audio' && 'max-h-56',
        )}
      >
        {stage}
      </div>
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
              {statusText(
                t,
                status,
                asset,
                workspaceLens,
                run.data,
                i18n.language,
              )}
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
          {asset.file?.original_name ? (
            <Fact label={t('assetInsights.meta.file')}>
              <span className="break-all">{asset.file.original_name}</span>
            </Fact>
          ) : (
            asset.source_url && (
              <Fact label={t('assetInsights.meta.source')}>
                <a
                  href={asset.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all text-accent hover:underline"
                >
                  {pageUrlLabel(asset.source_url)}
                </a>
              </Fact>
            )
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
          <MetaCampaigns assetId={asset.id} lenses={lenses} />

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

/**
 * "PDF · 24 pages · 3.2 MB", "recording · 42 min · M4A", "image · 1200 × 800
 * · PNG · 340 KB", "web page · acme.com" — what the kind line says, per kind.
 */
function kindFacts(
  t: TFunction,
  asset: Asset,
  locale: string,
  sheets: SheetSummary[] | undefined,
  run: AudioStatus | null | undefined,
): string[] {
  const kind = assetKind(asset)
  const size = asset.file?.size_bytes ?? 0
  const sizeLabel = size > 0 ? formatBytes(size) : null
  const format = fileFormat(asset.file?.original_name)

  if (sheets) {
    const rows = sheets.reduce((sum, s) => sum + (s.rows ?? 0), 0)
    return compact([
      t('assetInsights.sheet.kind'),
      sheets.length > 0
        ? t('assetInsights.sheet.sheets', { count: sheets.length })
        : null,
      rows > 0
        ? t('assetInsights.sheet.rows', {
            count: rows,
            formatted: formatNumber(rows, {}, locale),
          })
        : null,
      sizeLabel,
    ])
  }
  const noun = assetKindNoun(t, kind, 1)
  switch (kind) {
    case 'audio': {
      const ms = run?.extraction.source_duration_ms ?? 0
      return compact([
        noun,
        ms > 0
          ? t('assetInsights.meta.minutes', {
              count: Math.max(1, Math.round(ms / 60_000)),
            })
          : null,
        format,
      ])
    }
    case 'image': {
      const { width = 0, height = 0 } = asset.file ?? {}
      return compact([
        noun,
        width > 0 && height > 0 ? `${width} × ${height}` : null,
        format,
        sizeLabel,
      ])
    }
    case 'page':
      return compact([
        noun,
        asset.source_url ? pageUrlLabel(asset.source_url) : null,
        extentLabel(t, asset, locale),
      ])
    case 'document':
      return compact([noun, format, sizeLabel])
    default: {
      const extent = extentLabel(t, asset, locale)
      return compact([noun, extent, sizeLabel !== extent ? sizeLabel : null])
    }
  }
}

function compact(parts: (string | null)[]): string[] {
  return parts.filter((p): p is string => Boolean(p))
}

/** "M4A" from "call.m4a". */
function fileFormat(name: string | undefined): string | null {
  const dot = name?.lastIndexOf('.') ?? -1
  return name && dot > 0 && dot < name.length - 1
    ? name.slice(dot + 1).toUpperCase()
    : null
}

/**
 * The status line's words. While a recording is being transcribed it says
 * how far the run is, and a page still being fetched says so, because those
 * waits are long enough that "reading" stops being an answer.
 */
function statusText(
  t: TFunction,
  status: MetaStatus,
  asset: Asset,
  workspaceLens: AssetAnalysis | undefined,
  run: AudioStatus | null | undefined,
  locale: string,
): string {
  if (status === 'reading') {
    if (run?.extraction.status === 'transcribing' && run.segments.length > 0) {
      return t('assetInsights.meta.status.transcribing', {
        done: run.segments.filter((s) => s.status === 'done').length,
        total: run.segments.length,
      })
    }
    if (asset.type === 'URL') return t('assetInsights.meta.status.fetching')
  }
  return t(`assetInsights.meta.status.${status}`, {
    when: relativeTime(workspaceLens?.analyzed_at, new Date(), locale) ?? '',
  })
}

/**
 * Who added it. A membership that no longer resolves is someone who has left
 * the workspace — said as such once the list has loaded, rather than nothing.
 */
function memberName(
  t: TFunction,
  members: { id: string; name: string }[] | undefined,
  id: string,
): string | null {
  if (!members || !id) return null
  return (
    members.find((m) => m.id === id)?.name ??
    t('assetInsights.meta.formerMember')
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
