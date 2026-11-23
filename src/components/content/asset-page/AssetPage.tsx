import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  BookOpenTextIcon,
  LayoutIcon,
  LightbulbIcon,
  type Icon,
} from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SideColumn,
  type SideTab,
} from '@/components/page-primitives/SideColumn'
import { AssetTitle } from '@/components/content/AssetTitle'
import { AudioSeekContext, type AudioSeek } from '@/hooks/useAudioSeek'
import {
  useAssetAnalyses,
  useRetryAssetAnalysis,
} from '@/hooks/useAssetAnalyses'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useLensArrival } from '@/hooks/useLensArrival'
import { useAssetChunks } from '@/hooks/useContent'
import { SheetCiteContext, type SheetCite } from '@/hooks/useSheetCite'
import {
  insightState,
  isAnalyzable,
  isEmptyReading,
  isMissingLens,
  lensKey,
  missingLens,
  pickLens,
  readableTitle,
} from '@/lib/assetAnalysis'
import { ASSET_TABS, type AssetTab } from '@/lib/assetTabs'
import { countIdeas } from '@/lib/ideas'
import { ideaFromWire } from '@/services/api/ideas'
import { useSettingsStore } from '@/stores/settingsStore'
import { retrievability } from '@/lib/campaignSources'
import {
  isSpreadsheet,
  parseSheetLabel,
  sheetsFromChunks,
  summarizeSheets,
  type CitedRange,
} from '@/lib/sheetChunks'
import { assetKind } from '@/lib/assetKind'
import { assetPlace, findPlace, type AssetPlace } from '@/lib/assetPlace'
import { documentOutline } from '@/lib/documentOutline'
import type { Asset } from '@/types/content'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { AssetOverviewTab } from './AssetOverviewTab'
import { AssetStage } from './AssetStage'
import { InsightsPanel, type PanelState } from './InsightsPanel'
import { LensPicker } from './LensPicker'
import { OutlineStage } from './OutlineStage'
import { SheetStage } from './SheetStage'
import { SheetView } from './SheetView'

type Props = {
  asset: Asset
  /** The campaign the page was opened through — the default lens. */
  campaignId: string | null
  /** `?lens=` — a campaign id or `workspace`, when the address names one. */
  lens: string | undefined
  onLensChange: (lens: string) => void
  /** `?at=` — a place an idea cites, to go to once (`lib/assetPlace`). */
  at?: string
  /** Drops `?at=` once the page has gone there, so a reload does not again. */
  onPlaceReached?: () => void
  /** The asset's own bar, over the content column (`AssetBar`). */
  bar: ReactNode
  /** Today's screen for this asset, the content column under the title. */
  source: ReactNode
  onTitleChange: (title: string) => void
  onDirty: () => void
}

const noop = () => {}

/** Whether a cited place is found in the content column's text. */
function readsInSource(
  place: AssetPlace | null,
): place is Extract<AssetPlace, { kind: 'page' | 'label' }> {
  return place?.kind === 'page' || place?.kind === 'label'
}

/**
 * The asset page, framed like the post editor (`$postId.tsx`): a content
 * column under the asset's own bar, and a side column of tabs beside it, so
 * the right rail is left to the assistant.
 *
 * The **content column** is the asset itself — its title, edited here and
 * nowhere else, then `assetScreen`'s screen: the editor for a note, the
 * extracted text for a PDF, the transcript under the one player for a
 * recording, the image, a spreadsheet's table. What gets read, and nothing
 * about it.
 *
 * The **side column** is everything about it. **Overview**: its picture, its
 * facts, its campaigns and tags, and a line from each other tab. **Ideas**:
 * the ideas one reading distilled (CON-364), as the Ideas list's cards.
 * **Summary**: the rest of that reading. A reading is one lens at a time —
 * the workspace's, or a campaign's — picked at the top of those two tabs. An
 * image is never analysed, so it has the Overview alone.
 *
 * A spreadsheet's rows read badly as extracted text (§5.4), so it gets a
 * table rebuilt from its row chunks, and an idea's "rows 10–24" chip opens
 * that table on those rows.
 *
 * Nothing here listens for events itself: `asset.analysis.updated` reaches the
 * app's one event stream and invalidates the asset's subtree, which holds the
 * analyses (`lib/eventRouting`). The analyses hook polls slowly while anything
 * is in flight, for the event that never arrives.
 */
