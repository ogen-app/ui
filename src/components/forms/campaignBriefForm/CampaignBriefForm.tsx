import { useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Textarea } from '@/components/ui/textarea'
import { BookmarkSimpleIcon, ChatCircleIcon, EyeIcon, GaugeIcon, TargetIcon, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCampaignTypes, useUpdateCampaign } from '@/hooks/useCampaigns'
import type { Campaign } from '@/types/campaigns'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { registerPendingSave } from '@/lib/pendingSaves'
import { selectCampaignRunning, useAssistantStore } from '@/stores/assistantStore'
import { campaignToPayload } from './shared'
import { SettingsCard } from '@/components/settings/SettingsCard'

const TYPE_ICON: Record<string, PhosphorIcon> = {
  awareness: EyeIcon,
  engagement: ChatCircleIcon,
  conversion: TargetIcon,
  retention: BookmarkSimpleIcon,
}

function typeIcon(name: string): PhosphorIcon {
  return TYPE_ICON[name.toLowerCase()] ?? GaugeIcon
}

const briefSchema = z.object({
  campaign_type_id: z.string().min(1, 'Campaign type is required'),
  description: z.string(),
  target_persona: z.string(),
  key_messages: z.string(),
  tone_guidelines: z.string(),
})

type BriefFormValues = z.infer<typeof briefSchema>

function defaultValues(campaign: Campaign): BriefFormValues {
  return {
    campaign_type_id: campaign.campaign_type_id,
    description: campaign.description,
    target_persona: campaign.target_persona,
    key_messages: campaign.key_messages,
    tone_guidelines: campaign.tone_guidelines,
  }
}

type BriefFormProps = {
  campaign: Campaign
}

export function BriefForm({ campaign }: BriefFormProps) {
  const form = useForm<BriefFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(briefSchema as any),
    defaultValues: defaultValues(campaign),
  })

  const { data: types, isLoading: typesLoading } = useCampaignTypes()

  // No autosave here: edits mark the page dirty and are applied by the
  // header's Save button (settingsSave context), like the settings pages.
  const { isDirty } = form.formState
  const { mutateAsync: updateCampaign } = useUpdateCampaign()
  const save = useCallback(async () => {
    const v = form.getValues()
    const payload = campaignToPayload(campaign, {
      campaign_type_id: v.campaign_type_id,
      description: v.description,
      target_persona: v.target_persona,
      key_messages: v.key_messages,
      tone_guidelines: v.tone_guidelines,
    })
    await updateCampaign({ id: campaign.id, payload })
    // Re-baseline so the form is pristine against what was just saved.
    form.reset(v)
  }, [campaign, form, updateCampaign])
  useRegisterSettingsSave('campaign-brief', isDirty, save)

  // `enrichBrief` rewrites all four brief fields server-side (CON-112 §6.5).
  // Land pending edits before the turn starts, hold the form read-only while
  // it runs, then adopt what the assistant wrote.
  const assistantRunning = useAssistantStore(selectCampaignRunning(campaign.id))
  const flushIfDirty = useCallback(async () => {
    if (form.formState.isDirty) await save()
  }, [form, save])
  useEffect(
    () => registerPendingSave(campaign.id, flushIfDirty),
    [campaign.id, flushIfDirty],
  )

  // The turn's write only reaches the form through a refetch, and only when
  // there is nothing of the user's to lose.
  const wasRunning = useRef(assistantRunning)
  useEffect(() => {
    const settled = wasRunning.current && !assistantRunning
    wasRunning.current = assistantRunning
    if (settled && !form.formState.isDirty) form.reset(defaultValues(campaign))
  }, [assistantRunning, campaign, form])

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
        <SettingsCard title="Campaign type">
          <FormField
            control={form.control}
            name="campaign_type_id"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-flow-col auto-cols-fr gap-2">
                  {(types ?? []).map((t) => {
                    const selected = field.value === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => field.onChange(t.id)}
                        disabled={typesLoading}
                        aria-pressed={selected}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 cursor-pointer transition-colors',
                          'disabled:pointer-events-none disabled:opacity-50',
                          selected
                            ? 'border-foreground text-foreground'
                            : 'border-quaternary text-secondary-foreground hover:border-foreground hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center rounded-md size-8 transition-colors',
                            selected
                              ? 'bg-foreground text-background'
                              : 'bg-transparent'
                          )}
                        >
                          {(() => {
                            const TypeIcon = typeIcon(t.name)
                            return <TypeIcon className="size-5" />
                          })()}
                        </span>
                        <span className="text-[11px] font-medium tracking-[0.08em] uppercase">
                          {t.label || t.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsCard>

        <SettingsCard title="Messaging">
          {/* Single column, but the same row rhythm as the settings grids. */}
          <div className="grid grid-cols-1 gap-y-5">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="What is this campaign about and why does it matter?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target_persona"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target persona</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Who are we talking to? Role, goals, pain points."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key_messages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key messages</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="The core points every piece of content should land."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tone_guidelines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone guidelines</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Voice, style, words to use and avoid."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          </SettingsCard>
        </fieldset>
      </form>
    </Form>
  )
}
