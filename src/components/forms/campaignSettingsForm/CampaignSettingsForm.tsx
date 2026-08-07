import { useCallback, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { TagsInput } from '@/components/ui/tags-input'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@phosphor-icons/react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  useCampaignTypes,
  useDeleteCampaign,
  useUpdateCampaign,
} from '@/hooks/useCampaigns'
import {
  CampaignTypeCard,
  CampaignTypePicker,
} from '@/components/campaigns/CampaignTypePicker'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { cn } from '@/lib'
import { selectCampaignRunning, useAssistantStore } from '@/stores/assistantStore'
import type {
  Campaign,
  CampaignPlatform,
  CampaignType,
} from '@/types/campaigns'
import { campaignToPayload, toNumberOrNull, toISODateTime } from '../campaignBriefForm/shared'
import { PlatformsControl } from './PlatformsControl'
import { useFeatureFlag } from '@/config/featureFlags'
import { PostGoalCard } from './PostGoalCard'
import { SchedulingCard } from './SchedulingCard'
import { settingsDefaultValues, settingsSchema, type SettingsFormValues } from './schema'

/**
 * The chosen type out of the fetched list. Falls back to the campaign's own
 * hydrated relation at the call site, so the card names the type on the first
 * frame instead of reading "No type set" until the list arrives.
 */
function typeById(types: CampaignType[] | undefined, id: string): CampaignType | undefined {
  return types?.find((t) => t.id === id)
}

type Props = {
  campaign: Campaign
}

/**
 * Campaign settings, laid out like the Workspace Settings page (titled
 * sections over full-width cards). Fields are edited inline and applied
 * together by the header's Save button (settingsSave context), same as the
 * brief form.
 */
