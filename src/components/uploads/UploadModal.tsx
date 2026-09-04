import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  FilePdfIcon,
  ImageSquareIcon,
  NoteIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Dropzone } from './Dropzone'
import { useUploadStore } from '@/stores/uploadStore'
import {
  formatBytes,
  uploadLimitLines,
  validateUploadFile,
  type UploadValidation,
} from '@/lib/assetStatus'
import { useUploadOptions } from '@/hooks/useUploadOptions'

type Props = {
  isOpen: boolean
  onClose: () => void
  /** The campaign the files join, or null to upload to the workspace bank. */
  campaignId: string | null
  /**
   * The post that should read from them, when the upload started on one. The
   * files still join the campaign — a post is inside one.
   */
  postId?: string | null
}

/**
 * Modal entry point for uploads: shows the limits, a drop zone, and a staged
 * file list the user reviews before clicking Upload. Progress then continues
 * non-blocking in the UploadTracker, so the modal closes on submit.
 */
export function UploadModal({
  isOpen,
  onClose,
  campaignId,
  postId = null,
}: Props) {
  const { t } = useTranslation()
  const enqueue = useUploadStore((s) => s.enqueue)
  const [staged, setStaged] = useState<File[]>([])
  const options = useUploadOptions()

  const reset = () => setStaged([])

  const close = () => {
    reset()
    onClose()
  }

  const addFiles = (files: File[]) => setStaged((prev) => [...prev, ...files])

  const removeStaged = (index: number) =>
    setStaged((prev) => prev.filter((_, i) => i !== index))

  const handleUpload = () => {
    if (staged.length === 0) return
    enqueue(staged, { campaignId, postId })
    close()
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={close}
      title={
        postId
          ? 'Add to this post'
          : campaignId
            ? 'Add to this campaign'
            : 'Add to the content bank'
      }
      size="large"
    >
      <div className="flex flex-col gap-4">
        {/* One fact per line. These are three separate answers — what it takes,
            how big, and why a PDF is not readable the moment it lands — and
            running them together as a sentence made the reader parse all three
            to find the one they came for. */}
        <div className="flex flex-col text-sm text-tertiary-foreground">
          {uploadLimitLines(t, options).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>{t('uploads.pdfNote')}</p>
        </div>

        <Dropzone onFiles={addFiles} />

        {staged.length > 0 && (
          <ul className="flex flex-col gap-2">
            {staged.map((file, index) => {
              const validation = validateUploadFile(file, options)
              return (
                // Bordered, so a staged file reads as an object that is now
                // sitting here rather than a line of text about one. One line:
                // what kind of file, which file, how big — read left to right,
                // with the sizes in a column of their own so a list of them can
                // be compared down the page instead of hunted for.
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 border border-quaternary px-3 py-2"
                >
                  <StagedGlyph validation={validation} />
                  <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {file.name}
                  </p>
                  {validation.ok ? (
                    <p className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
                      {formatBytes(file.size)}
                    </p>
                  ) : (
                    <p className="shrink-0 text-xs text-destructive">
                      {validation.error}
                    </p>
                  )}
                  {/* A bin rather than an ✕. The modal's own close control is
                      already an ✕ in the corner, and a column of them down the
                      list turns the one that dismisses the whole dialog into
                      just another one of them. */}
                  <Button
                    variant="ghost"
                    size="smIcon"
                    onClick={() => removeStaged(index)}
                    aria-label={t('uploads.remove', { name: file.name })}
                  >
                    <TrashIcon className="size-4 text-tertiary-foreground" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Both filled, so they read as buttons on the modal's white. Upload
            takes the brand teal the moment there is something to upload —
            the colour is the answer to "is this going to do anything yet",
            which is otherwise only legible from a disabled grey. */}
        <div className="flex justify-end gap-2">
          <Button variant="neutral" size="lg" onClick={close}>
            {t('uploads.cancel')}
          </Button>
          <Button
            variant={staged.length > 0 ? 'accent' : 'neutral'}
            size="lg"
            onClick={handleUpload}
            disabled={staged.length === 0}
          >
            {staged.length > 0
              ? t('uploads.submitCount', { n: staged.length })
              : t('uploads.submit')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}

/**
 * What kind of file is about to be uploaded, before its name.
 *
 * The same three glyphs the list uses for the assets these become
 * (`AssetGlyph`), so a file looks like the thing it is about to turn into
 * rather than being introduced by one icon here and a different one there.
 * That component takes an `Asset`, though, and a staged file is not one yet —
 * it has no id, no status and no server-assigned type — so the kind comes off
 * the same validation the row already ran.
 *
 * A file the bank will not take gets a warning instead: the row's message
 * explains why, and leading it with a document glyph would say "this is a
 * document" first and "which we refuse" second.
 */
function StagedGlyph({ validation }: { validation: UploadValidation }) {
  if (!validation.ok) {
    return <WarningIcon className="size-5 shrink-0 text-destructive" />
  }
  const Icon =
    validation.kind === 'image'
      ? ImageSquareIcon
      : validation.kind === 'pdf'
        ? FilePdfIcon
        : NoteIcon
  return <Icon className="size-5 shrink-0 text-tertiary-foreground" />
}
