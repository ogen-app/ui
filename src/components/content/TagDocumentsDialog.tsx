import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib'
import type { Asset, Tag } from '@/types/content'

type Props = {
  /** The documents the tags are being filed onto — the live rows, not ids. */
  assets: Asset[]
  isOpen: boolean
  onClose: () => void
  onConfirm: (change: { add: string[]; remove: string[] }) => void
  saving: boolean
}

/**
 * Filing a selection under tags (CON-279).
 *
 * The two halves are not the same control twice. **Add** is a search over every
 * tag in the workspace, and can invent one, because the tag you want may not
 * exist yet. **Remove** can only offer what the selection actually carries —
 * anything else would be a no-op dressed up as a choice — so it is a list of
 * those tags rather than a second search field, each with the count of how many
 * documents would lose it. That count is the thing worth reading before
 * clicking: removing a tag that eleven of your twelve documents share is a
 * different act from removing one that only the odd one out has.
 *
 * Nothing is applied until APPLY, and the request is one call for the whole
 * selection — the server merges per asset, so a document that already has a tag
 * being added is left alone rather than refused.
 */
export function TagDocumentsDialog({
  assets,
  isOpen,
  onClose,
  onConfirm,
  saving,
}: Props) {
  const { t } = useTranslation()
  const [add, setAdd] = useState<string[]>([])
  const [remove, setRemove] = useState<string[]>([])

  // A dialog that remembers last time's choices would apply them to a
  // selection that is no longer the one they were picked for.
  useEffect(() => {
    if (!isOpen) return
    setAdd([])
    setRemove([])
  }, [isOpen])

  /** Every tag on the selection, with how many documents carry it. */
  const present = useMemo(() => {
    const counts = new Map<string, { tag: Tag; count: number }>()
    for (const asset of assets) {
      for (const tag of asset.tags) {
        const seen = counts.get(tag.id)
        if (seen) seen.count += 1
        else counts.set(tag.id, { tag, count: 1 })
      }
    }
    return [...counts.values()].sort((a, b) =>
      a.tag.name.localeCompare(b.tag.name),
    )
  }, [assets])

  const count = assets.length
  const dirty = add.length > 0 || remove.length > 0

  const toggleRemove = (id: string) =>
    setRemove((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={t('content.tagging.title', { count })}
      size="small"
      closeOnBackdropClick={!saving}
      closeOnEscape={!saving}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tag-documents-add">
            {t('content.tagging.addLabel')}
          </Label>
          {/* The add field excludes nothing already on the selection: a tag two
              of five documents have is a perfectly good thing to add to the
              other three, and hiding it would make that impossible. */}
          <TagsInput
            id="tag-documents-add"
            value={add}
            onChange={setAdd}
            placeholder={t('content.tagging.addPlaceholder')}
            disabled={saving}
          />
          <p className="text-xs text-tertiary-foreground">
            {t('content.tagging.addHelp')}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t('content.tagging.removeLabel')}</Label>
          {present.length === 0 ? (
            <p className="text-xs text-tertiary-foreground">
              {t('content.tagging.removeNone')}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {present.map(({ tag, count: on }) => {
                  const marked = remove.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleRemove(tag.id)}
                      aria-pressed={marked}
                      className={cn(
                        'inline-flex items-center gap-1.5 border px-2 py-1 text-[13px]/4',
                        marked
                          ? 'border-destructive text-destructive line-through'
                          : 'border-tertiary bg-secondary text-primary-foreground',
                      )}
                    >
                      <span className="max-w-40 truncate">{tag.name}</span>
                      <span className="tabular-nums text-tertiary-foreground">
                        {t('content.tagging.onCount', {
                          count: on,
                          total: count,
                        })}
                      </span>
                      {marked && <XIcon className="size-3 shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-tertiary-foreground">
                {t('content.tagging.removeHelp')}
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t('content.tagging.cancel')}
          </Button>
          <Button
            type="button"
            variant="defaultInverted"
            onClick={() => onConfirm({ add, remove })}
            disabled={!dirty}
            loading={saving}
          >
            {t('content.tagging.submit')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
