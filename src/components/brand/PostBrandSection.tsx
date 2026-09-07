import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { TextSelect } from '@/components/ui/text-select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrand, useSetPostBrand } from '@/hooks/useBrand'
import { useCampaign } from '@/hooks/useCampaigns'
import type { Post } from '@/types/posts'
import {
  EMPTY_CAMPAIGN_BRAND,
  resolveAudience,
  resolveVoice,
  type BindingSource,
} from './binding'
import type { CampaignBrand, PostBrand } from './types'

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
 *
 * **Not disabled on a submitted post**, unlike everything else the post screen
 * offers. CON-251 freezes what would diverge from the copy that has already
 * left Ogen — the body, the media, the sources — and a binding is none of
 * those. It is an input to the next generation, so setting it on a published
 * post is how you say *write the next one like this*, and the server's own
 * `/brand` endpoint runs no publish gate for the same reason.
 */
export function PostBrandSection({ post }: { post: Post }) {
  const { t } = useTranslation()
  const { data: brand, isLoading } = useBrand()
  const { data: campaign } = useCampaign(post.campaign_id)
  const { mutate: save } = useSetPostBrand(post.id)

  if (isLoading || !brand) {
    return <Skeleton className="h-10 w-full" />
  }

  if (brand.voices.length === 0 && brand.audiences.length === 0) {
    return (
      <p className="text-xs text-tertiary-foreground">
        {t('brand.binding.emptyShort')}
      </p>
    )
  }

  // The campaign is a second query and may not have landed yet. Resolving
  // against a stated empty rather than waiting is deliberate: the post's own
  // refs are already here, and a post that has chosen resolves to its own
  // choice at every level anyway. Only the inherited case moves, from `none` to
  // `campaign`, which is a line of explanatory text rather than a wrong value.
  const campaignBound: CampaignBrand = campaign
    ? {
        voiceId: campaign.brand_voice_id,
        audienceId: campaign.brand_audience_id,
      }
    : EMPTY_CAMPAIGN_BRAND

  const bound: PostBrand = {
    voiceId: post.brand_voice_id,
    audienceId: post.brand_audience_id,
  }

  const voice = resolveVoice(brand, campaignBound, bound)
  const audience = resolveAudience(brand, campaignBound, bound)

  // Every voice in the library, not the campaign's alone. A campaign's choice
  // is a recommendation rather than a fence: the case for picking outside it is
  // a one-off post that does not belong to the campaign's register, which is
  // exactly the case a per-post override exists for. Fencing it would send
  // people to the campaign settings to change it for one post, and they would
  // never change it back.
  const voiceOptions = brand.voices.map((v) => ({
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
        label={t('brand.binding.voice')}
        source={voice.source}
        overridden={bound.voiceId != null}
        onReset={() => save({ brand_voice_id: null })}
      >
        <TextSelect
          variant="default"
          value={voice.voice?.id ?? ''}
          onValueChange={(id) => save({ brand_voice_id: id })}
          elements={voiceOptions}
          placeholder={t('brand.binding.noVoice')}
          disabled={voiceOptions.length === 0}
        />
      </Field>

      <Field
        label={t('brand.binding.audience')}
        source={audience.source}
        overridden={bound.audienceId != null}
        onReset={() => save({ brand_audience_id: null })}
      >
        <TextSelect
          variant="default"
          value={audience.audience?.id ?? ''}
          onValueChange={(id) => save({ brand_audience_id: id })}
          elements={audienceOptions}
          placeholder={t('brand.binding.noAudience')}
          disabled={audienceOptions.length === 0}
        />
      </Field>
    </div>
  )
}

/**
 * Which level supplied the value, in words.
 *
 * A table of keys rather than of sentences, translated where it is used — the
 * module-level `const` that held the English would freeze whichever language
 * loaded first. `none` has no line: the select already says "No voice", and a
 * line underneath repeating it in other words would be the screen talking to
 * itself.
 */
const SOURCE_LINE = {
  post: 'brand.binding.sourcePost',
  campaign: 'brand.binding.sourceCampaign',
  library: 'brand.binding.sourceLibrary',
  none: null,
} as const satisfies Record<BindingSource, string | null>

function Field({
  label,
  source,
  overridden,
  onReset,
  children,
}: {
  label: string
  source: BindingSource
  /** Whether this post pinned the value, which is the only undoable state. */
  overridden: boolean
  onReset: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const line = SOURCE_LINE[source]
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
            title={t('brand.binding.resetHint')}
          >
            <ArrowCounterClockwiseIcon className="size-3.5" />
            <span>{t('brand.binding.reset')}</span>
          </Button>
        )}
      </div>
      {children}
      {line && <p className="text-xs text-tertiary-foreground">{t(line)}</p>}
    </div>
  )
}
