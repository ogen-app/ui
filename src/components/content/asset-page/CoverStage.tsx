import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Dialog from '@radix-ui/react-dialog'
import { MagnifyingGlassPlusIcon, XIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex'

/**
 * A PDF's first page on the stage, and the whole of it on demand (CON-366).
 *
 * On the stage it is cropped from the top — the title of a document is where
 * its first page starts — and its foot fades into the column, so the crop
 * reads as the page going on rather than being cut. The crop is the stage's
 * own, so the fade always sits on the foot of what is *shown*.
 *
 * Hovering shows a zoom mark in the corner; a click (or Enter) opens the page
 * whole, over a dark full-screen backdrop. Escape, a click anywhere or the
 * close button put it away.
 */
export function CoverStage({
  src,
  title,
  onError,
}: {
  src: string
  /** The asset's title — the overlay's accessible name. */
  title: string
  onError: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t('assetInsights.cover.zoom')}
          className="group relative block max-h-80 w-full cursor-zoom-in overflow-hidden outline-none lg:max-h-[560px]"
        >
          <img
            src={src}
            alt=""
            onError={onError}
            className="block w-full bg-secondary"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-primary"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-primary-foreground/80 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <MagnifyingGlassPlusIcon className="size-5" />
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-primary-foreground/90 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          style={{ zIndex: ZIndex.modalOverlay }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          onClick={() => setOpen(false)}
          className="fixed inset-0 flex cursor-zoom-out items-center justify-center p-6 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          style={{ zIndex: ZIndex.modalContent }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <img
            src={src}
            alt={title}
            className="max-h-full max-w-full bg-primary object-contain shadow-2xl"
          />
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label={t('assetInsights.cover.close')}
              className="absolute right-5 top-5 flex size-10 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
            >
              <XIcon className="size-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
