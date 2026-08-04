import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

/**
 * The account, as opposed to the workspace.
 *
 * A placeholder: the API has no endpoint for changing a user's own name,
 * email or password yet, so this only shows what the session already knows.
 * It exists because the account menu needs somewhere to send "Profile" —
 * personal details do not belong in Workspace Settings, which is shared by
 * everyone in the workspace.
 */
function ProfilePage() {
  const { user } = useAuthStore()

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'

  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-0 grow flex-col overflow-y-auto">
        <PageHeader title="Profile" fadeOnScroll />
        <div className="flex flex-col gap-8 px-3 pt-4 pb-10 lg:px-6">
          <SettingsCard title="Account">
            <div className="flex items-center gap-4">
              <Avatar className="size-12">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-base font-medium">{fullName}</p>
                <p className="truncate text-sm text-tertiary-foreground">{user?.email}</p>
              </div>
            </div>
            <p className="max-w-150 text-sm text-tertiary-foreground">
              Changing your name, email or password isn't available yet — the API has no
              endpoint for it. Workspace-level settings, including who else has access,
              live in Workspace Settings.
            </p>
          </SettingsCard>
        </div>
      </div>
    </PageContainer>
  )
}
