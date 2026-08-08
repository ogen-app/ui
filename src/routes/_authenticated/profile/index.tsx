import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'

import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { LanguageSection } from '@/components/settings/LanguageSection'
import {
  SettingsSaveButton,
  SettingsSaveProvider,
} from '@/components/settings/settingsSave'
import { ProfileIdentitySection } from '@/components/profile/ProfileIdentitySection'
import { ChangePasswordSection } from '@/components/profile/ChangePasswordSection'
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog'
import { useAuthStore } from '@/stores/authStore'

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
 * by the header's Save button. The password and the deletion do not — each is
 * a discrete action with its own confirmation, not a settings edit.
 */
function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // The route sits under `_authenticated`, so the guard has already resolved a
  // session by the time this renders; the null branch is for the moment
  // between deleting the account and the redirect landing.
  if (!user) {
    return (
      <PageContainer variant="fullFlex">
        <PageHeader title={t('profile.title')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      <SettingsSaveProvider>
        <div className="flex h-0 grow flex-col overflow-y-auto">
          <PageHeader
            title={t('profile.title')}
            fadeOnScroll
            actions={<SettingsSaveButton />}
          />
          <div className="flex flex-col gap-8 px-3 pt-4 pb-10 lg:px-6">
            <ProfileIdentitySection user={user} />
            <LanguageSection />
            <ChangePasswordSection />
            <SettingsCard title={t('profile.dangerZone.title')}>
              <div className="flex flex-col items-start gap-3">
                <p className="max-w-150 text-sm text-tertiary-foreground">
                  {t('profile.dangerZone.body')}
                </p>
                <Button
                  type="button"
                  variant="destructiveInverted"
                  onClick={() => setDeleteOpen(true)}
                >
                  <TrashIcon />
                  {/* Literal caps in the catalogue, not an `uppercase` class —
                      see CLAUDE.md. Every translation keeps them. */}
                  <span>{t('profile.dangerZone.action')}</span>
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
