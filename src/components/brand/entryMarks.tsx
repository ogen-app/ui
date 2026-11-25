import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import type { ContentSeries } from '@/types/series'
import { Lead, Tick } from './entry'
import { defaultVoiceLabel } from './format'
import { DefaultStar } from './shell'
import { MIN_VOICE_SAMPLES, type BrandAudience, type BrandVoice } from './types'

/**
 * The marks and the runs `entry.tsx`'s rows are drawn with — what leads a
 * voice, an audience or a series, and the ruled run of each — and the two text
 * helpers the runs need. Apart from the components so that file only exports
 * components.
 */

/* ── A voice ───────────────────────────────────────────────────────────── */

/**
 * A voice's mark, wherever a voice is a row: the default star, green once it
 * has the samples behind it, else the tick on the same fact.
 */
export function voiceMark(t: TFunction, voice: BrandVoice): ReactNode {
  const backed = voice.samples.length >= MIN_VOICE_SAMPLES
  return voice.isDefault ? (
    <DefaultStar
      backed={backed}
      label={defaultVoiceLabel(t, voice)}
      word={false}
    />
  ) : (
    <Tick done={backed} />
  )
}

/** The sample carries a voice: it is the one thing that tells it from another. */
export function voiceRun(t: TFunction, voice: BrandVoice): ReactNode {
  const sample = voice.samples[0]?.trim()
  return sample ? (
    <Lead lead={t('brand.entry.soundsLike')}>{lower(sample)}</Lead>
  ) : null
}

/* ── An audience ───────────────────────────────────────────────────────── */

/**
 * Named is not described: the tick is the three consequence lines, because
 * those are what make an audience usable rather than a label. No star — the
 * workspace default stops at voices (`resolveAudience` in `binding.ts`).
 */
export function audienceMark(audience: BrandAudience): ReactNode {
  return (
    <Tick
      done={Boolean(
        audience.readsOn && audience.scrollsPastWhen && audience.believesWhen,
      )}
    />
  )
}

/** The three consequences as one run, each opening on its own few words. */
export function audienceRun(t: TFunction, audience: BrandAudience): ReactNode {
  const parts = [
    [t('brand.entry.readsOn'), audience.readsOn],
    [t('brand.entry.scrollsPastWhen'), audience.scrollsPastWhen],
    [t('brand.entry.believesWhen'), audience.believesWhen],
  ].filter(([, value]) => value.trim())
  if (parts.length === 0) return null
  return parts.map(([lead, value], i) => (
    <span key={lead}>
      {i > 0 && ' '}
      <Lead lead={lead}>{sentence(lower(value.trim()))}</Lead>
    </span>
  ))
}

/* ── A series ──────────────────────────────────────────────────────────── */

/**
 * The tick is the recipe: a named series with no instruction behind it is a
 * grouping key wearing the clothes of a standing order. Not a refusal — a
 * series saves without one and still groups — so the row is unticked rather
 * than absent.
 */
export function seriesMark(series: ContentSeries): ReactNode {
  return <Tick done={Boolean(series.recipe.trim())} />
}

/** The recipe, quoted rather than summarised: it is the series' whole content. */
export function seriesRun(t: TFunction, series: ContentSeries): ReactNode {
  const recipe = series.recipe.trim()
  return recipe ? (
    <Lead lead={t('series.library.toMakeOne')}>{lower(recipe)}</Lead>
  ) : null
}

/* ── Text ──────────────────────────────────────────────────────────────── */

/**
 * The content reads on from its lead, so its first letter drops — unless it is
 * "I" or the start of an acronym.
 */
export function lower(s: string): string {
  if (/^I\b/.test(s) || /^\p{Lu}\p{Lu}/u.test(s)) return s
  return s.charAt(0).toLocaleLowerCase() + s.slice(1)
}

export function capital(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1)
}

/** Ends on a full stop unless it already ends on a mark of its own. */
function sentence(s: string): string {
  return /[.!?…]$/.test(s) ? s : `${s}.`
}
