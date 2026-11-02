import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { ModalContainer } from '@/components/ui/modal.tsx'
import { Textarea } from '@/components/ui/textarea.tsx'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl.ts'
import { altTextState, MAX_ALT_TEXT_CHARS } from '@/lib/altText.ts'
import type { PostAttachmentWithValidation } from '@/types/attachments.ts'

type Props = {
  attachment: PostAttachmentWithValidation
  /** The platform's cap, or `null` when it is not known — see `altTextLimit`. */
  limit: number | null
  /** A submitted post's media is a record: the text can be read, not changed. */
  frozen: boolean
  /** Rejects when the save fails; the mutation has already toasted why. */
  onSave: (altText: string) => Promise<unknown>
}

/**
 * The line under an image tile that says whether it is described, and opens
 * the description. Under the tile rather than on it, like the thread picker:
 * the tile's corners are spoken for, and "no alt text" has to be readable as
 * words — a glyph would not say which of the three states the image is in.
 */
export function AltTextControl({ attachment, limit, frozen, onSave }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const state = altTextState(attachment)

  // Nothing to read on a frozen post with no description, so nothing to open.
  if (frozen && state === 'missing') {
    return (
      <span className="w-32 px-1.5 py-1 text-[11px] text-tertiary-foreground">
        {t('posts.media.altText.state.missing')}
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(
          frozen ? 'posts.media.altText.view' : 'posts.media.altText.edit',
        )}
        className={cn(
          'flex w-32 items-center gap-1.5 px-1.5 py-1 cursor-pointer text-[11px]',
          'bg-tertiary hover:bg-quaternary',
          state === 'missing' ? 'text-warning' : 'text-tertiary-foreground',
        )}
      >
        <span className="shrink-0 border border-current px-0.5 text-[9px] font-medium leading-tight">
          ALT
        </span>
        <span className="truncate">
          {t(`posts.media.altText.state.${state}`)}
        </span>
      </button>
      {open && (
        <AltTextDialog
          attachment={attachment}
          limit={Math.min(limit ?? MAX_ALT_TEXT_CHARS, MAX_ALT_TEXT_CHARS)}
          readOnly={frozen}
          onSave={onSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function AltTextDialog({
  attachment,
  limit,
  readOnly,
  onSave,
  onClose,
}: {
  attachment: PostAttachmentWithValidation
  limit: number
  readOnly: boolean
  onSave: (altText: string) => Promise<unknown>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(attachment.alt_text)
  const [saving, setSaving] = useState(false)
  const state = altTextState(attachment)

  // Closes only once the server has the text. A failed save keeps the dialog
  // and the draft, so the author can retry rather than retype; the mutation
  // has already rolled the tile back and said why.
  const save = async () => {
    setSaving(true)
    try {
      await onSave(draft.trim())
      onClose()
    } catch {
      setSaving(false)
    }
  }
  // Counted in code points, as the server counts runes.
  const length = Array.from(draft.trim()).length
  const over = length > limit
  // Saving a generated description unchanged is meaningful: it is the author
  // saying they have read it, and it stops it being regenerated.
  const changed = draft.trim() !== attachment.alt_text || state === 'generated'

  return (
    <ModalContainer
      isOpen
      onClose={saving ? () => {} : onClose}
      title={t('posts.media.altText.title')}
      size="small"
    >
      <div className="flex flex-col gap-4">
        {attachment.presigned_url && (
          <img
            src={attachment.presigned_url}
            alt=""
            className="max-h-48 w-full bg-tertiary object-contain"
          />
        )}
        <p className="text-sm text-secondary-foreground">
          {t('posts.media.altText.help')}
        </p>
        {state === 'generated' && !readOnly && (
          <p className="text-xs text-tertiary-foreground">
            {t('posts.media.altText.generatedNote')}
          </p>
        )}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={readOnly}
          aria-label={t('posts.media.altText.title')}
          aria-invalid={over || undefined}
          placeholder={t('posts.media.altText.placeholder')}
          autoFocus={!readOnly}
        />
        {!readOnly && (
          <span
            className={cn(
              'text-xs',
              over ? 'text-destructive' : 'text-tertiary-foreground',
            )}
          >
            {t(
              over ? 'posts.media.altText.over' : 'posts.media.altText.count',
              {
                length: formatNumber(length),
                limit: formatNumber(limit),
                over: formatNumber(length - limit),
              },
            )}
          </span>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t(
              readOnly
                ? 'posts.media.altText.close'
                : 'posts.media.altText.cancel',
            )}
          </Button>
          {!readOnly && (
            <Button
              type="button"
              onClick={() => void save()}
              loading={saving}
              disabled={over || (!changed && !saving)}
            >
              {t('posts.media.altText.save')}
            </Button>
          )}
        </div>
      </div>
    </ModalContainer>
  )
}
