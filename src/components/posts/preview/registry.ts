import type { PreviewComponent } from './types'
import { LinkedInPost } from './linkedin/LinkedInPost'
import { ThreadsPost } from './threads/ThreadsPost'
import {
  LINKEDIN_PLATFORM_ID,
  THREADS_PLATFORM_ID,
} from '@/lib/platformDictionary'

// platformId -> post-type slug -> layout. Text and image posts share a
// platform layout (the media slot resolves the difference). Extend by
// adding entries; unmapped combinations fall back to GenericPreview via
// the dispatcher.
const REGISTRY: Record<string, Record<string, PreviewComponent>> = {
  [LINKEDIN_PLATFORM_ID]: {
    'text-post': LinkedInPost,
    'image-post': LinkedInPost,
  },
  [THREADS_PLATFORM_ID]: {
    'text-post': ThreadsPost,
    'image-post': ThreadsPost,
  },
}

export function getPreviewLayout(
  platformId: string,
  postType: string,
): PreviewComponent | undefined {
  return REGISTRY[platformId]?.[postType]
}
