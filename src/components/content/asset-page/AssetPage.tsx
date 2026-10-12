import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  isMissingLens,
  lensKey,
  missingLens,
  pickLens,
} from '@/lib/assetAnalysis'
import { retrievability } from '@/lib/campaignSources'
import {
  isSpreadsheet,
  parseSheetLabel,
  sheetsFromChunks,
  summarizeSheets,
  type CitedRange,
} from '@/lib/sheetChunks'
import type { Asset } from '@/types/content'
import { AssetMetaColumn } from './AssetMetaColumn'
import { AssetStage } from './AssetStage'
import { InsightsPanel, type PanelState } from './InsightsPanel'
import { LensPicker } from './LensPicker'
import { SheetStage } from './SheetStage'
import { SheetView } from './SheetView'

type Props = {
  asset: Asset
  /** The campaign the page was opened through — the default lens. */
  campaignId: string | null
  /** `?lens=` — a campaign id or `workspace`, when the address names one. */
  lens: string | undefined
  onLensChange: (lens: string) => void
  /** Today's screen for this asset, hosted whole under the Source tab. */
  source: ReactNode
  onTitleChange: (title: string) => void
  onDirty: () => void
}

type Tab = 'insights' | 'source'

/** Where the last-used tab is remembered, per browser. */
const TAB_STORAGE_KEY = 'ogen.asset-page.tab'

function readTab(): Tab {
  try {
    return localStorage.getItem(TAB_STORAGE_KEY) === 'source'
      ? 'source'
      : 'insights'
  } catch {
    return 'insights'
  }
}

function rememberTab(tab: Tab) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch {
    // A private window or blocked storage: the default is fine.
  }
}

/**
 * The asset page as two columns (CON-366, behind `asset-insights`): what the
 * asset is on the left, what it says on the right.
 *
 * The right column is two tabs. **Insights** is the LLM's reading of the asset
 * (CON-364) through one lens at a time — the workspace's, or a campaign's —
 * with the ideas that reading distilled. **Source** is the screen this page
 * used to be, kept whole: the editor for a note, the extracted text for a PDF,
 * the transcript for a recording. An image is never analysed, so it gets
 * Source alone and no tab bar to choose between one thing.
 *
 * A spreadsheet is the one kind whose Source is new rather than kept (§5.4):
 * its rows read badly as extracted text, so it gets a sheet grid on the stage
 * and a table under Source, and an idea's "rows 10–24" chip opens that table
 * on those rows.
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
  const [tab, setTabState] = useState<Tab>(readTab)
  const setTab = useCallback((next: Tab) => {
    setTabState(next)
    rememberTab(next)
  }, [])

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
  const state: PanelState = analyses.isError
    ? 'loadFailed'
    : settled &&
        analyses.isSuccess &&
        (lenses.length === 0 || (current && isMissingLens(current)))
      ? 'none'
      : insightState(asset.status, current)
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

  // A spreadsheet's sheets, from the same chunk pages the table pages
  // through — one query, so the stage, the facts and the table agree.
  const spreadsheet = isSpreadsheet(asset) && settled
  const chunks = useAssetChunks(asset.id, { enabled: spreadsheet })
  const sheets = useMemo(
    () => sheetsFromChunks(chunks.data?.pages.flatMap((p) => p.chunks) ?? []),
    [chunks.data],
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

  const openSheet = useCallback(
    (name: string) => {
      setSelectedSheet(name)
      setTab('source')
    },
    [setTab],
  )
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

  const sourceBody = (
    <div className="px-8 py-8">
      {spreadsheet ? (
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
      )}
    </div>
  )

  return (
    <AudioSeekContext.Provider value={player}>
      <SheetCiteContext.Provider value={citer}>
        <div className="flex w-full max-w-[1180px] flex-col items-start gap-6 px-6 lg:flex-row">
          <AssetMetaColumn
            asset={asset}
            lenses={lenses}
            sheets={sheetSummaries}
            stage={
              spreadsheet && sheets.length > 0 ? (
                <SheetStage
                  sheets={sheets}
                  fallbackName={fallbackName}
                  onOpenSheet={openSheet}
                />
              ) : (
                <AssetStage
                  asset={asset}
                  audioRef={audioRef}
                  onAudioTime={setNowMs}
                />
              )
            }
            onTitleChange={onTitleChange}
            onDirty={onDirty}
          />

          <main className="flex w-full min-w-0 flex-1 flex-col bg-primary">
            {!analyzable ? (
              sourceBody
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-quaternary px-8 pt-5">
                  <TabsList variant="underlineSecondary" size="lg">
                    <TabsTrigger variant="underlineSecondary" value="insights">
                      {t('assetInsights.tabs.insights')}
                    </TabsTrigger>
                    <TabsTrigger variant="underlineSecondary" value="source">
                      {t('assetInsights.tabs.source')}
                    </TabsTrigger>
                  </TabsList>
                  {tab === 'insights' && current && (
                    <div className="mb-2">
                      <LensPicker
                        lenses={lensOptions}
                        current={current}
                        onChange={onLensChange}
                      />
                    </div>
                  )}
                </div>
                <TabsContent
                  value="insights"
                  className="mt-0 px-8 py-8"
                  aria-busy={busy}
                >
                  {/* Announced, and shown for a moment, when a reading lands
                      while the page is open. */}
                  <div aria-live="polite" className="empty:hidden">
                    {arrived !== null && (
                      <p className="mb-6 flex items-center gap-2 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground motion-safe:animate-in motion-safe:fade-in">
                        <span
                          aria-hidden
                          className="size-2 rounded-full bg-accent"
                        />
                        {t('assetInsights.arrived', { count: arrived })}
                      </p>
                    )}
                  </div>
                  <InsightsPanel
                    state={state}
                    lens={current}
                    sheets={sheetSummaries}
                    retrying={retry.isPending}
                    onRetry={() => retry.mutate(current?.campaign_id ?? null)}
                  />
                </TabsContent>
                {/* Kept mounted: the editor autosaves, and a tab switch must
                    not unmount it mid-debounce or drop a recording's place. */}
                <TabsContent
                  value="source"
                  forceMount
                  className="mt-0 data-[state=inactive]:hidden"
                >
                  {sourceBody}
                </TabsContent>
              </Tabs>
            )}
          </main>
        </div>
      </SheetCiteContext.Provider>
    </AudioSeekContext.Provider>
  )
}

/** "q3-pipeline" from "q3-pipeline.csv" — a CSV's one sheet's name. */
function withoutExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
