import { useMemo, useState } from 'react'
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
import { useAssets } from '@/hooks/useContent'
import { formatTitle } from '@/lib'
import { sha256Hex } from '@/lib/fileChecksum'
import { uploadErrorMessage } from '@/lib/uploadError'
import {
  formatBytes,
  uploadLimitLines,
  validateUploadFile,
  type UploadValidation,
} from '@/lib/assetStatus'
import type { Asset } from '@/types/content'

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
 *
 * The staged list is also where a file already in the workspace is recognised,
 * because this is the last moment saying so is useful. The server dedupes an
 * identical image by checksum and answers with the asset it already has, so
 * the upload's whole visible effect is that nothing appears — no new row, and
 * not even a changed timestamp on the one that was already there. Hashing the
 * file here turns that silence into a sentence naming the document.
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
  /**
   * Staged image → the SHA-256 of its bytes, once it has been computed.
   *
   * Keyed by the `File` itself, which is a stable identity for as long as it
   * is staged, so nothing has to survive a reorder or a removal. A file that
   * has no entry is one still hashing, one that isn't an image, or one whose
   * hash failed — all three mean the same thing here: no answer yet, say
   * nothing.
   */
  const [checksums, setChecksums] = useState<Map<File, string>>(new Map())

  /**
   * Every image the workspace already holds, by checksum.
   *
   * Workspace-wide rather than this campaign's, because that is the scope the
   * server dedupes in: a document another campaign uploaded is the row a
   * duplicate here would resolve to. Only fetched while the modal is open —
   * the list is normally already in cache behind it, and on a post screen it
   * isn't.
   */
  const { data: assets } = useAssets({ enabled: isOpen })
  const byChecksum = useMemo(() => {
    const map = new Map<string, Asset>()
    for (const asset of assets ?? []) {
      const sum = asset.file?.checksum_sha256
      if (sum) map.set(sum.toLowerCase(), asset)
    }
    return map
  }, [assets])

  const reset = () => {
    setStaged([])
    setChecksums(new Map())
  }

  const close = () => {
    reset()
    onClose()
  }

  const addFiles = (files: File[]) => {
    setStaged((prev) => [...prev, ...files])
    for (const file of files) {
      // Only what the server would dedupe, and only after validation has
      // passed it: the image cap is what keeps this to a 10 MB buffer, and a
      // file that is going to be refused anyway has nothing to compare.
      const validation = validateUploadFile(file)
      if (!validation.ok || validation.kind !== 'image') continue
      void sha256Hex(file)
        .then((hex) =>
          setChecksums((prev) => new Map(prev).set(file, hex.toLowerCase())),
        )
        // A hash we can't compute costs a warning, not an upload. The file is
        // staged either way.
        .catch(() => {})
    }
  }

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
          {uploadLimitLines(t).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>{t('uploads.pdfNote')}</p>
        </div>

        <Dropzone onFiles={addFiles} />

        {staged.length > 0 && (
          <ul className="flex flex-col gap-2">
            {staged.map((file, index) => {
              const validation = validateUploadFile(file)
              const checksum = checksums.get(file)
              const duplicate = checksum ? byChecksum.get(checksum) : undefined
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
                  {/* The name, and under it whatever there is to say about
                      this particular file — which is nothing at all for most
                      of them, so the row stays one line until it isn't. */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm text-foreground">
                      {file.name}
                    </p>
                    {duplicate && (
                      <p className="truncate text-xs text-warning">
                        {t('uploads.duplicate', {
                          title: formatTitle(duplicate.title),
                        })}
                      </p>
                    )}
                  </div>
                  {validation.ok ? (
                    <p className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
                      {formatBytes(file.size)}
                    </p>
                  ) : (
                    <p className="shrink-0 text-xs text-destructive">
                      {uploadErrorMessage(t, validation.error)}
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
