import { useMemo, useState } from 'react'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { AssetGlyph } from '@/components/content/AssetGlyph'
import { useAssets } from '@/hooks/useContent'
import { retrievability } from '@/lib/campaignSources'
import { extentLabel } from '@/lib/assetExtent'
import { pageUrlLabel } from '@/lib/webPageUrl'
import { cn, formatTitle } from '@/lib'
import type { Asset } from '@/types/content'

type Props = {
  onClose: () => void
  /** Already on the post — listed, ticked, and inert. */
  attachedIds: string[]
  onAdd: (assets: Asset[]) => void
}

/**
 * Choose documents the post should read from.
 *
 * This reaches the whole content bank rather than the campaign's own set, and
 * anything picked here joins the campaign too. The alternative — a post that
 * reads a document its campaign has never heard of — makes the two disagree
 * about what exists, and the campaign is the thing that generates the next
 * post. One truth is worth more than the tidiness of keeping the bank out of a
 * campaign's reach.
 *
 * It is mounted only while open — hence no `isOpen` prop — and that is load
 * bearing rather than tidiness. The asset list carries every document's full
 * markdown, so a post editor holding this component closed-but-mounted would
 * fetch a whole workspace to render a card that needs nothing from it: the
 * server hydrates a post's own documents onto the post. Mounting per opening
 * also means the search box and the ticks start empty every time, with no
 * effect to reset them.
 */
export function AddSourcesModal({ onClose, attachedIds, onAdd }: Props) {
  const { data: assets, isLoading, isError } = useAssets()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const held = useMemo(() => new Set(attachedIds), [attachedIds])

  const visible = useMemo(() => {
    const all = assets ?? []
    const q = query.trim().toLowerCase()
    if (q === '') return all
    return all.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.source_url ?? '').toLowerCase().includes(q),
    )
  }, [assets, query])

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleAdd = () => {
    const chosen = (assets ?? []).filter((a) => picked.has(a.id))
    if (chosen.length === 0) return
    onAdd(chosen)
    onClose()
  }

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title="Choose from the content bank"
      size="large"
    >
      {/* The modal grows with its content and the list is what is capped,
          rather than the modal taking a height and the list dividing it up:
          a percentage height through three flex ancestors is how the rows
          ended up rendering past the panel's own edge. */}
      <div className="flex flex-col gap-4">
        <p className="shrink-0 text-sm text-tertiary-foreground">
          The post writes from what you pick here, and so does its assistant.
          Anything chosen also joins the campaign.
        </p>

        <div className="flex h-10 shrink-0 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3">
          <MagnifyingGlassIcon className="size-4 shrink-0 text-secondary-foreground" />
          <Input
            variant="search"
            inputSize="default"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents"
            aria-label="Search the content bank"
            className="px-0"
          />
          {query !== '' && (
            <Button
              variant="ghost"
              size="xsIcon"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <XIcon />
            </Button>
          )}
        </div>

        <div className="max-h-[50vh] min-h-30 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-30 items-center justify-center">
              <Spinner tone="onSurface" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Unable to read the content bank.
            </p>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-tertiary-foreground">
              {query !== ''
                ? 'No documents match that'
                : 'There is nothing in the content bank yet'}
            </p>
          ) : (
            <ul className="flex flex-col">
              {visible.map((asset) => (
                <AssetChoice
                  key={asset.id}
                  asset={asset}
                  attached={held.has(asset.id)}
                  checked={held.has(asset.id) || picked.has(asset.id)}
                  onToggle={() => toggle(asset.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={picked.size === 0}>
            Add{picked.size > 0 ? ` (${picked.size})` : ''}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/**
 * One row in the picker.
 *
 * A document already on the post stays in the list rather than being filtered
 * out — a picker that hides what you already have makes you wonder whether you
 * have it. It is ticked and inert, and says so.
 *
 * The second line answers "can it actually be read from": a `failed` or
 * `partial` document is skipped by retrieval outright, so adding one is a
 * no-op the user would otherwise only discover by the assistant never citing
 * it.
 */
function AssetChoice({
  asset,
  attached,
  checked,
  onToggle,
}: {
  asset: Asset
  attached: boolean
  checked: boolean
  onToggle: () => void
}) {
  const reach = retrievability(asset.status)
  const provisional = asset.type === 'URL' && asset.source_url === asset.title
  const label = provisional ? pageUrlLabel(asset.title) : formatTitle(asset.title)

  return (
    <li>
      <label
        className={cn(
          'flex items-center gap-3 border-b border-quaternary px-1 py-2.5',
          attached ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-secondary',
        )}
      >
        <Checkbox
          checked={checked}
          disabled={attached}
          onCheckedChange={onToggle}
          aria-label={label}
        />
        <AssetGlyph asset={asset} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm text-foreground">{label}</span>
          <span className="flex items-center gap-2 truncate text-xs text-tertiary-foreground">
            {asset.source_url && !provisional && (
              <span className="truncate">{pageUrlLabel(asset.source_url)}</span>
            )}
            <span className="shrink-0">{extentLabel(asset)}</span>
          </span>
        </span>
        {attached ? (
          <span className="shrink-0 text-xs text-tertiary-foreground">Already added</span>
        ) : reach === 'never' ? (
          <span className="shrink-0 text-xs text-warning">Can't be read</span>
        ) : reach === 'waiting' ? (
          <span className="shrink-0 text-xs text-tertiary-foreground">Still reading</span>
        ) : null}
      </label>
    </li>
  )
}
