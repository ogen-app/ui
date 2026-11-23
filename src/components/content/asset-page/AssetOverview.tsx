import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  ArrowSquareOutIcon,
  CalendarBlankIcon,
  ClockCounterClockwiseIcon,
  FigmaLogoIcon,
  GlobeIcon,
  ImagesIcon,
  PaperclipIcon,
  TableIcon,
  TagIcon,
  TranslateIcon,
  UserIcon,
} from '@phosphor-icons/react'
import {
  Mark,
  Marked,
  SettingList,
  SettingRow,
} from '@/components/posts/quickBar/parts'
import { SideSection } from '@/components/page-primitives/SideColumn'
import {
  ASSET_KIND_ICON,
  assetKindNoun,
} from '@/components/content/assetKindIcons'
import { useAudioStatus } from '@/hooks/useContent'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { cn } from '@/lib'
import {
  coversAnything,
  metaStatus,
  type MetaStatus,
} from '@/lib/assetAnalysis'
import { extentLabel } from '@/lib/assetExtent'
import { assetKind } from '@/lib/assetKind'
import { formatBytes, isTerminalStatus } from '@/lib/assetStatus'
import { formatDate, formatNumber } from '@/lib/intl'
import { relativeTime } from '@/lib/relativeTime'
import type { SheetSummary } from '@/lib/sheetChunks'
import { pageUrlLabel } from '@/lib/webPageUrl'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import type { Asset, AudioStatus, FigmaOriginRef } from '@/types/content'
import { MetaCampaigns } from './MetaCampaigns'
import { ValueLine, ValueLines } from './ValueLines'
import { WhatItCovers } from './WhatItCovers'

