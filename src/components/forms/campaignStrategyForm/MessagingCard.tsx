import { useFormContext } from 'react-hook-form'
import { SparkleIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SettingsCard } from '@/components/settings/SettingsCard.tsx'
import { BRIEF_FIELD_LABELS, briefPosture } from '@/lib/campaignReadiness.ts'
import { useSettingsStore } from '@/stores/settingsStore.ts'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore.ts'
import type { Campaign } from '@/types/campaigns'
import type { StrategyFormValues } from './schema'

/**
 * What the campaign says — the brief, as the first card of the Strategy page.
 *
 * It was its own page until the drill-down gave the campaign a level of its
 * own, at which point Brief and Settings were two screens editing one row and
 * asking the same question from two directions: what the campaign is meant to
 * do. These four columns are the answer in words, and the cards below are the
 * same answer in numbers, so they are read and saved together.
 *
 * Fields come off the page's form through context rather than props, like the
 * Goal and Scheduling cards, so the header's single Save applies all of it.
 */
export function MessagingCard({ campaign }: { campaign: Campaign }) {
  const form = useFormContext<StrategyFormValues>()

  return (
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
      </div>
    </SettingsCard>
  )
}

/**
 * The way to ask Ogen for the brief from the page that holds it (CON-156 §2).
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
  // The ask names the fields still missing, so it must not ask for the two
  // that are no longer on the screen — the tool would write them and nothing
  // would show what changed.
  const posture = briefPosture(campaign)

  const ask = () => {
    openRightPanel('assistant')
    askFor(
      threadIdFor({ kind: 'campaign', campaignId: campaign.id }),
      instruction(posture),
    )
  }

  return (
    <Button type="button" variant="ghost" onClick={ask}>
      <SparkleIcon />
      <span>
        {posture.state === 'complete' ? 'IMPROVE BRIEF' : 'GENERATE BRIEF'}
      </span>
    </Button>
  )
}

/**
 * The same button asks for three different things. Naming the gaps matters most
 * in the partial case: without them the assistant rewrites the fields the user
 * already filled in, which is not what "generate the rest" meant.
 */
function instruction({
  state,
  missing,
}: ReturnType<typeof briefPosture>): string {
  if (state === 'complete') {
    return 'Improve the campaign brief — tighten it and make it more specific.'
  }
  if (state === 'empty') {
    return 'Write the campaign brief: the description, target persona, key messages and tone guidelines.'
  }
  const gaps = missing
    .map((f) => BRIEF_FIELD_LABELS[f].toLowerCase())
    .join(', ')
  return `Finish the campaign brief — fill in the ${gaps}, and leave what is already written alone.`
}
