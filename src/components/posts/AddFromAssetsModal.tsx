import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  XIcon,
} from '@phosphor-icons/react'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAssetList } from '@/hooks/useContent'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { assetPreviewUrl } from '@/lib/assetPreview'
import { awaiting } from '@/lib/fetched'
import { cn, formatTitle } from '@/lib'
import type { BankImage } from '@/hooks/usePostAttachments'
import type { AssetListItem } from '@/types/assetList'

type Scope = 'campaign' | 'workspace'

type Props = {
  campaignId: string
  /** How many more files the post takes; `null` when nothing caps it. */
  room: number | null
  /** Bank images already on the post — shown ticked and inert. */
  attachedAssetIds: ReadonlySet<string>
  onAdd: (images: BankImage[]) => void
  onClose: () => void
}

/**
 * Choose images from Assets to attach to the post (CON-290).
 *
 * Opens on the post's own campaign, because that is the short list a campaign
 * was given to write from (CON-210), with the whole bank one switch away — the
 * same reach the Sources picker has. Only images: the endpoint copies an image
 * and nothing else, so a PDF in this grid would be a tile that can only fail.
 *
 * Mounted only while open, like `AddSourcesModal`, so the editor never reads
 * the bank for a card that needs nothing from it, and every opening starts
 * with an empty search and no ticks.
 *
 * What is ticked is kept as rows in the order it was ticked: that is the order
 * the images are attached in, and so the order they publish in.
 */
export function AddFromAssetsModal({
  campaignId,
  room,
  attachedAssetIds,
  onAdd,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [scope, setScope] = useState<Scope>('campaign')
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim(), 250)
  const list = useAssetList(
    useMemo(
      () => ({
        kind: 'image',
        ...(scope === 'campaign' ? { scope_campaign: campaignId } : {}),
        ...(search ? { title: search } : {}),
        sort: '-updated_at',
      }),
      [scope, campaignId, search],
    ),
  )
  const assetsQuery = list.query
  const [picked, setPicked] = useState<Map<string, AssetListItem>>(new Map())
  const scroller = useRef<HTMLDivElement>(null)

  const full = room !== null && picked.size >= room

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 200) return
    if (assetsQuery.hasNextPage && !assetsQuery.isFetchingNextPage)
      void assetsQuery.fetchNextPage()
  }

  const toggle = (asset: AssetListItem) =>
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(asset.id)) next.delete(asset.id)
      else next.set(asset.id, asset)
      return next
    })

  const handleAdd = () => {
    if (picked.size === 0) return
    onAdd(
      [...picked.values()].map((asset) => ({
        id: asset.id,
        title: formatTitle(asset.title),
      })),
    )
    onClose()
  }

  const empty =
    query !== ''
      ? t('posts.media.fromAssets.noMatch')
      : scope === 'campaign'
        ? t('posts.media.fromAssets.emptyCampaign')
        : t('posts.media.fromAssets.emptyWorkspace')

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title={t('posts.media.fromAssets.title')}
      size="large"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <TabsList variant="segmented" size="excluded">
              <TabsTrigger variant="segmented" value="campaign">
                {t('posts.media.fromAssets.scopeCampaign')}
              </TabsTrigger>
              <TabsTrigger variant="segmented" value="workspace">
                {t('posts.media.fromAssets.scopeWorkspace')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex h-10 min-w-48 flex-1 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3">
            <MagnifyingGlassIcon className="size-4 shrink-0 text-secondary-foreground" />
            <Input
              variant="search"
              inputSize="default"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('posts.media.fromAssets.search')}
              aria-label={t('posts.media.fromAssets.searchLabel')}
              className="px-0"
            />
            {query !== '' && (
              <Button
                variant="ghost"
                size="xsIcon"
                aria-label={t('posts.media.fromAssets.clearSearch')}
                onClick={() => setQuery('')}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>

        {room !== null && (
          <p className="text-xs text-tertiary-foreground">
            {t('posts.media.fromAssets.room', { count: room })}
          </p>
        )}

        {/* Capped here rather than on the modal, for the reason
            `AddSourcesModal` gives: a percentage height through the modal's
            flex ancestors let the rows render past the panel's edge. */}
        <div
          ref={scroller}
          onScroll={onScroll}
          className="max-h-[50vh] min-h-30 overflow-y-auto"
        >
          {/* `awaiting`, not `isLoading` — see `lib/fetched`. The empty
              sentence below is the claim this branch protects. */}
          {awaiting(assetsQuery) ? (
            <div className="flex h-30 items-center justify-center">
              <Spinner tone="onSurface" />
            </div>
          ) : assetsQuery.isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {t('posts.media.fromAssets.error')}
            </p>
          ) : list.rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-tertiary-foreground">
              {empty}
            </p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
              {list.rows.map((asset) => {
                const attached = attachedAssetIds.has(asset.id)
                const checked = picked.has(asset.id)
                return (
                  <ImageChoice
                    key={asset.id}
                    asset={asset}
                    attached={attached}
                    checked={attached || checked}
                    disabled={attached || (full && !checked)}
                    onToggle={() => toggle(asset)}
                  />
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={picked.size === 0}>
            {picked.size > 0
              ? t('posts.media.fromAssets.addCount', { count: picked.size })
              : t('posts.media.fromAssets.add')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/**
 * One image in the grid.
 *
 * An image already on the post stays in the grid, ticked and inert — a picker
 * that hides what you have makes you wonder whether you have it. One still
 * being read is offered all the same: attaching copies the stored original,
 * which exists from the moment the upload lands, so the badge is information
 * rather than a refusal. A failed one is offered too, and the server's answer
 * says why if it cannot be attached.
 */
function ImageChoice({
  asset,
  attached,
  checked,
  disabled,
  onToggle,
}: {
  asset: AssetListItem
  attached: boolean
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const url = assetPreviewUrl(asset)
  const [broken, setBroken] = useState(false)
  const title = formatTitle(asset.title)
  const badge = attached
    ? t('posts.media.fromAssets.onPost')
    : asset.status === 'failed'
      ? t('posts.media.fromAssets.failed')
      : asset.status === 'pending' || asset.status === 'processing'
        ? t('posts.media.fromAssets.processing')
        : null

  return (
    <li className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          'relative aspect-square w-full overflow-hidden bg-tertiary outline-none',
          'focus-visible:ring-2 focus-visible:ring-foreground',
          disabled ? 'cursor-default' : 'cursor-pointer',
          disabled && !attached && 'opacity-50',
          checked && 'ring-2 ring-foreground',
        )}
      >
        {url && !broken ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className={cn('size-full object-cover', attached && 'opacity-60')}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-tertiary-foreground">
            <ImageIcon className="size-6" />
          </span>
        )}
        {checked && (
          <span className="absolute right-1 top-1 bg-primary/90 p-0.5">
            <CheckIcon weight="bold" className="size-3.5 text-foreground" />
          </span>
        )}
        {badge && (
          <span
            className={cn(
              'absolute inset-x-0 bottom-0 truncate bg-primary/90 px-1 py-0.5 text-left text-[11px]',
              asset.status === 'failed' && !attached
                ? 'text-warning'
                : 'text-tertiary-foreground',
            )}
          >
            {badge}
          </span>
        )}
      </button>
      <span className="truncate text-xs text-tertiary-foreground">{title}</span>
    </li>
  )
}
