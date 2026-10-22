import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowCounterClockwiseIcon,
  ChatCircleTextIcon,
  GlobeIcon,
  GlobeSimpleIcon,
  MagnifyingGlassIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dropzone } from '@/components/uploads/Dropzone'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { useAssetList } from '@/hooks/useContent'
import {
  useRequestDistill,
  useResumableRun,
  type DistillRefusal,
} from '@/hooks/useBrandDistill'
import { cn } from '@/lib'
import { formatDuration } from '@/lib/assetList'
import { isRunOpen, runRoute, siteHost } from '@/lib/brandDistill'
import { uploadErrorMessage } from '@/lib/uploadError'
import { checkPageUrl } from '@/lib/webPageUrl'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'
import type { AssetListItem } from '@/types/assetList'
import type { DistillRun } from '@/types/brandDistill'
import { StarterCard } from '../shell'
import { GroupLabel } from './parts'

type Route = 'website' | 'document' | 'questions'

/**
 * The offer's three routes, live (CON-400 board 1).
 *
 * **Choosing one opens it in the card, not in a modal.** The tile stays,
 * pressed and with its caret turned down, the route grows under it, and the
 * other two shrink to links under a rule — so the choice can be changed
 * without backing out of anything. Questions is the exception and goes to a
 * page of its own (`/foundation/questions`): seven fields are a screen, not a
 * card.
 *
 * Two states take the tiles away. A read already under way, or waiting to be
 * reviewed, is offered back instead — there is one per workspace, and
 * starting another would only be refused. And a plan with the feature off
 * (403) hides them, since every one of them would be refused the same way.
 */
export function OfferRoutes() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<Route | null>(null)
  const { request, refusal } = useRequestDistill()
  const resumable = useResumableRun()

  if (refusal === 'gateOff') return null
  if (resumable && chosen === null) return <ResumeTile run={resumable} />

  const tiles: Record<Route, { icon: typeof GlobeIcon; key: Route }> = {
    website: { icon: GlobeIcon, key: 'website' },
    document: { icon: StackIcon, key: 'document' },
    questions: { icon: ChatCircleTextIcon, key: 'questions' },
  }

  const choose = (route: Route) => {
    if (route === 'questions') {
      void navigate({ to: '/foundation/questions' })
      return
    }
    setChosen(route)
  }

  if (chosen === null) {
    return (
      <div className="grid gap-3">
        {(['website', 'document', 'questions'] as const).map((route) => (
          <StarterCard
            key={route}
            icon={tiles[route].icon}
            title={t(`brand.shell.offer.${route}.title`)}
            body={t(`brand.shell.offer.${route}.body`)}
            caret="right"
            onClick={() => choose(route)}
          />
        ))}
      </div>
    )
  }

  const others = (['website', 'document', 'questions'] as const).filter(
    (r) => r !== chosen,
  )

  return (
    <div className="flex flex-col gap-5">
      <StarterCard
        icon={tiles[chosen].icon}
        title={t(`brand.shell.offer.${chosen}.title`)}
        body={t(`brand.shell.offer.${chosen}.body`)}
        caret="down"
        pressed
        onClick={() => setChosen(null)}
      />
      {chosen === 'website' ? (
        <WebsiteRoute
          busy={request.isPending}
          refusal={refusal}
          onCancel={() => setChosen(null)}
          onRead={(websiteUrl) => request.mutate({ websiteUrl })}
        />
      ) : (
        <DocumentRoute
          busy={request.isPending}
          refusal={refusal}
          onCancel={() => setChosen(null)}
          onRead={(assetIds) => request.mutate({ assetIds })}
        />
      )}
      {/* The other two routes, demoted rather than gone: changing your mind
          is one click, not a cancel and a second choice. */}
      <p className="border-t border-quaternary pt-4 text-sm text-secondary-foreground">
        {t('brand.distill.offer.or')}{' '}
        {others.map((route, i) => (
          <span key={route}>
            {i > 0 && (
              <span aria-hidden className="px-1.5 text-tertiary-foreground">
                ·
              </span>
            )}
            <button
              type="button"
              onClick={() => choose(route)}
              className="cursor-pointer font-medium text-accent hover:underline"
            >
              {t(`brand.shell.offer.${route}.title`)}
            </button>
          </span>
        ))}
      </p>
    </div>
  )
}

