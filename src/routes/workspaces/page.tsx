import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { NewCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/Logo'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark.tsx'
import { CreateWorkspaceDialog } from '@/components/workspace-settings/CreateWorkspaceDialog'
import { useSwitchWorkspace, useWorkspaces } from '@/hooks/useWorkspaces'
import { useActiveWorkspaceId } from '@/lib/activeWorkspace'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABEL_KEYS, type WorkspaceChoice } from '@/types/workspace'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib'
import { awaiting } from '@/lib/fetched'
import { TextButton } from '@/components/ui/text-button'

/**
 * The workspace chooser — a full page, on its own, with no app chrome around
 * it.
 *
 * The decision deserves the room: which client, and who else is in there. What
 * it no longer deserves is ceremony — since CON-147 a switch re-pins this tab
 * and drops its cache, so it is over in a frame, and the other tabs never
 * notice.
 *
 * A 480px column of identical cards, one per workspace, and the app's
 * `NewCard` after them for the one that isn't there yet. The logo, the title
 * and the account line stay off the cards: they address the page, and the
 * cards are reserved for the things you can actually pick. Centred, unlike
 * the app's pages, because it is a door into the app rather than a page in
 * it — the sign-in screens' layout, not the app's.
 */
export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const query = useWorkspaces()
  const { data: workspaces, isError } = query
  const { mutate: switchTo, isPending } = useSwitchWorkspace()
  const [createOpen, setCreateOpen] = useState(false)
  // Which workspace *this* tab is in. Not a field on the row: the server has no
  // idea, because the tab is what decides (`lib/activeWorkspace`).
  const activeId = useActiveWorkspaceId()

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  const handleOpen = (workspace: WorkspaceChoice) => {
    // Already here — nothing to re-pin, just go back into the app.
    if (workspace.id === activeId) {
      void navigate({ to: '/' })
      return
    }
    switchTo(workspace.id, {
      onError: (err) =>
        toast.error(t('workspaces.switchFailed'), {
          description: err instanceof Error ? err.message : undefined,
        }),
    })
  }

  return (
    <PageContainer variant="fullscreen">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-[480px] flex-col">
          <div className="flex flex-col items-center gap-5 text-center">
            <Logo className="size-12" />
            <h1 className="font-display text-[2rem] leading-12 font-medium tracking-tight">
              {t('workspaces.title')}
            </h1>
          </div>

          {/* One card per workspace — the only thing that changes between
              them is what they say. The list is short, so each option gets
              the weight of a card rather than a row. */}
          {/* `awaiting`, not `isLoading` — see `lib/fetched`. */}
          {awaiting(query) ? (
            <div className="mt-8 flex flex-col gap-2" aria-hidden>
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          ) : isError || !workspaces ? (
            <p role="alert" className="mt-8 text-sm text-destructive">
              {t('workspaces.loadFailed')}
            </p>
          ) : (
            <ul className="page-content-motion mt-8 flex flex-col gap-2">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <WorkspaceCard
                    workspace={w}
                    active={w.id === activeId}
                    busy={isPending}
                    onSelect={() => handleOpen(w)}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2">
            <NewCard
              label={t('workspaces.create')}
              hint={t('workspaces.createHint')}
              onClick={() => setCreateOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Whose workspaces these are, and the way out if the answer is "not
          mine". Pinned to the foot of the screen: it's the footnote to the
          choice, not part of it. */}
      <div className="flex flex-col items-center px-4 pb-4 text-center text-sm text-tertiary-foreground">
        <p>
          {t('workspaces.loggedInAs')}{' '}
          <span className="font-medium text-primary-foreground">
            {fullName || user?.email}
          </span>
        </p>
        <p>
          {t('workspaces.wrongAccount')}{' '}
          <TextButton
            tone="quiet"
            onClick={() => navigate({ to: '/auth/logout' })}
          >
            {t('workspaces.logOut')}
          </TextButton>
        </p>
      </div>

      <CreateWorkspaceDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </PageContainer>
  )
}

function WorkspaceCard({
  workspace,
  active,
  busy,
  onSelect,
}: {
  workspace: WorkspaceChoice
  active: boolean
  busy: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={busy}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-4 rounded-md border border-border bg-primary p-6 text-left transition-shadow duration-150',
        'hover:shadow-lg disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      <WorkspaceMark
        id={workspace.id}
        name={workspace.name}
        className="size-10 rounded-md text-sm"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-lg font-medium tracking-tight">
          {workspace.name}
        </span>
        <span className="truncate text-xs text-tertiary-foreground">
          {t(ROLE_LABEL_KEYS[workspace.role])} ·{' '}
          {t('workspaces.memberCount', { count: workspace.member_count })}
        </span>
      </span>
      {/* The tab's own workspace is marked, not styled differently: the row it
          sits in stays identical to every other one. */}
      {active && (
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-tertiary-foreground">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={16}
            strokeWidth={1.5}
            className="text-positive"
            aria-hidden
          />
          {t('workspaces.current')}
        </span>
      )}
      {/* A door, as every card that opens something has: the caret, and the
          lift on hover. */}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={16}
        strokeWidth={2}
        className="shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
        aria-hidden
      />
    </button>
  )
}
