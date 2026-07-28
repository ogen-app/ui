import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { TagsInput } from '@/components/ui/tags-input'
import { Button } from '@/components/ui/button'
import { CheckCircleIcon, TrashIcon, WarningCircleIcon } from '@phosphor-icons/react'
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
import { CampaignTypePicker } from '@/components/campaigns/CampaignTypePicker'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { cn } from '@/lib'
import { selectCampaignRunning, useAssistantStore } from '@/stores/assistantStore'
import { toast } from '@/stores/toastStore'
import type { Campaign, CampaignPlatform, CampaignStatus } from '@/types/campaigns'
import { campaignToPayload, toNumberOrNull, toISODateTime } from '../campaignBriefForm/shared'
import { PlatformsControl } from './PlatformsControl'

const numericString = z
  .string()
  .refine((v) => v === '' || Number.isFinite(Number(v)), 'Must be a number')

const settingsSchema = z.object({
  name: z.string(),
  campaign_type_id: z.string().min(1, 'Campaign type is required'),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  estimated_post_count: numericString,
  budget: numericString,
  currency: z.string(),
  language: z.string(),
  tag_ids: z.array(z.string()),
  target_platforms: z.array(
    z.object({
      id: z.string(),
      post_types: z.array(z.string()),
    }),
  ),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

function defaultValues(campaign: Campaign): SettingsFormValues {
  return {
    name: campaign.name,
    campaign_type_id: campaign.campaign_type_id,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    estimated_post_count:
      campaign.estimated_post_count == null ? '' : String(campaign.estimated_post_count),
    budget: campaign.budget == null ? '' : String(campaign.budget),
    currency: campaign.currency,
    language: campaign.language,
    tag_ids: campaign.tag_ids ?? [],
    target_platforms: campaign.target_platforms ?? [],
  }
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
    defaultValues: defaultValues(campaign),
  })

  const { data: types, isLoading: typesLoading } = useCampaignTypes()
  const { mutate: deleteCampaign, isPending: deleting } = useDeleteCampaign()
  const navigate = useNavigate()

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
  const { mutate: updateCampaignNow } = useUpdateCampaign()
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
          onError: (e) => {
            // The optimistic setValue above must not outlive a rejected
            // request: left in place (and dirty), the header's Save would
            // quietly push the very change the server just refused.
            form.resetField('target_platforms', { defaultValue: previous })
            toast.error('Unable to update platforms', {
              description: e instanceof Error ? e.message : undefined,
            })
          },
        },
      )
    },
    [campaign, form, updateCampaignNow],
  )

  // Watched rather than read from the campaign: adding a platform persists
  // immediately, so the heading's warning has to clear on the click.
  const noPlatforms = form.watch('target_platforms').length === 0

  const isActive = campaign.status === 'active'
  const { mutate: updateStatus, isPending: statusSaving } = useUpdateCampaign()
  const setStatus = (status: CampaignStatus) => {
    updateStatus(
      { id: campaign.id, payload: campaignToPayload(campaign, { status }) },
      {
        onError: (e) =>
          toast.error(
            status === 'active'
              ? 'Unable to activate the campaign'
              : 'Unable to deactivate the campaign',
            { description: e instanceof Error ? e.message : undefined },
          ),
      },
    )
  }

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
        {/* The type picks the phase plan the campaign's content is generated
            against, so it sits above the fields that describe the campaign
            rather than inside the brief, where it used to live. */}
        <SettingsCard title="Campaign type">
          <FormField
            control={form.control}
            name="campaign_type_id"
            render={({ field }) => (
              <FormItem>
                <CampaignTypePicker
                  types={types ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={typesLoading}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsCard>

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
          </div>
        </SettingsCard>

        {/* The heading is the status — the card says what the campaign is
            rather than labelling a line that says it, so the whole thing is
            one line. Status is an action, not a field: it applies on the
            click rather than waiting for the header's Save, and it is built
            on the server's campaign so pending edits elsewhere on the page
            stay pending instead of being smuggled out with it. */}
        <SettingsCard
          // One row, not a form: the form cards' 24px of breathing room reads
          // as an empty half-card under a single line.
          className="py-3"
          title={
            <>
              {/* Both states carry a mark of the same size, so the heading
                  starts at the same place either way and the card doesn't
                  shift as the status changes. */}
              {isActive ? (
                <CheckCircleIcon
                  weight="fill"
                  className="size-5 shrink-0 text-positive"
                  aria-hidden
                />
              ) : (
                <WarningCircleIcon
                  weight="fill"
                  className="size-5 shrink-0 text-warning"
                  aria-hidden
                />
              )}
              <span className="truncate">
                {isActive ? 'Campaign is active' : 'Campaign is not active'}
              </span>
            </>
          }
          actions={
            isActive ? (
              <Button
                type="button"
                variant="ghost"
                className="uppercase"
                onClick={() => setStatus('draft')}
                loading={statusSaving}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="uppercase"
                onClick={() => setStatus('active')}
                loading={statusSaving}
              >
                <CheckCircleIcon />
                <span>Activate</span>
              </Button>
            )
          }
        />

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
              name="estimated_post_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated post count</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="e.g. 12" {...field} />
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
