import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Explainer } from '@/components/page-primitives/Explainer'
import {
  MAX_SEQUENCE_ITEMS,
  assignAttachment,
  attachmentsByItem,
  insertItemAfter,
  moveItem,
  removeItem,
  type SequenceItemReport,
  type ThreadItem,
} from '@/lib/threadSequence'
import { toast } from '@/stores/toastStore'
import type { UploadResult } from '@/hooks/usePostAttachments'
import type { PostAttachmentWithValidation } from '@/types/attachments'
import { SequenceItemRow } from './SequenceItemRow'

type Props = {
  items: ThreadItem[]
  /** Every report `evaluateSequence` produced, aligned with `items`. */
  reports: SequenceItemReport[]
  attachments: PostAttachmentWithValidation[]
  charLimit: number | null | undefined
  imageCap: number | null | undefined
  platformName: string
  readOnly: boolean
  update: (fn: (items: ThreadItem[]) => ThreadItem[]) => void
  upload: (files: File[]) => Promise<UploadResult>
}

/**
 * The post editor, when the post is a thread sequence (CON-196).
 *
 * It stands in for `PostContentEditor` rather than sitting beside it, which is
 * the whole of the design decision. A sequence has no single body to edit: the
 * post's `content` becomes a derived summary the moment `threadItems` is what
 * publishes ("used only for display and search purposes, it is NOT published"
 * — Zernio), so a screen that showed both would be asking the user to keep two
 * copies of the same words in step, and only one of them would go out.
 */
export function PostSequenceEditor({
  items,
  reports,
  attachments,
  charLimit,
  imageCap,
  platformName,
  readOnly,
  update,
  upload,
}: Props) {
  const { t } = useTranslation()
  const [uploading, setUploading] = useState(false)
  const buckets = attachmentsByItem(items, attachments)
  const full = items.length >= MAX_SEQUENCE_ITEMS

  const setContent = useCallback(
    (index: number, content: string) => {
      update((current) =>
        current.map((item, i) => (i === index ? { ...item, content } : item)),
      )
    },
    [update],
  )

  /**
   * Uploads to the post — attachments are post-level rows, and a sequence
   * changes nothing about that — and then claims the files for the post of the
   * thread the upload was started from. Anything it does not claim rides the
   * root, which is what makes the media card work unchanged.
   */
  const addMedia = useCallback(
    async (index: number, files: File[]) => {
      setUploading(true)
      try {
        const { ids, errors } = await upload(files)
        if (ids.length > 0) {
          update((current) =>
            ids.reduce((acc, id) => assignAttachment(acc, id, index), current),
          )
        }
        if (errors.length > 0) {
          toast.error(t('posts.sequence.uploadFailed'), {
            description: errors.join('\n'),
          })
        }
      } finally {
        setUploading(false)
      }
    },
    [upload, update, t],
  )

  return (
    <div className="flex flex-col">
      <Explainer id="post-thread-sequence" className="mb-6">
        {t('posts.sequence.explainer')}
      </Explainer>

      {reports.map((report, index) => (
        <SequenceItemRow
          key={report.item.id}
          report={report}
          total={items.length}
          attachments={buckets[index] ?? []}
          charLimit={charLimit}
          imageCap={imageCap}
          platformName={platformName}
          readOnly={readOnly}
          uploading={uploading}
          onChange={(content) => setContent(index, content)}
          onInsertAfter={() => update((c) => insertItemAfter(c, index))}
          onRemove={() => update((c) => removeItem(c, index))}
          onMove={(to) => update((c) => moveItem(c, index, to))}
          onAddMedia={(files) => void addMedia(index, files)}
          onMoveMedia={(id, to) => update((c) => assignAttachment(c, id, to))}
        />
      ))}

      <div className="mt-2 flex items-center gap-3 pl-9">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={readOnly || full}
          onClick={() => update((c) => insertItemAfter(c, c.length - 1))}
        >
          <PlusIcon />
          {t('posts.sequence.addPost')}
        </Button>
        {full && (
          <span className="text-xs text-tertiary-foreground">
            {t('posts.sequence.capReached', { max: MAX_SEQUENCE_ITEMS })}
          </span>
        )}
      </div>
    </div>
  )
}
