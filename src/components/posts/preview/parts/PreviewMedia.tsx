import { cn } from '@/lib'
import type { PreviewMediaInfo } from '../types'
import { PreviewImagePlaceholder } from './PreviewImagePlaceholder'

type Props = {
  media: PreviewMediaInfo
  // Sizing for the empty required placeholder.
  placeholderClassName?: string
  // Sizing for a rendered inline image.
  imageClassName?: string
}

// Renders the post's media slot:
//  - image found      -> the first inline content image (mandatory or not)
//  - none + mandatory -> empty required placeholder
//  - none + optional  -> nothing
export function PreviewMedia({ media, placeholderClassName, imageClassName }: Props) {
  if (media.imageUrl) {
    return (
      <img
        src={media.imageUrl}
        alt=""
        className={cn('w-full object-cover', imageClassName)}
      />
    )
  }
  if (media.required) {
    return <PreviewImagePlaceholder className={placeholderClassName} />
  }
  return null
}
