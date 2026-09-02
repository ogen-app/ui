import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@phosphor-icons/react'
import { TextSelect } from '@/components/ui/text-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapse } from '@/components/ui/collapse'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCampaign } from '@/hooks/useCampaigns'
import { DeletePostDialog } from '@/components/posts/DeletePostDialog'
import { PostSourcesSection } from '@/components/posts/sources/PostSourcesSection'
import { cn } from '@/lib'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import {
  fromLocalParts,
  getLocalTimezoneLabel,
  toLocalParts,
} from '@/lib/postSchedule'
import type { Post } from '@/types/posts'
import { CampaignPostTypeSelect } from './CampaignPostTypeSelect'
import { useFeatureFlag } from '@/config/featureFlags'
import { PostBrandSection } from '@/components/brand/PostBrandSection'

const NO_PHASE = '__none__'

const schema = z.object({
  platform_id: z.string(),
  platform_post_type: z.string(),
  scheduled_at: z.string().nullable(),
  target_audience_notes: z.string(),
  campaign_type_phase_id: z.string(),
})

type FormValues = z.infer<typeof schema>

function docToFormValues(doc: Post): FormValues {
  return {
    platform_id: doc.platform_id,
    platform_post_type: doc.platform_post_type,
    scheduled_at: doc.scheduled_at,
    target_audience_notes: doc.target_audience_notes,
    campaign_type_phase_id: doc.campaign_type_phase_id ?? NO_PHASE,
  }
}

type Props = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  onClose?: () => void
}

