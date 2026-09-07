import {
  ArrowUpRightIcon,
  ShieldIcon,
  StarIcon,
  UsersThreeIcon,
  WaveformIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Checkbox } from '@/components/ui/checkbox'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import {
  useCampaignBrand,
  useBrand,
  useSaveCampaignBrand,
} from '@/hooks/useBrand'
import { EMPTY_CAMPAIGN_BRAND } from './binding'
import type { BrandAudience, BrandVoice, CampaignBrand } from './types'

/**
 * What this campaign draws on out of the workspace's Brand (§8, middle level).
 *
 * Rendered on both the brief and campaign settings, from one file — the two
 * screens ask the same question from different directions (*what does this
 * campaign say* versus *what is this campaign configured with*) and a second
 * implementation would be two answers waiting to disagree.
 *
 * **It replaces the brief's "Target persona" and "Tone guidelines" rather than
 * joining them.** Those two boxes are this feature's third attempt, written
 * fresh per campaign and forgotten per campaign, and CON-226 §3's whole
 * complaint is that we keep building it with no memory. Leaving them beside a
 * picker would make it the fourth. "Key messages" stays: it is what *this
 * campaign* is arguing, which is not brand material and has no library entry
 * behind it.
 *
 * **It saves on the spot**, not through the page's Save button, following
 * `PlatformsControl` — the control writes to its own store rather than to the
 * campaign payload, and a selection that sat dirty until an unrelated Save
 * would be a lie about where it lives.
 *
 * **The guardrails are named here and not offered.** They are the third piece
 * of brand material and the only one with no question attached: they apply to
 * every generation whichever voice is picked, so there is nothing to select and
 * nothing to override, and a control for them on this screen would imply a
 * campaign could opt out of the claims it is allowed to make. What was wrong
 * was going from *unpickable* to *unmentioned* — a rule nobody can see is a
 * rule nobody believes is running. So the card ends by saying they exist and
 * pointing at the campaign's Foundation page, which is where everything this
 * campaign writes from can be read in full (`InheritedBrand`).
 *
 * Nothing here reaches the generator yet: CON-245 is the API that would read a
 * voice, and until it exists this records the choice and no more. That is the
 * honest state, and the reason `brand-materials` is still off.
 */