export function CampaignSettingsForm({ campaign }: Props) {
  const form = useForm<SettingsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsSchema as any),
    defaultValues: settingsDefaultValues(campaign),
  })

  const { data: types, isLoading: typesLoading } = useCampaignTypes()
  const { mutate: deleteCampaign, isPending: deleting } = useDeleteCampaign()
  const navigate = useNavigate()

  // The type is stated, not offered — the chooser only appears once the user
  // asks for it by name.
  const [changingType, setChangingType] = useState(false)

  // No autosave here: edits mark the page dirty and are applied by the
  // header's Save button (settingsSave context), like the brief form.
  const { isDirty } = form.formState
  const { mutateAsync: updateCampaign } = useUpdateCampaign()
  const save = useCallback(async () => {
    const v = form.getValues()
    const payload = campaignToPayload(campaign, {
      name: v.name.trim() === '' ? ' ' : v.name,
      campaign_type_id: v.campaign_type_id,
      start_date: toISODateTime(v.start_date),
      end_date: toISODateTime(v.end_date),
      estimated_post_count: toNumberOrNull(v.estimated_post_count),
      goal_cadence: v.goal_cadence,
      publishing_time: v.publishing_time,
      timezone: v.timezone,
      publishing_days: v.publishing_days,
      spread_minutes: v.spread_minutes,
      budget: toNumberOrNull(v.budget),
      currency: v.currency,
      language: v.language,
      tag_ids: v.tag_ids,
      target_platforms: v.target_platforms,
    })
    await updateCampaign({ id: campaign.id, payload })
    // Re-baseline so the form is pristine against what was just saved.
    form.reset(v)
  }, [campaign, form, updateCampaign])
  useRegisterSettingsSave('campaign-settings', isDirty, save)

  /**
   * Adding or removing a platform persists on the spot. It builds on the
   * server's campaign rather than the form's values, so pending edits to the
   * other fields stay pending — this toggle must not smuggle them out. Only
   * target_platforms is re-baselined, leaving the rest dirty.
   */
  const { mutate: updateCampaignNow } = useUpdateCampaign({
    errorTitle: 'Unable to update platforms',
  })
  const commitPlatforms = useCallback(
    (next: CampaignPlatform[]) => {
      const previous = form.getValues('target_platforms')
      form.setValue('target_platforms', next)
      updateCampaignNow(
        {
          id: campaign.id,
          payload: campaignToPayload(campaign, { target_platforms: next }),
        },
        {
          onSuccess: () =>
            form.resetField('target_platforms', { defaultValue: next }),
          onError: () => {
            // The optimistic setValue above must not outlive a rejected
            // request: left in place (and dirty), the header's Save would
            // quietly push the very change the server just refused.
            // The toast is the hook's `errorTitle`, not ours — CON-164.
            form.resetField('target_platforms', { defaultValue: previous })
          },
        },
      )
    },
    [campaign, form, updateCampaignNow],
  )

  // Watched rather than read from the campaign: adding a platform persists
  // immediately, so the heading's warning has to clear on the click.
  const targetPlatforms = form.watch('target_platforms')
  const noPlatforms = targetPlatforms.length === 0

  // Both cards edit campaign columns through this same form, so a flag being
  // off simply means the page doesn't offer those fields — the values it holds
  // are still the campaign's own, and Save round-trips them untouched.
  const goalsEnabled = useFeatureFlag('campaign-goals')
  const schedulingEnabled = useFeatureFlag('campaign-scheduling')

  // `setCampaignDates` / `redistributePosts` rewrite these fields server-side
  // (CON-115), so the form is held read-only for the length of a turn. Unsaved
  // edits stay in the form (header save) and are not flushed by the turn.
  const assistantRunning = useAssistantStore(selectCampaignRunning(campaign.id))

  const handleDelete = () => {
    const displayName = campaign.name.trim() === '' ? 'this campaign' : `"${campaign.name}"`
    if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) return
    deleteCampaign(campaign.id, {
      onSuccess: () => {
        navigate({ to: '/campaigns' })
      },
    })
  }

  return (
    <Form {...form}>
      <form noValidate autoComplete="off">
        <fieldset
          disabled={assistantRunning}
          className={cn(
            'flex flex-col gap-8 pb-10 transition-opacity',
            assistantRunning && 'opacity-60',
          )}
        >
        <SettingsCard title="Basic">
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
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End date</FormLabel>
                  <DatePicker value={field.value} onChange={field.onChange} />
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
            {/* The type used to own a card at the top of the page, which put
                the campaign's least changeable decision above its name. It
                belongs with the rest of what the campaign *is* — stated, not
                offered, because it picks the phase plan every post is written
                against and switching it mid-campaign is something the product
                means to restrict. */}
            <FormField
              control={form.control}
              name="campaign_type_id"
              render={({ field }) => (
                <FormItem className="lg:col-span-2">
                  <FormLabel>Campaign type</FormLabel>
                  {changingType ? (
                    <div className="flex flex-col gap-3">
                      <CampaignTypePicker
                        types={types ?? []}
                        value={field.value}
                        onChange={(id) => {
                          field.onChange(id)
                          setChangingType(false)
                        }}
                        disabled={typesLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="self-start"
                        onClick={() => setChangingType(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <CampaignTypeCard
                      type={typeById(types, field.value) ?? campaign.campaign_type}
                      action={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={typesLoading}
                          onClick={() => setChangingType(true)}
                        >
                          CHANGE
                        </Button>
                      }
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsCard>

        {/* How much the campaign should produce, then when it goes out. The
            post target used to sit in Advanced next to budget and language,
            where it read as trivia rather than as the rate the assistant plans
            against. */}
        {goalsEnabled && <PostGoalCard />}

        {schedulingEnabled && <SchedulingCard />}

        <SettingsCard title="Advanced">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step="0.01" placeholder="e.g. 5000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="USD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input placeholder="en" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title={
            <>
              <span className="truncate">Platforms &amp; Post Types</span>
              {/* After the heading, not before it: the dot comes and goes, and
                  leading it would shift the title sideways as platforms are
                  added. Same warning tone as the summary line inside. */}
              {noPlatforms && (
                <span
                  className="size-2 shrink-0 rounded-full bg-warning"
                  role="img"
                  aria-label="No platforms selected"
                />
              )}
            </>
          }
        >
          <FormField
            control={form.control}
            name="target_platforms"
            render={({ field }) => (
              <FormItem>
                <PlatformsControl
                  value={field.value}
                  onChange={field.onChange}
                  onCommitPlatforms={commitPlatforms}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsCard>

        <SettingsCard title="Danger Zone">
          <div className="flex flex-col gap-3 items-start">
            <p className="max-w-150 text-sm text-tertiary-foreground">
              Deleting a campaign removes its posts and schedule. This cannot be undone.
            </p>
            <Button
              type="button"
              variant="destructiveInverted"
              onClick={handleDelete}
              loading={deleting}
            >
              <TrashIcon />
              {/* Literal caps, not `uppercase` — see CLAUDE.md on destructive labels. */}
              <span>DELETE CAMPAIGN</span>
            </Button>
          </div>
        </SettingsCard>
        </fieldset>
      </form>
    </Form>
  )
}