/**
 * A read the workspace already has under way, or finished and not yet looked
 * at, in place of the three routes — the same tile, pointing at it.
 */
function ResumeTile({ run }: { run: DistillRun }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const route = runRoute(run)
  const what =
    route === 'website' && run.website
      ? siteHost(run.website.url)
      : route === 'document'
        ? t('brand.distill.offer.resumeFiles', { count: run.sources.length })
        : t('brand.distill.offer.resumeAnswers')
  return (
    <div className="grid gap-3">
      <StarterCard
        icon={ArrowCounterClockwiseIcon}
        title={
          isRunOpen(run.status)
            ? t('brand.distill.offer.resumeReading', { what })
            : t('brand.distill.offer.resumeReady', { what })
        }
        body={
          isRunOpen(run.status)
            ? t('brand.distill.offer.resumeReadingBody')
            : t('brand.distill.offer.resumeReadyBody')
        }
        caret="right"
        onClick={() =>
          navigate({
            to: '/foundation/read/$runId',
            params: { runId: run.id },
          })
        }
      />
    </div>
  )
}

/** A refusal, said where the request was made. */
function RefusalLine({ refusal }: { refusal: DistillRefusal | null }) {
  const { t } = useTranslation()
  if (!refusal) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {t(`brand.distill.refusal.${refusal}`)}
    </p>
  )
}

/**
 * The website route: one field and one sentence that says exactly what will
 * be read — and that it stays in Assets afterwards, because ten documents
 * appearing in the bank unannounced would read as something going wrong.
 */
function WebsiteRoute({
  busy,
  refusal,
  onCancel,
  onRead,
}: {
  busy: boolean
  refusal: DistillRefusal | null
  onCancel: () => void
  onRead: (url: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [url, setUrl] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const checked = checkPageUrl(url)
    if (!checked.ok) {
      setInvalid(true)
      return
    }
    onRead(checked.url)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-2">
        <GroupLabel htmlFor={id}>{t('brand.distill.website.label')}</GroupLabel>
        {/* AddWebPageModal's field — the globe, the pale fill, the rule that
            goes black on focus. */}
        <div className="flex h-10 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3 transition-colors focus-within:border-foreground">
          <GlobeSimpleIcon className="size-4 shrink-0 text-secondary-foreground" />
          <Input
            id={id}
            autoFocus
            variant="search"
            inputSize="default"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setInvalid(false)
            }}
            placeholder={t('brand.distill.website.placeholder')}
            aria-invalid={invalid}
            className="px-0"
          />
        </div>
        {invalid && (
          <p role="alert" className="text-xs text-destructive">
            {t('brand.distill.website.invalid')}
          </p>
        )}
        <RefusalLine refusal={refusal} />
      </div>
      <p className="text-sm leading-5 text-secondary-foreground">
        {t('brand.distill.website.what')}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('brand.distill.cancel')}
        </Button>
        <Button
          type="submit"
          variant="defaultInverted"
          loading={busy}
          disabled={url.trim() === ''}
        >
          {t('brand.distill.website.read')}
        </Button>
      </div>
    </form>
  )
}

/**
 * The document route: the Assets dropzone, and the workspace's assets under
 * it to tick.
 *
 * **A file still uploading can be chosen.** The run waits for its sources to
 * be ingested (CON-399 FR4), so the only thing this side has to wait for is the
 * asset id — which an upload has as soon as its request answers. So READ waits
 * for the ids of the chosen uploads, and nothing longer.
 *
 * Uploads from here are **brand sources**: tagged so in Assets, and kept out of
 * automatic analysis — a style guide is something to read a brand off, not a
 * pile of post ideas. Assets ticked from the list are the user's own material
 * and are left exactly as they are.
 */
