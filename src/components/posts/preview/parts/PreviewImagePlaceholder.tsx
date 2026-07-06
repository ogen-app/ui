import { ImageIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'

type Props = {
  label?: string
  className?: string
}

// Empty stand-in shown when a post type requires an image but none is
// available yet (images come from the attachment system). Aspect ratio
// is set by the caller per platform/post type.
export function PreviewImagePlaceholder({
  label = 'Image required',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'w-full bg-secondary flex flex-col items-center justify-center gap-2 text-tertiary-foreground',
        className,
      )}
    >
      <ImageIcon className="size-8" />
      <span className="text-xs">{label}</span>
    </div>
  )
}
