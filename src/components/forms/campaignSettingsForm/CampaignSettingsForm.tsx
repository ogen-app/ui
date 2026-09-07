import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Input } from '@/components/ui/input'
import { TagsInput } from '@/components/ui/tags-input'
import { Button } from '@/components/ui/button'
import { ArchiveIcon, TrashIcon } from '@phosphor-icons/react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  useArchiveCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
} from '@/hooks/useCampaigns'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { campaignToPayload } from '@/lib/campaignPayload'
import type { Campaign } from '@/types/campaigns'

/**
 * The record's own fields — what the campaign is filed as, not what it is for.
 */
const settingsSchema = z.object({
  name: z.string(),
  tag_ids: z.array(z.string()),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

type Props = {
  campaign: Campaign
}

/**
 * Campaign settings — what you do *to* the campaign.
 *
 * **Why so little is here.** Everything that says what the campaign is meant
 * to achieve — its messaging, window, type, post goal, schedule, channels and
 * budget — moved to Strategy, which is a section of the campaign rather than a
 * utility. What is left is the record: what it is called, how it is filed, and
 * the two ways to stop it existing. That is the same kind of thing the
 * workspace's own settings hold, which is why this page answers to the same
 * gear in the rail's footer at both levels.
 *
 * The name is here rather than on Strategy on purpose. Renaming is the one
 * edit that changes nothing about what the campaign does — every other screen
 * would still plan, generate and schedule identically — so it belongs with
 * archive and delete, beside the other operations on the row.
 */
export function CampaignSettingsForm({ campaign }: Props) {
  const form = useForm<SettingsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsSchema as any),
    defaultValues: { name: campaign.name, tag_ids: campaign.tag_ids ?? [] },
  })

  const { t } = useTranslation()
  const { mutate: deleteCampaign, isPending: deleting } = useDeleteCampaign()
  const { mutate: archiveCampaign, isPending: archiving } = useArchiveCampaign()
  const navigate = useNavigate()

  // No autosave here: edits mark the page dirty and are applied by the
  // header's Save button (settingsSave context), like the strategy page.
  const { isDirty } = form.formState
  const { mutateAsync: updateCampaign } = useUpdateCampaign()
  const save = useCallback(async () => {
    const v = form.getValues()
    const payload = campaignToPayload(campaign, {
      // A blank name would leave the campaign with no handle anywhere it is
      // listed; the space is what the server accepts as "untitled".
      name: v.name.trim() === '' ? ' ' : v.name,
      tag_ids: v.tag_ids,
    })
    await updateCampaign({ id: campaign.id, payload })
    // Re-baseline so the form is pristine against what was just saved.
    form.reset(v)
  }, [campaign, form, updateCampaign])
  useRegisterSettingsSave('campaign-settings', isDirty, save)

  const displayName = () =>
    campaign.name.trim() === '' ? t('campaigns.untitled') : `"${campaign.name}"`

  const handleDelete = () => {
    if (
      !window.confirm(
        t('campaigns.dangerZone.confirm', { name: displayName() }),
      )
    )
      return
    deleteCampaign(campaign.id, {
      onSuccess: () => {
        navigate({ to: '/campaigns' })
      },
    })
  }

  /**
   * Archiving leaves the campaign whole, so it asks once and then leaves —
   * for the archive rather than the campaigns list, because the campaign is
   * about to vanish from that list and landing on the screen that no longer
   * shows it reads as a delete.
   */
  const handleArchive = () => {
    if (
      !window.confirm(
        t('campaigns.archiveCard.confirm', { name: displayName() }),
      )
    )
      return
    archiveCampaign(campaign.id, {
      onSuccess: () => {
        navigate({ to: '/campaigns', search: { archived: true } })
      },
    })
  }

  return (
    <Form {...form}>
      <form noValidate autoComplete="off">
        <fieldset className="flex flex-col gap-8 pb-10">
          <SettingsCard title={t('campaigns.settings.record')}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Campaign name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        name="campaign-name"
                        autoComplete="off"
                        placeholder="e.g. Spring product launch"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tag_ids"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel>Tags</FormLabel>
                    <TagsInput value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SettingsCard>

          {/* Archiving is not in the Danger Zone, and that is the point of it
              existing: it is the reversible way to stop running a campaign,
              and putting it under a red heading beside a delete would teach
              people to avoid the safe option. It comes first because it is
              what most people who arrive here wanting rid of a campaign
              actually want. */}
          <SettingsCard title={t('campaigns.archiveCard.title')}>
            <div className="flex flex-col gap-3 items-start">
              <p className="max-w-150 text-sm text-tertiary-foreground">
                {t('campaigns.archiveCard.body')}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleArchive}
                loading={archiving}
              >
                <ArchiveIcon />
                <span>{t('campaigns.archiveCard.action')}</span>
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard title={t('campaigns.dangerZone.title')}>
            <div className="flex flex-col gap-3 items-start">
              {/* No mention of the row the server keeps as its own safety net:
                  saying it is retained reads as "recoverable", and nothing in
                  the app or on the API can bring it back. */}
              <p className="max-w-150 text-sm text-tertiary-foreground">
                {t('campaigns.dangerZone.body')}
              </p>
              <Button
                type="button"
                variant="destructiveInverted"
                onClick={handleDelete}
                loading={deleting}
              >
                <TrashIcon />
                {/* Literal caps, not `uppercase` — see CLAUDE.md on destructive labels. */}
                <span>{t('campaigns.dangerZone.action')}</span>
              </Button>
            </div>
          </SettingsCard>
        </fieldset>
      </form>
    </Form>
  )
}