function DocumentRoute({
  busy,
  refusal,
  onCancel,
  onRead,
}: {
  busy: boolean
  refusal: DistillRefusal | null
  onCancel: () => void
  onRead: (assetIds: string[]) => void
}) {
  const { t } = useTranslation()
  const enqueue = useUploadStore((s) => s.enqueue)
  const allUploads = useUploadStore((s) => s.items)
  /** Uploads started here, by upload id — chosen until unticked. */
  const [uploadIds, setUploadIds] = useState<string[]>([])
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [search, setSearch] = useState('')
  const [waiting, setWaiting] = useState(false)
  // The watch a READ left on the upload store. Dropped on the way out, so a
  // cancel or a switch to another route cannot have an upload that settles
  // later start a read — and spend one — that nobody is waiting for.
  const stopWaiting = useRef<(() => void) | null>(null)
  useEffect(() => () => stopWaiting.current?.(), [])

  const uploads = useMemo(
    () => allUploads.filter((u) => uploadIds.includes(u.id)),
    [allUploads, uploadIds],
  )
  const uploadedAssetIds = new Set(
    uploads.map((u) => u.assetId).filter(Boolean),
  )

  const params = useMemo(
    () => ({
      sort: '-created_at',
      status_not: 'failed',
      ...(search.trim() ? { title: search.trim() } : {}),
    }),
    [search],
  )
  const list = useAssetList(params)
  const assets = list.rows.filter((a) => !uploadedAssetIds.has(a.id))

  const toggle = (key: string) =>
    setChosen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const drop = (files: File[]) => {
    const before = new Set(useUploadStore.getState().items.map((i) => i.id))
    enqueue(files, { campaignId: null, postId: null, purpose: 'brand_source' })
    const added = useUploadStore
      .getState()
      .items.filter((i) => !before.has(i.id) && i.phase !== 'failed')
      .map((i) => i.id)
    const refused = useUploadStore
      .getState()
      .items.filter((i) => !before.has(i.id) && i.phase === 'failed')
      .map((i) => i.id)
    setUploadIds((prev) => [...prev, ...added, ...refused])
    setChosen(
      (prev) => new Set([...prev, ...added.map((id) => `upload:${id}`)]),
    )
  }

  const count =
    uploads.filter((u) => chosen.has(`upload:${u.id}`) && u.phase !== 'failed')
      .length + [...chosen].filter((k) => !k.startsWith('upload:')).length

  // READ pressed while a chosen upload has no id yet: send the moment the last
  // one has. Watched on the store itself rather than through a render, so the
  // request goes out once, from the event that finished it. An upload refused
  // in the meantime simply drops out of the set.
  const read = () => {
    const assetIds = [...chosen].filter((k) => !k.startsWith('upload:'))
    const pick = (items: UploadItem[]) =>
      items.filter(
        (u) =>
          uploadIds.includes(u.id) &&
          chosen.has(`upload:${u.id}`) &&
          u.phase !== 'failed',
      )
    const settled = (items: UploadItem[]) => pick(items).every((u) => u.assetId)
    const send = (items: UploadItem[]) => {
      const ids = [...assetIds, ...pick(items).map((u) => u.assetId as string)]
      setWaiting(false)
      if (ids.length > 0) onRead(ids)
    }

    if (settled(useUploadStore.getState().items)) {
      send(useUploadStore.getState().items)
      return
    }
    setWaiting(true)
    const stop = useUploadStore.subscribe((state) => {
      if (!settled(state.items)) return
      stop()
      stopWaiting.current = null
      send(state.items)
    })
    stopWaiting.current = stop
  }

  return (
    <div className="flex flex-col gap-5">
      <Dropzone
        onFiles={drop}
        hint={t('brand.distill.document.formats')}
        className="py-4"
      />

      <div className="flex flex-col">
        <div className="flex h-8 items-center justify-between gap-3">
          <GroupLabel>{t('brand.distill.document.inAssets')}</GroupLabel>
          {searching ? (
            <Input
              autoFocus
              variant="search"
              inputSize="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => search.trim() === '' && setSearching(false)}
              placeholder={t('brand.distill.document.search')}
              aria-label={t('brand.distill.document.search')}
              className="max-w-56 border-b border-quaternary px-0"
            />
          ) : (
            <Button
              variant="ghost"
              size="smIcon"
              aria-label={t('brand.distill.document.search')}
              onClick={() => setSearching(true)}
            >
              <MagnifyingGlassIcon />
            </Button>
          )}
        </div>
        <ul className="max-h-[246px] overflow-y-auto">
          {uploads.map((upload) => (
            <UploadRow
              key={upload.id}
              upload={upload}
              checked={chosen.has(`upload:${upload.id}`)}
              onToggle={() => toggle(`upload:${upload.id}`)}
            />
          ))}
          {assets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              checked={chosen.has(asset.id)}
              onToggle={() => toggle(asset.id)}
            />
          ))}
          {!list.query.isPending &&
            assets.length === 0 &&
            uploads.length === 0 && (
              <li className="py-3 text-sm text-tertiary-foreground">
                {search.trim()
                  ? t('brand.distill.document.noMatch')
                  : t('brand.distill.document.none')}
              </li>
            )}
        </ul>
      </div>

      <RefusalLine refusal={refusal} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-secondary-foreground">
          {t('brand.distill.document.chosen', { count })}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('brand.distill.cancel')}
          </Button>
          <Button
            variant="defaultInverted"
            loading={busy || waiting}
            disabled={count === 0}
            onClick={read}
          >
            {t('brand.distill.document.read', { count })}
          </Button>
        </div>
      </div>
    </div>
  )
}