type Props = {
  asset: Asset
  lenses: AssetAnalysis[]
  /** The reading the main column shows, once it is ready — what it covers. */
  current: AssetAnalysis | undefined
  /** The campaign whose reading is open, marked among the campaigns. */
  openCampaignId: string | null
  /** The asset's picture — a PDF's cover, a page's hero, a sheet's grid. */
  stage: ReactNode
  sheets?: SheetSummary[]
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
 * Everything known about the asset, beside the reading — the page's side
 * column, the post editor's Overview tab for a document:
 *
 *   - its **picture** edge to edge, where it has one worth a look;
 *   - **About** — what kind of thing it is, where it stands, its campaigns
 *     with their fit (and the way to add it to another), who added it and
 *     when, the file or the address, the sheets, the language, its tags;
 *   - **What it covers** — the reading's topics and mentions, once it has
 *     them: context for the ideas rather than something to act on.
 *
 * Both are the post's two columns (`SettingList`), and every value starts
 * with its 16px mark, so the values read straight down the column. A value
 * of several items — campaigns, tags, topics — takes a line per item.
 *
 * There is no index of the main column's cards: there are three, a scroll
 * apart, and the Ideas card says itself how many wait.
 */
export function AssetOverview({
  asset,
  lenses,
  current,
  openCampaignId,
  stage,
  sheets,
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
  const when = (iso: string) =>
    formatDate(iso, { dateStyle: 'medium', timeStyle: 'short' }, i18n.language)

  return (
    <div className="flex flex-col">
      {/* Each stage crops itself and owns its fade, so nothing here cuts it. */}
      {stage && <div className="shrink-0">{stage}</div>}
      <div className="flex flex-col px-3 pb-6 lg:px-6">
        <SideSection title={t('assetInsights.overview.about')} first>
          <SettingList>
            <SettingRow label={t('assetInsights.overview.kind')}>
              <KindIcon
                className="size-4 shrink-0 text-tertiary-foreground"
                aria-hidden
              />
              <span className="min-w-0 truncate">{kindLine.join(' · ')}</span>
            </SettingRow>
            <SettingRow label={t('assetInsights.overview.status')}>
              <span className="flex size-4 shrink-0 items-center justify-center">
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', STATUS_DOT[status])}
                />
              </span>
              <span className="min-w-0">
                {statusText(
                  t,
                  status,
                  asset,
                  workspaceLens,
                  run.data,
                  i18n.language,
                )}
              </span>
            </SettingRow>
            <SettingRow label={t('assetInsights.meta.campaigns')}>
              <MetaCampaigns
                assetId={asset.id}
                lenses={lenses}
                openCampaignId={openCampaignId}
              />
            </SettingRow>
            {addedBy && (
              <SettingRow label={t('assetInsights.meta.addedBy')}>
                <Marked mark={<UserIcon />}>{addedBy}</Marked>
              </SettingRow>
            )}
            <SettingRow label={t('assetInsights.meta.added')}>
              <Marked mark={<CalendarBlankIcon />}>
                {when(asset.created_at)}
              </Marked>
            </SettingRow>
            {asset.file?.original_name ? (
              <SettingRow label={t('assetInsights.meta.file')}>
                <ValueLines>
                  <ValueLine mark={<PaperclipIcon />}>
                    {asset.file.original_name}
                  </ValueLine>
                </ValueLines>
              </SettingRow>
            ) : (
              asset.source_url && (
                <SettingRow label={t('assetInsights.meta.source')}>
                  <Mark>
                    <GlobeIcon />
                  </Mark>
                  <a
                    href={asset.source_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={asset.source_url}
                    className="flex min-w-0 items-center gap-1.5 text-accent hover:underline"
                  >
                    <span className="truncate">
                      {pageUrlLabel(asset.source_url)}
                    </span>
                    <ArrowSquareOutIcon
                      aria-hidden
                      className="size-3.5 shrink-0"
                    />
                  </a>
                </SettingRow>
              )
            )}
            {kind === 'page' && (
              // There is no scrape timestamp on the asset: `updated_at` moves
              // on a re-read and on an edit alike, so it is named as an update.
              <SettingRow label={t('assetInsights.meta.updated')}>
                <Marked mark={<ClockCounterClockwiseIcon />}>
                  {when(asset.updated_at)}
                </Marked>
              </SettingRow>
            )}
            {kind === 'page' && (asset.images?.length ?? 0) > 0 && (
              <SettingRow label={t('assetInsights.meta.images')}>
                <Marked mark={<ImagesIcon />}>
                  {formatNumber(asset.images?.length ?? 0, {}, i18n.language)}
                </Marked>
              </SettingRow>
            )}
            {sheets && sheets.length > 0 && (
              <SettingRow label={t('assetInsights.sheet.fact')}>
                <ValueLines>
                  <ValueLine mark={<TableIcon />}>
                    {sheetNames(sheets, (count) =>
                      t('assetInsights.sheet.moreSheets', { count }),
                    )}
                  </ValueLine>
                </ValueLines>
              </SettingRow>
            )}
            {language && (
              <SettingRow label={t('assetInsights.meta.language')}>
                <Marked mark={<TranslateIcon />}>{language}</Marked>
              </SettingRow>
            )}
            {asset.origin === 'figma' && (
              <SettingRow label={t('assetInsights.overview.from')}>
                <FromFigma frame={asset.origin_ref ?? null} />
              </SettingRow>
            )}
            {asset.tags.length > 0 && (
              <SettingRow label={t('assetInsights.meta.tags')}>
                <ValueLines>
                  {asset.tags.map((tag) => (
                    <ValueLine key={tag.id} mark={<TagIcon />}>
                      {tag.name}
                    </ValueLine>
                  ))}
                </ValueLines>
              </SettingRow>
            )}
          </SettingList>
        </SideSection>

        {current && coversAnything(current, sheets) && (
          <SideSection title={t('assetInsights.covers')}>
            <WhatItCovers lens={current} sheets={sheets} />
          </SideSection>
        )}
      </div>
    </div>
  )
}

/** A Figma frame's import: the mark, then the frame and the file it is in. */
function FromFigma({ frame }: { frame: FigmaOriginRef | null }) {
  const { t } = useTranslation()
  const where = [frame?.node_name, frame?.file_name].filter(Boolean).join(' · ')
  return (
    <span
      title={where || undefined}
      className="flex min-w-0 items-center gap-1.5"
    >
      <FigmaLogoIcon
        aria-hidden
        className="size-4 shrink-0 text-tertiary-foreground"
      />
      <span className="shrink-0">{t('content.figmaOrigin.chip')}</span>
      {where && (
        <span className="truncate text-secondary-foreground">{where}</span>
      )}
    </span>
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
