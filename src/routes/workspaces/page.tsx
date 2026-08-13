import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircleIcon, PlusIcon } from '@phosphor-icons/react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark.tsx'
import { CreateWorkspaceDialog } from '@/components/workspace-settings/CreateWorkspaceDialog'
import { useSwitchWorkspace, useWorkspaces } from '@/hooks/useWorkspaces'
import { useActiveWorkspaceId } from '@/lib/activeWorkspace'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABEL_KEYS, type WorkspaceChoice } from '@/types/workspace'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib'

/**
 * The workspace chooser — a full page, on its own, with no app chrome around
 * it.
 *
 * The decision deserves the room: which client, and who else is in there. What
 * it no longer deserves is ceremony — since CON-147 a switch re-pins this tab
 * and drops its cache, so it is over in a frame, and the other tabs never
 * notice.
 *
 * A 480px column of identical cards, one per workspace. The logo, the title
 * and the account line stay off the cards: they address the page, and the
 * cards are reserved for the things you can actually pick.
 */
export default function WorkspacesPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data: workspaces, isLoading, isError } = useWorkspaces()
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

          {/* One card per workspace, cut to the same pattern as the account
              card above — the only thing that changes between them is what
              they say. The list is short, so each option gets the weight of a
              card rather than a row. */}
          {isLoading ? (
            <Card className="mt-8 text-sm text-tertiary-foreground">
              {t('common.loading')}
            </Card>
          ) : isError || !workspaces ? (
            <Card className="mt-8 text-sm text-destructive">
              {t('workspaces.loadFailed')}
            </Card>
          ) : (
            <ul className="mt-8 flex flex-col gap-2">
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

          <Button
            type="button"
            variant="secondary"
            size="xl"
            className="mt-2 w-full px-10"
            onClick={() => setCreateOpen(true)}
            disabled={isPending}
          >
            <PlusIcon />
            <span>{t('workspaces.create')}</span>
          </Button>
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
          <button
            type="button"
            onClick={() => navigate({ to: '/auth/logout' })}
            className="cursor-pointer underline underline-offset-4 hover:text-primary-foreground"
          >
            {t('workspaces.logOut')}
          </button>
        </p>
      </div>

      <CreateWorkspaceDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </PageContainer>
  )
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('w-full bg-primary px-10 py-6', className)}>{children}</section>
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
        'flex w-full cursor-pointer items-center gap-4 bg-primary px-10 py-6 text-left transition-colors',
        'hover:bg-secondary disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      {/* Same slot as the account card's avatar: square, 48px, unrounded. */}
      <WorkspaceMark
        id={workspace.id}
        name={workspace.name}
        className="size-12 rounded-none text-base"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-regular">{workspace.name}</span>
        <span className="truncate text-xs text-tertiary-foreground">
          {t(ROLE_LABEL_KEYS[workspace.role])} ·{' '}
          {t('workspaces.memberCount', { count: workspace.member_count })}
        </span>
      </span>
      {/* The tab's own workspace is marked, not styled differently: the row it
          sits in stays identical to every other one. */}
      {active ? (
        <span className="flex shrink-0 items-center gap-1 text-xs text-primary-foreground">
          <CheckCircleIcon weight="fill" className="size-3.5 text-positive" />
          {t('workspaces.current')}
        </span>
      ) : null}
    </button>
  )
}
