import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useEmailPreferences,
  useSetMarketingEmails,
} from '@/hooks/useEmailPreferences'

/**
 * The marketing-email opt-out, from inside the app (CON-155).
 *
 * Deliberately **outside** the page's `SettingsSaveProvider` — it sits with the
 * password change and the account deletion rather than with the name and email
 * fields. A switch reads as applied the moment it moves, and one that quietly
 * queued behind a Save button in the header would leave people believing they
 * had unsubscribed when they hadn't. It writes on flip and springs back if the
 * write fails.
 *
 * The same opt-out is reachable without a session, from the footer of any
 * marketing email (CON-154). Both write the same `email_suppressions` row, so
 * the two can't drift apart.
 */
export function EmailPreferencesSection({ userId }: { userId: string }) {
  const { data, isPending, isError, error } = useEmailPreferences(userId)
  const { mutate, isPending: saving } = useSetMarketingEmails(userId)

  return (
    <SettingsCard title="Email">
      <div className="flex items-start justify-between gap-6">
        <div className="flex max-w-150 flex-col gap-1">
          <p className="text-sm font-medium">Marketing emails</p>
          <p className="text-sm text-tertiary-foreground">
            Onboarding tips and product news. Account emails — password resets and
            the like — are sent either way and can't be turned off.
          </p>
        </div>
        {isError ? null : isPending ? (
          <Skeleton className="mt-1.5 h-[10px] w-[22px] rounded-full" />
        ) : (
          <Switch
            checked={data.marketing}
            // Blocked delivery is not something this toggle can lift, so it
            // must not offer to: see `deliveryBlocked` below.
            disabled={saving || data.deliveryBlocked}
            onCheckedChange={mutate}
            aria-label="Marketing emails"
            className="mt-1.5"
          />
        )}
      </div>

      {isError && (
        // Not a toast: the failure belongs to this row, and the row has to
        // explain why there is no switch in it.
        <p className="text-xs text-destructive">{error.message}</p>
      )}

      {!isError && data?.deliveryBlocked && (
        // Not an Explainer — this is a live warning about the account, and
        // Explainers can be dismissed for good (CLAUDE.md).
        <p className="text-xs text-warning">
          Email to this address bounced or was reported as spam, so nothing is being
          delivered to it — marketing or otherwise. Suppression follows the address,
          not the account, so changing your email above starts delivery again;
          clearing the block on this one needs support.
        </p>
      )}
    </SettingsCard>
  )
}
