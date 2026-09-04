import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { TextSelect } from '@/components/ui/text-select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBrand,
  useCampaignBrand,
  usePostBrand,
  useSavePostBrand,
} from '@/hooks/useBrand'
import type { Post } from '@/types/posts'
import {
  EMPTY_CAMPAIGN_BRAND,
  EMPTY_POST_BRAND,
  castOf,
  resolveAudience,
  resolveVoice,
  type BindingSource,
} from './binding'
import type { PostBrand } from './types'

/**
 * What this post is written in (§8, innermost level).
 *
 * Replaces "Target audience notes" — a box that asked every post to re-describe
 * a reader the campaign already knows, and whose answers went nowhere anybody
 * could reuse.
 *
 * **The inherited value is shown, not left blank.** A picker sitting empty
 * because the campaign already answered is the failure this section is most
 * likely to have: it reads as *no voice*, and the obvious repair is to pick one
 * here, which turns an inherited value into a pinned one on every post and
 * quietly kills the campaign-level control. So the resolved value is always on
 * screen, with a line saying which level supplied it.
 *
 * Choosing is therefore always an override. Undoing one is a separate control
 * rather than a "same as campaign" entry in the list, because those two states
 * are genuinely different — a post pinned to the voice the campaign happens to
 * use today keeps that voice when the campaign moves on, and that is sometimes
 * exactly what somebody means.
 */
export function PostBrandSection({ post }: { post: Post }) {
  const { data: brand, isLoading } = useBrand()
  const { data: campaignBound } = useCampaignBrand(post.campaign_id)
  const { data: postBound } = usePostBrand(post.id)
  const { mutate: save } = useSavePostBrand(post.id)

  if (isLoading || !brand) {
    return <Skeleton className="h-10 w-full" />
  }

  if (brand.voices.length === 0 && brand.audiences.length === 0) {
    return (
      <p className="text-xs text-tertiary-foreground">
        This workspace has no voices or audiences yet.
      </p>
    )
  }

  const campaign = campaignBound ?? EMPTY_CAMPAIGN_BRAND
  const bound: PostBrand = postBound ?? EMPTY_POST_BRAND

  const voice = resolveVoice(brand, campaign, bound, post.updated_at)
  const audience = resolveAudience(brand, campaign, bound)

  // The campaign's cast first, then everything else. A campaign's choice is a
  // recommendation rather than a fence: the case for picking outside it is a
  // one-off post that does not belong to the campaign's register, which is
  // exactly the case a per-post override exists for. Fencing it would send
  // people to the campaign settings to widen a cast for one post, and they
  // would never narrow it again.
  const cast = castOf(brand, campaign)
  const rest = brand.voices.filter((v) => !cast.some((c) => c.id === v.id))
  const voiceOptions = [...cast, ...rest].map((v) => ({
    id: v.id,
    displayValue: v.name,
  }))

  const audienceOptions = brand.audiences.map((a) => ({
    id: a.id,
    displayValue: a.name,
  }))

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Voice"
        source={voice.source}
        overridden={bound.voice?.id != null}
        onReset={() => save({ ...bound, voice: null })}
        // Below the source line rather than above it: the first question is
        // where this voice came from, and the offer only makes sense once that
        // is answered. Not a warning either — the post's text was written and
        // stands, and the voice is an input to the next generation.
        note={
          voice.stale
            ? `${voice.voice?.name} has changed since this was written — worth regenerating.`
            : null
        }
      >
        <TextSelect
          variant="default"
          value={voice.voice?.id ?? ''}
          onValueChange={(id) =>
            save({ ...bound, voice: { id, delta: bound.voice?.delta ?? null } })
          }
          elements={voiceOptions}
          placeholder="No voice"
          disabled={voiceOptions.length === 0}
        />
      </Field>

      <Field
        label="Audience"
        source={audience.source}
        overridden={bound.audienceId != null}
        onReset={() => save({ ...bound, audienceId: null })}
      >
        <TextSelect
          variant="default"
          value={audience.audience?.id ?? ''}
          onValueChange={(id) => save({ ...bound, audienceId: id })}
          elements={audienceOptions}
          placeholder="No audience"
          disabled={audienceOptions.length === 0}
        />
      </Field>
    </div>
  )
}

const SOURCE_LINE: Record<BindingSource, string | null> = {
  post: 'Set on this post',
  campaign: 'From the campaign',
  library: "The workspace's default",
  // Nothing was resolved, and the select already says "No voice" — a line
  // underneath repeating it in other words would be the screen talking to
  // itself.
  none: null,
}

function Field({
  label,
  source,
  overridden,
  onReset,
  note,
  children,
}: {
  label: string
  source: BindingSource
  /** Whether this post pinned the value, which is the only undoable state. */
  overridden: boolean
  onReset: () => void
  /** Sits under the source line. For anything the resolution wants to offer. */
  note?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        {overridden && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="Go back to what the campaign says"
          >
            <ArrowCounterClockwiseIcon className="size-3.5" />
            <span>RESET</span>
          </Button>
        )}
      </div>
      {children}
      {SOURCE_LINE[source] && (
        <p className="text-xs text-tertiary-foreground">
          {SOURCE_LINE[source]}
        </p>
      )}
      {note && <p className="text-xs text-tertiary-foreground">{note}</p>}
    </div>
  )
}