export function CampaignBrandCard({ campaignId }: { campaignId: string }) {
  const { data: brand, isLoading } = useBrand()
  const { data: bound } = useCampaignBrand(campaignId)
  const { mutate: save } = useSaveCampaignBrand(campaignId)

  const value = bound ?? EMPTY_CAMPAIGN_BRAND

  if (isLoading || !brand) return null

  const empty = brand.voices.length === 0 && brand.audiences.length === 0
  if (empty) return <NothingToPickFrom />

  function set(next: Partial<CampaignBrand>) {
    save({ ...value, ...next })
  }

  function toggleVoice(id: string) {
    const inCast = value.voiceIds.includes(id)
    const voiceIds = inCast
      ? value.voiceIds.filter((v) => v !== id)
      : [...value.voiceIds, id]
    // Dropping the voice that was the default leaves the campaign stating a
    // default it no longer casts — which resolves as though nothing was said,
    // silently. Clearing it here makes the fallback visible instead.
    const defaultVoiceId =
      value.defaultVoiceId === id && inCast ? null : value.defaultVoiceId
    set({ voiceIds, defaultVoiceId })
  }

  return (
    <SettingsCard
      title={
        <>
          <WaveformIcon className="size-5 text-tertiary-foreground" />
          Voice
        </>
      }
    >
      <p className="text-sm text-tertiary-foreground">
        The voices this campaign writes in. Posts open in the default one and
        can be changed individually.
      </p>
      <div className="flex flex-col">
        {brand.voices.map((voice) => (
          <VoiceRow
            key={voice.id}
            voice={voice}
            picked={value.voiceIds.includes(voice.id)}
            isDefault={value.defaultVoiceId === voice.id}
            // With one voice cast there is nothing to choose between, and the
            // resolution already treats it as the default. A star on a list of
            // one is a control whose only state is on.
            showDefault={value.voiceIds.length > 1}
            onToggle={() => toggleVoice(voice.id)}
            onMakeDefault={() => set({ defaultVoiceId: voice.id })}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <UsersThreeIcon className="size-5 text-tertiary-foreground" />
        <h3 className="text-xl font-display font-medium tracking-tight">
          Audience
        </h3>
      </div>
      <p className="text-sm text-tertiary-foreground">
        Who this campaign is written to. One — a post that addresses somebody
        else says so on the post.
      </p>
      <div className="flex flex-col">
        {brand.audiences.map((audience) => (
          <AudienceRow
            key={audience.id}
            audience={audience}
            picked={value.audienceId === audience.id}
            // Clicking the chosen one again clears it, so "nobody in
            // particular" stays reachable without a None row that would sit in
            // the list pretending to be an audience.
            onPick={() =>
              set({
                audienceId:
                  value.audienceId === audience.id ? null : audience.id,
              })
            }
          />
        ))}
      </div>

      <WhatAlsoApplies
        campaignId={campaignId}
        hasGuardrails={brand.guardrails !== null}
      />
    </SettingsCard>
  )
}

/**
 * The card's last word: what this campaign is also written under, that nothing
 * above it chose.
 *
 * A paragraph and a link, deliberately not a control and deliberately not a
 * fourth section — the moment it looks like one, somebody goes looking for the
 * checkbox that turns it off. The wording changes with whether anything is
 * stated, because the two facts are opposite in kind: rules in force are a
 * constraint, and no rules at all is a gap worth the same one line.
 */
function WhatAlsoApplies({
  campaignId,
  hasGuardrails,
}: {
  campaignId: string
  hasGuardrails: boolean
}) {
  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-tertiary pt-4">
      <p className="flex gap-2 text-sm text-tertiary-foreground">
        <ShieldIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          {hasGuardrails
            ? 'The workspace’s guardrails also apply to every post here, whichever voice writes it. They are not chosen per campaign and cannot be overridden.'
            : 'The workspace has stated no guardrails, so nothing is off limits — any voice here may promise anything, in any words.'}
        </span>
      </p>
      <div>
        <Link
          to="/campaigns/$campaignId/foundation"
          params={{ campaignId }}
          className="inline-flex items-center gap-1 text-sm text-secondary-foreground hover:text-foreground"
        >
          See everything this campaign writes from
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}

/**
 * A workspace with no Brand at all.
 *
 * A link rather than an inline editor: authoring a voice is a screen's worth of
 * work — samples, rules, the lot — and the campaign is the wrong place to start
 * it. Saying where it lives is the whole job here.
 */
function NothingToPickFrom() {
  return (
    <SettingsCard title="Voice and audience">
      <p className="text-sm text-tertiary-foreground">
        This workspace has no voices or audiences yet. They are written once and
        every campaign draws on them.
      </p>
      <div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/foundation">Open Foundation</Link>
        </Button>
      </div>
    </SettingsCard>
  )
}

/** Shared row chrome: the picked state is a surface, not a tick in a column. */
const ROW =
  'flex items-start gap-3 border-b border-tertiary px-3 py-3 last:border-b-0 text-left'

function VoiceRow({
  voice,
  picked,
  isDefault,
  showDefault,
  onToggle,
  onMakeDefault,
}: {
  voice: BrandVoice
  picked: boolean
  isDefault: boolean
  showDefault: boolean
  onToggle: () => void
  onMakeDefault: () => void
}) {
  return (
    <div className={cn(ROW, picked && 'bg-secondary')}>
      <Checkbox
        checked={picked}
        onCheckedChange={onToggle}
        aria-label={`Use ${voice.name} in this campaign`}
        className="mt-0.5"
      />
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
      >
        <span className="truncate text-sm font-medium">{voice.name}</span>
        {/* `whenToUse` and not `summary`: the question on this screen is which
            voice this campaign wants, and that is what `whenToUse` answers.
            The summary describes what the voice has become, which is the
            library's question. */}
        {voice.whenToUse && (
          <span className="truncate text-xs text-tertiary-foreground">
            {voice.whenToUse}
          </span>
        )}
      </button>
      {picked && showDefault && (
        <button
          type="button"
          onClick={onMakeDefault}
          aria-pressed={isDefault}
          aria-label={`Make ${voice.name} the default for new posts`}
          title={
            isDefault
              ? 'Posts open in this voice'
              : 'Make default for new posts'
          }
          className="mt-0.5 shrink-0"
        >
          <StarIcon
            weight={isDefault ? 'fill' : 'regular'}
            className={cn(
              'size-4',
              isDefault
                ? 'text-primary-foreground'
                : 'text-tertiary-foreground',
            )}
          />
        </button>
      )}
    </div>
  )
}

function AudienceRow({
  audience,
  picked,
  onPick,
}: {
  audience: BrandAudience
  picked: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={cn(ROW, 'w-full', picked && 'bg-secondary')}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{audience.name}</span>
        {audience.who && (
          <span className="truncate text-xs text-tertiary-foreground">
            {audience.who}
          </span>
        )}
      </span>
    </button>
  )
}
