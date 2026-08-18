import { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { SparkleIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import { BRIEF_FIELD_LABELS, briefPosture } from '@/lib/campaignReadiness.ts'
import { useSettingsStore } from '@/stores/settingsStore.ts'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useUpdateCampaign } from '@/hooks/useCampaigns.ts'
import type { Campaign } from '@/types/campaigns.ts'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave.tsx'
import { registerPendingSave } from '@/lib/pendingSaves.ts'
import {
  selectCampaignRunning,
  threadIdFor,
  useAssistantStore,
} from '@/stores/assistantStore.ts'
import { campaignToPayload } from '@/lib/campaignPayload'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'

const briefSchema = z.object({
  description: z.string(),
  target_persona: z.string(),
  key_messages: z.string(),
  tone_guidelines: z.string(),
})

type BriefFormValues = z.infer<typeof briefSchema>

function defaultValues(campaign: Campaign): BriefFormValues {
  return {
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

  // No autosave here: edits mark the page dirty and are applied by the
  // header's Save button (settingsSave context), like the settings pages.
  const { isDirty } = form.formState
  const { mutateAsync: updateCampaign } = useUpdateCampaign()
  const save = useCallback(async () => {
    const v = form.getValues()
    const payload = campaignToPayload(campaign, {
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
    if (!form.formState.isDirty) return
    try {
      await save()
    } catch {
      // Toasted by the mutation-cache default (CON-164); swallowed here so a
      // rejection can't escape into the assistant turn awaiting this flush.
    }
  }, [form, save])
  useEffect(
    () => registerPendingSave(campaign.id, flushIfDirty),
    [campaign.id, flushIfDirty],
  )

  // Adopt whatever the server holds whenever it changes and there is nothing
  // of the user's to lose. Deliberately not gated on the turn *finishing*: the
  // status flip and the refetch are separate renders in either order, so a
  // one-shot transition can fire before the new brief has arrived and reset
  // the form to the values the assistant just replaced.
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(defaultValues(campaign))
  }, [campaign, form])

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
        <SettingsCard
          title="Messaging"
          actions={<GenerateBriefAction campaign={campaign} />}
        >
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

/**
 * The way to ask Ogen for the brief from the brief page itself (CON-156 §2).
 * Until this, the only route to `enrichBrief` was typing the request into the
 * assistant — undiscoverable from the one screen where it is the obvious thing
 * to want.
 *
 * It points the panel at the campaign's thread with the ask already written and
 * stops there, exactly like the overview's CTAs: the tool rewrites all four
 * fields, so the send stays the user's.
 *
 * Rendered inside the form's `fieldset`, so it disables itself for the length
 * of an assistant turn along with the fields it would rewrite.
 */
function GenerateBriefAction({ campaign }: { campaign: Campaign }) {
  const askFor = useAssistantStore((s) => s.askFor)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  const posture = briefPosture(campaign)

  const ask = () => {
    openRightPanel('assistant')
    askFor(threadIdFor({ kind: 'campaign', campaignId: campaign.id }), instruction(posture))
  }

  return (
    <Button type="button" variant="outline" onClick={ask}>
      <SparkleIcon />
      <span>{posture.state === 'complete' ? 'IMPROVE BRIEF' : 'GENERATE BRIEF'}</span>
    </Button>
  )
}

/**
 * The same button asks for three different things. Naming the gaps matters most
 * in the partial case: without them the assistant rewrites the fields the user
 * already filled in, which is not what "generate the rest" meant.
 */
function instruction({ state, missing }: ReturnType<typeof briefPosture>): string {
  if (state === 'complete') {
    return 'Improve the campaign brief — tighten it and make it more specific.'
  }
  if (state === 'empty') {
    return 'Write the campaign brief: the description, target persona, key messages and tone guidelines.'
  }
  const gaps = missing.map((f) => BRIEF_FIELD_LABELS[f].toLowerCase()).join(', ')
  return `Finish the campaign brief — fill in the ${gaps}, and leave what is already written alone.`
}
