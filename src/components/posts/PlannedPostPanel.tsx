import { LightbulbIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { usePostIdeas } from '@/hooks/useIdeaPosts'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Post } from '@/types/posts'

/**
 * What a planned post is waiting for (CON-449): it holds a title and its
 * theses, compiled from ideas, and no body yet — on purpose. WRITE THE POST
 * asks the post's own assistant to write it, filled into the composer and
 * never sent, the same rule as every other prefill: the user gets the last
 * word. Once a body lands the server moves the post to draft and this goes.
 */
export function PlannedPostPanel({ post }: { post: Post }) {
  const { t } = useTranslation()
  const askFor = useAssistantStore((s) => s.askFor)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  if (post.status !== 'planned' || post.content.trim()) return null

  const write = () => {
    openRightPanel('assistant')
    askFor(
      threadIdFor({
        kind: 'post',
        postId: post.id,
        campaignId: post.campaign_id,
      }),
      t('ideas.lifecycle.writePrompt'),
    )
  }

  return (
    <div className="flex items-center gap-6 border border-dashed border-quinary-foreground bg-primary px-6 py-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {t('ideas.lifecycle.noBody')}
        </p>
        <p className="text-sm text-secondary-foreground">
          {t('ideas.lifecycle.noBodyHint')}
        </p>
      </div>
      <Button variant="defaultInverted" onClick={write}>
        {t('ideas.lifecycle.write')}
      </Button>
    </div>
  )
}

/**
 * The ideas a post was built from — the provenance a compile or a draft
 * stamps (CON-449, D8). Drawn for any post that has them, planned or not.
 */
export function BuiltFromIdeas({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const ideas = usePostIdeas(postId)
  // A failed read is said as such, not drawn as a post built from nothing.
  if (ideas.isError) {
    return (
      <section className="flex items-center gap-4 bg-primary px-10 py-6">
        <p className="min-w-0 flex-1 text-sm text-secondary-foreground">
          {t('ideas.lifecycle.builtFromFailed')}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={ideas.isFetching}
          onClick={() => void ideas.refetch()}
        >
          {ideas.isFetching ? t('common.trying') : t('common.tryAgain')}
        </Button>
      </section>
    )
  }
  const list = ideas.data ?? []
  if (list.length === 0) return null
  return (
    <section className="flex flex-col bg-primary px-10 py-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-tertiary-foreground">
        {t('ideas.lifecycle.builtFrom', { count: list.length })}
      </h2>
      <ul className="flex flex-col">
        {list.map((idea) => (
          <li
            key={idea.id}
            className="flex items-center gap-2 border-t border-border py-2.5 text-sm text-foreground"
          >
            <LightbulbIcon
              aria-hidden
              className="size-4 shrink-0 text-tertiary-foreground"
            />
            <span className="min-w-0 truncate">{idea.title}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
