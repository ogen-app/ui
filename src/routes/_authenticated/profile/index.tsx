import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TrashIcon } from '@phosphor-icons/react'

import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  SettingsSaveButton,
  SettingsSaveProvider,
} from '@/components/settings/settingsSave'
import { ProfileIdentitySection } from '@/components/profile/ProfileIdentitySection'
import { PasswordSection } from '@/components/profile/PasswordSection'
import { EmailPreferencesSection } from '@/components/profile/EmailPreferencesSection'
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog'
import { useAuthStore } from '@/stores/authStore'
import { useFeatureFlag } from '@/config/featureFlags'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

/**
 * The account, as opposed to the workspace.
 *
 * Personal details do not belong in Workspace Settings, which everyone in the
 * workspace shares — so name, email, password and account deletion all live
 * here, and this is where the account menu's "Profile" lands.
 *
 * Name and email follow the Workspace Settings pattern: edited inline, applied
 * by the header's Save button. The password, the marketing-email switch and
 * the deletion do not — each takes effect on its own, as a discrete action
 * rather than a pending settings edit. The password isn't even changed here:
 * see `PasswordSection`.
 */
function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const emailPreferencesEnabled = useFeatureFlag('email-preferences')

  // The route sits under `_authenticated`, so the guard has already resolved a
  // session by the time this renders; the null branch is for the moment
  // between deleting the account and the redirect landing.
  if (!user) {
    return (
      <PageContainer variant="fullFlex">
        <PageHeader title="Profile" />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      <SettingsSaveProvider>
        <div className="flex h-0 grow flex-col overflow-y-auto">
          <PageHeader title="Profile" fadeOnScroll actions={<SettingsSaveButton />} />
          <div className="flex flex-col gap-8 px-3 pt-4 pb-10 lg:px-6">
            <ProfileIdentitySection user={user} />
            <PasswordSection />
            {emailPreferencesEnabled && <EmailPreferencesSection userId={user.id} />}
            <SettingsCard title="Danger Zone">
              <div className="flex flex-col items-start gap-3">
                <p className="max-w-150 text-sm text-tertiary-foreground">
                  Deleting your account also deletes the campaigns, posts and assets you
                  created in this workspace. This cannot be undone.
                </p>
                <Button
                  type="button"
                  variant="destructiveInverted"
                  onClick={() => setDeleteOpen(true)}
                >
                  <TrashIcon />
                  {/* Literal caps, not `uppercase` — see CLAUDE.md. */}
                  <span>DELETE ACCOUNT</span>
                </Button>
              </div>
            </SettingsCard>
          </div>
        </div>
      </SettingsSaveProvider>
      <DeleteAccountDialog
        user={user}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </PageContainer>
  )
}

export default ProfilePage
