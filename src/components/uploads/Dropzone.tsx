import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadSimpleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { UPLOAD_ACCEPT } from '@/lib/assetStatus'

type Props = {
  onFiles: (files: File[]) => void
  className?: string
}

/**
 * Click-to-browse + native drag-and-drop target for the file types the bank
 * takes — .md, .pdf and images.
 *
 * Drawn as an outline rather than a filled slab: a dashed rectangle is the
 * shape every application uses for "put something here", and it reads as an
 * empty space waiting to be filled, which is what it is. A fill made it look
 * like a card that already held something.
 *
 * It no longer repeats the limits — the modal states them directly above, and
 * saying them twice in one dialog made the zone itself hard to find.
 */
export function Dropzone({ onFiles, className }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const open = () => inputRef.current?.click()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const files = Array.from(e.dataTransfer.files)
        if (files.length) onFiles(files)
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-10 text-center cursor-pointer transition-colors outline-none',
        'border border-dashed',
        // The drag state deepens the outline rather than filling the box: a
        // fill appearing under the cursor mid-drag reads as "dropped already".
        dragging
          ? 'border-foreground'
          : 'border-quaternary hover:border-tertiary-foreground',
        className,
      )}
    >
      <UploadSimpleIcon className="size-6 text-tertiary-foreground" />
      <p className="text-sm text-foreground">{t('uploads.browse')}</p>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
