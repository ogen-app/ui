import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Logout03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'

import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { Card } from '@/components/ui/card'
import { LanguageSection } from '@/components/settings/LanguageSection'
import {
  SettingsSaveBar,
  SettingsSaveProvider,
} from '@/components/settings/settingsSave'
import { PAGE_ACTION_BAR_INSET } from '@/components/page-primitives/PageActionBar'
import { cn } from '@/lib'
import { ProfileIdentitySection } from '@/components/profile/ProfileIdentitySection'
import { EmailPreferencesSection } from '@/components/profile/EmailPreferencesSection'
import { LeaveWorkspaceDialog } from '@/components/profile/LeaveWorkspaceDialog'
import { SignInMethodsSection } from '@/components/profile/SignInMethodsSection'
import { useAuthStore } from '@/stores/authStore'
import { useFeatureFlag } from '@/config/featureFlags'
import { useGoogleLinkResult } from '@/hooks/useGoogleLinkResult'

/**
 * Where connecting Google from the Sign-in methods card comes back to
 * (CON-396): `?linked=google` on success, `?error=<code>` otherwise. Both are
 * read once, said as a toast and dropped from the address.
 */
const profileSearchSchema = z.object({
  linked: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/profile/')({
  validateSearch: profileSearchSchema,
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
 * by the Save bar at the bottom. The password, the marketing-email switch and
 * the deletion do not — each takes effect on its own, as a discrete action
 * rather than a pending settings edit. The password isn't even changed here:
 * see `SignInMethodsSection`.
 */
function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const emailPreferencesEnabled = useFeatureFlag('email-preferences')
  useGoogleLinkResult()

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
    <PageContainer variant="fullFlex" className="page-content-motion">
      <SettingsSaveProvider>
        {/* The scroller is nested inside a positioned wrapper so the save bar
            can anchor to the column without scrolling away with the cards. */}
        <div className="relative flex h-0 grow flex-col">
          <div className="flex h-0 grow flex-col overflow-y-auto">
            <PageHeader title={t('profile.title')} scrollAway />
            <div
              className={cn(
                'flex flex-col gap-8 px-3 pt-4 lg:px-6',
                PAGE_ACTION_BAR_INSET,
              )}
            >
              <ProfileIdentitySection user={user} />
              <LanguageSection />
              <SignInMethodsSection />
              {emailPreferencesEnabled && (
                <EmailPreferencesSection userId={user.id} />
              )}
              {/* The button in the body, as in every Danger Zone. */}
              <Card title={t('profile.dangerZone.title')} capped>
                <p className="max-w-150 text-sm text-tertiary-foreground">
                  {t('profile.dangerZone.body')}
                </p>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <HugeiconsIcon icon={Logout03Icon} strokeWidth={1.5} />
                    <span>{t('profile.dangerZone.action')}</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          <SettingsSaveBar />
        </div>
      </SettingsSaveProvider>
      <LeaveWorkspaceDialog
        user={user}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </PageContainer>
  )
}

export default ProfilePage