const ROW = 'flex min-h-10 items-center gap-3 border-b border-quaternary py-2'

function AssetRow({
  asset,
  checked,
  onToggle,
}: {
  asset: AssetListItem
  checked: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const settling = asset.status === 'pending' || asset.status === 'processing'
  const pages = asset.file?.page_count ?? 0
  const ms = asset.file?.duration_ms ?? 0
  const extent = settling
    ? t('brand.distill.document.processing')
    : [
        ms > 0 ? formatDuration(t, ms) : null,
        pages > 0 ? t('content.extent.pages', { count: pages }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
  return (
    <li className={ROW}>
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      <HugeiconsIcon
        icon={KIND_ICON[asset.kind] ?? Note01Icon}
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="shrink-0 text-tertiary-foreground"
      />
      <label
        htmlFor={id}
        className="min-w-0 flex-1 cursor-pointer truncate text-sm"
      >
        {asset.title}
      </label>
      {extent && (
        <span className="shrink-0 text-xs text-secondary-foreground tabular-nums">
          {extent}
        </span>
      )}
    </li>
  )
}

function UploadRow({
  upload,
  checked,
  onToggle,
}: {
  upload: UploadItem
  checked: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const failed = upload.phase === 'failed'
  const state = failed
    ? upload.error
      ? uploadErrorMessage(t, upload.error)
      : t('brand.distill.document.uploadFailed')
    : upload.phase === 'uploading'
      ? t('brand.distill.document.uploading', { percent: upload.progress })
      : upload.phase === 'processing'
        ? t('brand.distill.document.processing')
        : t('brand.distill.document.ready')
  return (
    <li className={ROW}>
      <Checkbox
        id={id}
        checked={checked && !failed}
        disabled={failed}
        onCheckedChange={onToggle}
      />
      <HugeiconsIcon
        icon={upload.kind ? uploadIcon(upload.kind) : Note01Icon}
        size={16}
        strokeWidth={1.5}
        aria-hidden
        className="shrink-0 text-tertiary-foreground"
      />
      <label
        htmlFor={id}
        className={cn(
          'min-w-0 flex-1 cursor-pointer truncate text-sm',
          failed && 'text-tertiary-foreground',
        )}
      >
        {upload.filename}
      </label>
      <span
        className={cn(
          'shrink-0 text-xs tabular-nums',
          failed ? 'text-destructive' : 'text-secondary-foreground',
        )}
      >
        {state}
      </span>
    </li>
  )
}

function uploadIcon(kind: NonNullable<UploadItem['kind']>) {
  switch (kind) {
    case 'pdf':
      return KIND_ICON.pdf
    case 'audio':
      return KIND_ICON.audio
    case 'image':
      return KIND_ICON.image
    case 'document':
      return KIND_ICON.document
    default:
      return KIND_ICON.note
  }
}