export function PostSettingsForm({ doc, changeDoc, onClose }: Props) {
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: docToFormValues(doc),
  })

  const { data: campaign, isLoading: campaignPending } = useCampaign(
    doc.campaign_id,
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const brandBinds = useFeatureFlag('brand-materials')

  const platformId = form.watch('platform_id')
  const platformPostType = form.watch('platform_post_type')
  const tzLabel = useMemo(() => getLocalTimezoneLabel(), [])
  // While `scheduled` the Zernio submission owns the publish time — an
  // edit here would change the displayed date without moving the actual
  // publish. Once `published` the date is history.
  const scheduleLocked = !canEditScheduledAt(doc.status)

  useEffect(() => {
    const sub = form.watch((values, info) => {
      if (!info.name) return
      changeDoc((d) => {
        switch (info.name) {
          case 'platform_id':
            if (values.platform_id) d.platform_id = values.platform_id
            if (values.platform_post_type)
              d.platform_post_type = values.platform_post_type
            break
          case 'platform_post_type':
            if (values.platform_post_type)
              d.platform_post_type = values.platform_post_type
            break
          case 'scheduled_at':
            d.scheduled_at = values.scheduled_at ?? null
            break
          case 'target_audience_notes':
            d.target_audience_notes = values.target_audience_notes ?? ''
            break
          case 'campaign_type_phase_id':
            d.campaign_type_phase_id =
              values.campaign_type_phase_id === NO_PHASE ||
              !values.campaign_type_phase_id
                ? null
                : values.campaign_type_phase_id
            break
        }
      })
    })
    return () => sub.unsubscribe()
  }, [form, changeDoc])

  const phaseOptions = useMemo(() => {
    const phases = campaign?.campaign_type?.phases ?? []
    return [
      { id: NO_PHASE, displayValue: 'No phase' },
      ...phases.map((ph) => ({ id: ph.id, displayValue: ph.name })),
    ]
  }, [campaign])

  return (
    <Form {...form}>
      <form noValidate autoComplete="off" className="h-full">
        <RailPanel title="Post settings" onClose={onClose}>
          <Collapse title="BASIC" defaultOpen>
            <div className="flex flex-col gap-4 pt-2 pb-4">
              <FormItem>
                <FormLabel>Post type</FormLabel>
                <FormControl>
                  {/* Both of this panel's campaign-shaped controls wait for
                      the campaign: their options are its post types and its
                      phases, and an empty menu reads as "none exist". */}
                  {campaignPending ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <CampaignPostTypeSelect
                      campaign={campaign}
                      platformId={platformId}
                      postType={platformPostType}
                      onChange={(pid, slug) => {
                        form.setValue('platform_id', pid, { shouldDirty: true })
                        form.setValue('platform_post_type', slug, {
                          shouldDirty: true,
                        })
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormField
                control={form.control}
                name="scheduled_at"
                render={({ field }) => {
                  const { dateStr, timeStr } = toLocalParts(field.value)
                  return (
                    <FormItem>
                      <FormLabel>
                        Publish date and time
                        <span className="ml-2 text-xs font-normal text-tertiary-foreground">
                          ({tzLabel} time zone)
                        </span>
                        {field.value && !scheduleLocked && (
                          <button
                            type="button"
                            onClick={() => field.onChange(null)}
                            className="ml-2 text-xs font-normal text-tertiary-foreground hover:text-foreground transition-colors cursor-pointer underline"
                          >
                            Clear
                          </button>
                        )}
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <DatePicker
                            value={dateStr ? `${dateStr}T00:00:00` : null}
                            onChange={(nextDate) =>
                              field.onChange(
                                fromLocalParts(nextDate ?? '', timeStr),
                              )
                            }
                            disabled={scheduleLocked}
                          />
                        </div>
                        <div className="relative w-24">
                          <Input
                            type="time"
                            value={timeStr}
                            onChange={(e) =>
                              field.onChange(
                                fromLocalParts(dateStr, e.target.value),
                              )
                            }
                            disabled={scheduleLocked || !dateStr}
                            data-empty={!timeStr}
                            className={cn(
                              'w-24 appearance-none',
                              '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
                              'data-[empty=true]:[&::-webkit-datetime-edit]:text-transparent',
                            )}
                          />
                          {!timeStr && (
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[14px] font-medium text-tertiary-foreground">
                              12:00
                            </span>
                          )}
                        </div>
                      </div>
                      {scheduleLocked && doc.status === 'scheduled' && (
                        <p className="text-xs text-tertiary-foreground">
                          The date is locked while the post is scheduled —
                          unschedule it to pick a new one.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            </div>
          </Collapse>

          {/* Above ADVANCED because it is not one: what a post reads from
              changes what the assistant writes, so it belongs with the post
              type and the date rather than behind a fold. */}
          <PostSourcesSection post={doc} changeDoc={changeDoc} />

          {/* Beside Sources rather than under ADVANCED: what a post is written
              in is the same class of thing as what it is written from, and
              burying it would make an inherited voice something you have to go
              looking for to discover. */}
          {brandBinds && (
            <Collapse title="VOICE & AUDIENCE" defaultOpen>
              <div className="pt-2 pb-4">
                <PostBrandSection post={doc} />
              </div>
            </Collapse>
          )}

          <Collapse title="ADVANCED">
            <div className="flex flex-col gap-4 pt-2 pb-4">
              <FormField
                control={form.control}
                name="campaign_type_phase_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign phase</FormLabel>
                    <FormControl>
                      {campaignPending ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <TextSelect
                          variant="default"
                          value={field.value}
                          onValueChange={field.onChange}
                          elements={phaseOptions}
                          placeholder="No phase"
                          disabled={phaseOptions.length <= 1}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Answered by the post's audience once Brand is on. The stored
                  value is left untouched rather than cleared — the box going
                  away is a change to this panel, not permission to delete what
                  somebody wrote. */}
              {!brandBinds && (
                <FormField
                  control={form.control}
                  name="target_audience_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target audience notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Who should this reach?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </Collapse>

          <Collapse title="DANGER ZONE">
            <div className="pt-2 pb-4">
              <Button
                type="button"
                variant="destructiveInverted"
                onClick={() => setDeleteOpen(true)}
              >
                <TrashIcon />
                <span>DELETE POST</span>
              </Button>
            </div>
          </Collapse>
        </RailPanel>
      </form>
      <DeletePostDialog
        post={doc}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </Form>
  )
}