export function AssetPage({
  asset,
  campaignId,
  lens,
  onLensChange,
  at,
  onPlaceReached = noop,
  bar,
  source,
  onTitleChange,
  onDirty,
}: Props) {
  const { t } = useTranslation()
  const analyzable = isAnalyzable(asset.type)
  const analyses = useAssetAnalyses(asset.id, {
    assetStatus: asset.status,
    enabled: analyzable,
  })
  const retry = useRetryAssetAnalysis(asset.id)
  // One remembered choice for every asset; an image has the Overview alone.
  const storedTab = useSettingsStore((s) => s.assetTab)
  const setTab = useSettingsStore((s) => s.setAssetTab)
  const tab: AssetTab = analyzable ? storedTab : 'overview'

  const lenses = useMemo(() => analyses.data ?? [], [analyses.data])
  // Every campaign the asset is in gets an entry in the picker — those with
  // no analysis row as stand-ins that say "not analysed" (`missingLens`).
  const campaigns = useCampaigns()
  const lensOptions = useMemo(() => {
    if (!analyses.isSuccess) return lenses
    const analysed = new Set(lenses.map((l) => l.campaign_id))
    const missing = (campaigns.data ?? [])
      .filter((c) => c.asset_ids.includes(asset.id) && !analysed.has(c.id))
      .map((c) => missingLens(asset.id, c))
    return [...lenses, ...missing]
  }, [analyses.isSuccess, lenses, campaigns.data, asset.id])
  const current = pickLens(lensOptions, {
    requested: lens,
    routeCampaignId: campaignId,
  })
  const settled =
    asset.status !== 'failed' && retrievability(asset.status) !== 'waiting'
  const lensState: PanelState = analyses.isError
    ? 'loadFailed'
    : settled &&
        analyses.isSuccess &&
        (lenses.length === 0 || (current && isMissingLens(current)))
      ? 'none'
      : insightState(asset.status, current)
  // A settled reading with nothing in it: the source had no text to read —
  // a note not yet written, an image-only PDF. Said as such, not shown as an
  // empty page.
  const state: PanelState =
    lensState === 'ready' && current && isEmptyReading(current)
      ? 'empty'
      : lensState
  const busy = state === 'reading' || state === 'analysing'

  // A `?lens=` that no longer names a lens — the asset was taken out of that
  // campaign — is dropped from the address once everything has loaded, so
  // the link does not keep promising a reading that is gone.
  const staleLens =
    !!lens &&
    analyses.isSuccess &&
    campaigns.isSuccess &&
    !lensOptions.some((l) => lensKey(l) === lens)
  useEffect(() => {
    if (staleLens) onLensChange('')
  }, [staleLens, onLensChange])

  const arrived = useLensArrival(current)

  // One player for the page: the stage draws it, the right column drives it.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [nowMs, setNowMs] = useState<number | null>(null)
  const seek = useCallback((seconds: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = seconds
    void el.play().catch(() => {
      // Autoplay refused; the seek stands and the play button is right there.
    })
  }, [])
  // Only with a file to play: without one the stage says it is missing, and
  // chips and transcript lines must not pretend they can seek.
  const audioUrl = asset.type === 'AUDIO' ? (asset.file?.url ?? null) : null
  const player = useMemo<AudioSeek | null>(
    () => (audioUrl ? { seek, nowMs } : null),
    [audioUrl, seek, nowMs],
  )

  // A document's chunks — a spreadsheet's sheets, a Word file's or a deck's
  // outline — from the same pages the Source tab reads, one query, so the
  // stage, the facts and the text agree.
  const spreadsheet = isSpreadsheet(asset) && settled
  const isDocument = asset.type === 'DOC' && settled
  // The same query the Source tab reads, also run to find a cited place.
  const chunks = useAssetChunks(asset.id, {
    enabled:
      isDocument || (settled && readsInSource(at ? assetPlace(at) : null)),
  })
  const loadedChunks = useMemo(
    () => chunks.data?.pages.flatMap((p) => p.chunks) ?? [],
    [chunks.data],
  )
  const sheets = useMemo(
    () => (spreadsheet ? sheetsFromChunks(loadedChunks) : []),
    [spreadsheet, loadedChunks],
  )
  const outline = useMemo(
    () => (isDocument && !spreadsheet ? documentOutline(loadedChunks) : null),
    [isDocument, spreadsheet, loadedChunks],
  )
  const fallbackName = withoutExtension(
    asset.file?.original_name ?? asset.title,
  )
  const sheetSummaries = spreadsheet
    ? summarizeSheets(sheets, fallbackName)
    : undefined
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  const [cited, setCited] = useState<CitedRange | null>(null)
  const { fetchNextPage } = chunks
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage])

  const openSheet = useCallback((name: string) => setSelectedSheet(name), [])
  const citer = useMemo<SheetCite | null>(
    () =>
      spreadsheet
        ? {
            cite: (label, by) => {
              const parsed = parseSheetLabel(label)
              if (parsed?.part !== 'rows') return
              setCited({
                sheet: parsed.sheet,
                from: parsed.from,
                to: parsed.to,
                by,
              })
              openSheet(parsed.sheet)
            },
          }
        : null,
    [spreadsheet, openSheet],
  )

  // `?at=` — the place an idea cited (CON-388): the recording plays from it,
  // the sheet opens on its rows, anything else is found in the Source tab
  // once its text has loaded. Once, then the address forgets it.
  const place = useMemo(() => (at ? assetPlace(at) : null), [at])
  useEffect(() => {
    if (!place) return
    if (place.kind === 'time') {
      if (!player) return
      player.seek(place.seconds)
      onPlaceReached()
      return
    }
    if (place.kind === 'rows') {
      if (!citer) return
      citer.cite(place.label, '')
      onPlaceReached()
      return
    }
  }, [place, player, citer, onPlaceReached])

  // A page or a labelled part: looked for in the Source tab's text once each
  // page of it has drawn, loading the next page while it is not there yet —
  // a long document's cited page is rarely in the first. With every page
  // read and nothing found, the address still lets it go, or each reload
  // would search the whole document again.
  const {
    isPending: chunksPending,
    isError: chunksFailed,
    hasNextPage: moreChunks,
    isFetchingNextPage: fetchingChunks,
  } = chunks
  useEffect(() => {
    if (!place || !readsInSource(place)) return
    const frame = requestAnimationFrame(() => {
      const target = findPlace(document, place)
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' })
        onPlaceReached()
        return
      }
      if (chunksPending || fetchingChunks) return
      if (moreChunks && !chunksFailed) void fetchNextPage()
      else onPlaceReached()
    })
    return () => cancelAnimationFrame(frame)
  }, [
    place,
    chunks.data,
    chunksPending,
    chunksFailed,
    moreChunks,
    fetchingChunks,
    fetchNextPage,
    onPlaceReached,
  ])

  const sourceBody = spreadsheet ? (
    <SheetView
      sheets={sheets}
      fallbackName={fallbackName}
      selected={selectedSheet}
      onSelect={setSelectedSheet}
      cited={cited}
      onClearCited={() => setCited(null)}
      loading={chunks.isPending}
      failed={chunks.isError}
      hasMore={chunks.hasNextPage}
      loadingMore={chunks.isFetchingNextPage}
      onLoadMore={loadMore}
      fallback={source}
    />
  ) : (
    source
  )

  // The asset's picture. A recording's is its player — the page's one
  // `<audio>` — so it heads the content column, over the transcript it
  // drives; a cover, a page's hero, a sheet's grid or a document's outline
  // heads the Overview. An image and a note have none: the content column
  // already is the picture, or the words.
  const kind = assetKind(asset)
  const stage =
    spreadsheet && sheets.length > 0 ? (
      <SheetStage
        sheets={sheets}
        fallbackName={fallbackName}
        onOpenSheet={openSheet}
      />
    ) : outline ? (
      <OutlineStage
        outline={outline}
        format={fileFormat(asset.file?.original_name)}
        fileName={asset.file?.original_name ?? null}
      />
    ) : kind === 'image' || kind === 'text' ? null : (
      <AssetStage asset={asset} audioRef={audioRef} onAudioTime={setNowMs} />
    )
  const playerStage = kind === 'audio' ? stage : null
  const overviewStage = kind === 'audio' ? null : stage

  const tabs: SideTab<AssetTab>[] = (
    analyzable ? ASSET_TABS : (['overview'] as const)
  ).map((id) => ({
    id,
    label: t(`assetInsights.tabs.${id}`),
    icon: TAB_ICON[id],
  }))

  // A picker only when there is a reading to switch to: an asset in no
  // campaign has the workspace's alone, and a one-item dropdown is a control
  // with no choice in it.
  const lensLine =
    current &&
    (lensOptions.some((l) => l.campaign_id !== null) ? (
      <LensPicker
        lenses={lensOptions}
        current={current}
        onChange={onLensChange}
      />
    ) : (
      <p className="text-xs/4 text-secondary-foreground">
        {t('assetInsights.lens.workspaceOnly')}
      </p>
    ))

  const insights = (part: 'ideas' | 'summary') => (
    <div className="flex h-full flex-col overflow-y-auto">
      <div
        className="flex flex-col gap-4 px-3 pt-4 pb-6 lg:px-6"
        aria-busy={busy}
      >
        {lensLine}
        {/* Announced, and shown for a moment, when a reading lands while the
            page is open. */}
        {part === 'ideas' && (
          <div aria-live="polite" className="empty:hidden">
            {arrived !== null && (
              <p className="flex items-center gap-2 rounded-md bg-accent/10 px-4 py-3 text-sm font-medium text-foreground motion-safe:animate-in motion-safe:fade-in">
                <span aria-hidden className="size-2 rounded-full bg-accent" />
                {t('assetInsights.arrived', { count: arrived })}
              </p>
            )}
          </div>
        )}
        <InsightsPanel
          state={state}
          part={part}
          lens={current}
          sheets={sheetSummaries}
          authored={kind === 'text'}
          retrying={retry.isPending}
          onRetry={() => retry.mutate(current?.campaign_id ?? null)}
        />
      </div>
    </div>
  )

  return (
    <AudioSeekContext.Provider value={player}>
      <SheetCiteContext.Provider value={citer}>
        <div className="flex min-h-0 flex-1">
          {/* The content column: the asset, and nothing about it — under its
              own bar, level with the side column's tabs. */}
          <div className="flex min-w-0 flex-1 flex-col">
            {bar}
            <ScrollArea
              className="min-h-0 flex-1"
              type="scroll"
              scrollHideDelay={350}
            >
              <div className="flex flex-col gap-3 px-3 pt-4 pb-40 lg:px-6">
                <div className="flex flex-col gap-6 bg-primary px-10 py-8">
                  {/* A file name reads as words until someone renames it. */}
                  <AssetTitle
                    initialTitle={readableTitle(asset.title)}
                    onChange={onTitleChange}
                    onDirty={onDirty}
                  />
                  {playerStage}
                  <div>{sourceBody}</div>
                </div>
              </div>
            </ScrollArea>
          </div>

          <SideColumn
            tabs={tabs}
            current={tab}
            onSelect={setTab}
            label={t('assetInsights.tabs.label')}
            idPrefix="asset"
          >
            {tab === 'overview' && (
              <AssetOverviewTab
                asset={asset}
                lenses={lenses}
                current={state === 'ready' ? current : undefined}
                openCampaignId={current?.campaign_id ?? null}
                stage={overviewStage}
                sheets={sheetSummaries}
                ideasLine={
                  analyzable
                    ? ideasLine(t, state, current, kind === 'text')
                    : null
                }
                onOpenTab={setTab}
              />
            )}
            {tab === 'ideas' && insights('ideas')}
            {tab === 'summary' && insights('summary')}
          </SideColumn>
        </div>
      </SheetCiteContext.Provider>
    </AudioSeekContext.Provider>
  )
}

