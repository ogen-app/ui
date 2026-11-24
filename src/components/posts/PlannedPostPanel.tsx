import { HugeiconsIcon } from '@hugeicons/react'
import { Idea01Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { usePostIdeas } from '@/hooks/useIdeaPosts'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { Post } from '@/types/posts'

/**
 * What a planned post is waiting for (CON-449): it holds a title and its
 * theses, compiled from ideas, and no body yet — on purpose. Write the post
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

  // Ogen's action, and the card's point: black, with the mark.
  return (
    <Card
      title={t('ideas.lifecycle.noBody')}
      action={{
        label: t('ideas.lifecycle.write'),
        icon: 'ogen',
        accent: true,
        onClick: write,
      }}
    >
      <p className="text-sm">{t('ideas.lifecycle.noBodyHint')}</p>
    </Card>
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
      <Card
        title={t('ideas.lifecycle.builtFromTitle')}
        action={{
          label: ideas.isFetching ? t('common.trying') : t('common.tryAgain'),
          disabled: ideas.isFetching,
          onClick: () => void ideas.refetch(),
        }}
      >
        <p className="text-sm">{t('ideas.lifecycle.builtFromFailed')}</p>
      </Card>
    )
  }
  const list = ideas.data ?? []
  if (list.length === 0) return null
  return (
    <Card title={t('ideas.lifecycle.builtFrom', { count: list.length })}>
      <ul className="-mb-2.5 flex flex-col">
        {list.map((idea) => (
          <li
            key={idea.id}
            className="flex items-center gap-2 border-t border-border py-2.5 text-sm text-foreground"
          >
            <HugeiconsIcon
              icon={Idea01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-tertiary-foreground"
            />
            <span className="min-w-0 truncate">{idea.title}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
