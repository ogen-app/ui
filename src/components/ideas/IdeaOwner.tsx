import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFeatureFlag } from '@/config/featureFlags'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import {
  readIdeaOwner,
  subscribeIdeaOwners,
  writeIdeaOwner,
} from '@/services/api/ideaOwnerLocal'
import type { WorkspaceMember } from '@/types/workspace'

/**
 * An idea's owner, as the card shows it (`idea-owner`).
 *
 * **One member owns everything, and nobody is asked.** A workspace of one has
 * a single possible answer, so offering the question is noise: the owner is
 * that member, stated, with no picker and no *No owner* to fall back to. It is
 * derived rather than stored, so nothing has to be written for it and nothing
 * goes stale when a second member joins — from then on an idea nobody chose
 * for reads as unowned, and the picker appears.
 *
 * A stored owner who has since left the workspace reads as no owner, the same
 * way: a name nobody in the list answers to is not somebody to go and ask.
 */
function useIdeaOwner(ideaId: string): {
  owner: WorkspaceMember | null
  members: WorkspaceMember[]
  /** True when there is nobody else it could be — the picker is withheld. */
  fixed: boolean
} {
  const members = useWorkspaceMembers().data ?? []
  const stored = useSyncExternalStore(subscribeIdeaOwners, () =>
    readIdeaOwner(ideaId),
  )
  const fixed = members.length === 1
  const owner = fixed
    ? members[0]
    : (members.find((m) => m.id === stored) ?? null)
  return { owner, members, fixed }
}

/** The card's owner line: a name, and — when there is a choice — the way to change it. */
export function IdeaOwnerLine({ ideaId }: { ideaId: string }) {
  const enabled = useFeatureFlag('idea-owner')
  if (!enabled) return null
  return <OwnerLine ideaId={ideaId} />
}

function OwnerLine({ ideaId }: { ideaId: string }) {
  const { t } = useTranslation()
  const { owner, members, fixed } = useIdeaOwner(ideaId)
  // Before the members arrive there is no answer to state, fixed or chosen.
  if (members.length === 0) return null

  return (
    <div className="flex items-center gap-2 text-xs text-secondary-foreground">
      <span>{t('ideas.card.owner')}</span>
      {fixed ? (
        <span className="max-w-48 truncate text-sm text-foreground">
          {owner?.name}
        </span>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2">
              <span className="max-w-48 truncate text-foreground">
                {owner?.name ?? t('ideas.card.noOwner')}
              </span>
              <span className="text-accent">{t('ideas.card.change')}</span>
              <CaretDownIcon className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            <DropdownMenuItem onSelect={() => writeIdeaOwner(ideaId, null)}>
              {t('ideas.card.noOwner')}
            </DropdownMenuItem>
            {members.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onSelect={() => writeIdeaOwner(ideaId, member.id)}
              >
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