const TAB_ICON: Record<AssetTab, Icon> = {
  overview: LayoutIcon,
  ideas: LightbulbIcon,
  summary: BookOpenTextIcon,
}

/** The Ideas tab in a line, for the Overview: how many wait to be answered. */
function ideasLine(
  t: TFunction,
  state: PanelState,
  lens: AssetAnalysis | undefined,
  authored: boolean,
): string {
  if (state === 'reading' || state === 'analysing')
    return t('assetInsights.overview.ideasComing')
  // Otherwise the reason there are none, as the Ideas tab titles it.
  if (state === 'empty')
    return authored
      ? t('assetInsights.state.emptyNote')
      : t('assetInsights.state.emptySource')
  if (state !== 'ready') return t(`assetInsights.state.${state}`)
  if (!lens) return t('assetInsights.overview.noIdeas')
  const total = lens.ideas.length
  if (total === 0) return t('assetInsights.overview.noIdeas')
  const waiting = countIdeas(lens.ideas.map(ideaFromWire), new Date()).waiting
  return waiting > 0
    ? t('assetInsights.overview.waiting', { count: waiting })
    : t('assetInsights.overview.allAnswered', { count: total })
}

/** "DOCX" from "plan.docx". */
function fileFormat(name: string | undefined): string | null {
  const dot = name?.lastIndexOf('.') ?? -1
  return name && dot > 0 && dot < name.length - 1
    ? name.slice(dot + 1).toUpperCase()
    : null
}

/** "q3-pipeline" from "q3-pipeline.csv" — a CSV's one sheet's name. */
function withoutExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
