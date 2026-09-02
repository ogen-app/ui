import { useTranslation } from 'react-i18next'
import { Collapse } from '@/components/ui/collapse'
import { PostSourcesControl } from '@/components/posts/sources/PostSourcesControl'
import { isSubmitted } from '@/lib/postStatusMachine'
import type { Post } from '@/types/posts'

type Props = {
  post: Post
  changeDoc: (fn: (p: Post) => void) => void
}

/**
 * Sources as a settings section, alongside the card in the body.
 *
 * Deliberately the same control, not a summary of it: adding a document is the
 * point of coming here, and a section that could only show what was already
 * attached would send the reader back to the body to do anything about it.
 *
 * Open by default, and it carries the count in the collapse header so a
 * collapsed panel still answers "does this post read from anything".
 *
 * On a submitted post the section stays and the ways to change it go — see
 * `PostSourcesControl`'s `locked`. It is still worth opening: what a post read
 * from is the most interesting thing about it after the words themselves.
 */
export function PostSourcesSection({ post, changeDoc }: Props) {
  const { t } = useTranslation()
  const count = post.used_asset_ids.length
  return (
    <Collapse
      title={t('posts.sources.sectionTitle')}
      meta={count > 0 ? count : undefined}
      defaultOpen
    >
      <PostSourcesControl
        post={post}
        changeDoc={changeDoc}
        layout="rail"
        locked={isSubmitted(post.status)}
      />
    </Collapse>
  )
}
