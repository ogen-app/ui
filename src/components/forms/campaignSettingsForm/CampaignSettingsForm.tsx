import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Input } from '@/components/ui/input'
import { TagsInput } from '@/components/ui/tags-input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useUpdateCampaign } from '@/hooks/useCampaigns'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { campaignToPayload } from '@/lib/campaignPayload'
import { CampaignDangerZone } from './CampaignDangerZone'
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
 *
 * Both ways to stop the campaign live in `CampaignDangerZone` — archive and
 * delete side by side, each behind its own modal (CON-156's drawer rework
 * decided that arrangement, and this page inherits it rather than relitigating
 * where archive belongs).
 */
export function CampaignSettingsForm({ campaign }: Props) {
  const { t } = useTranslation()
  const form = useForm<SettingsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsSchema as any),
    defaultValues: { name: campaign.name, tag_ids: campaign.tag_ids ?? [] },
  })

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

          <CampaignDangerZone campaign={campaign} />
        </fieldset>
      </form>
    </Form>
  )
}
