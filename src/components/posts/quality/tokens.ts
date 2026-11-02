import type { QualityBand } from '@/lib/postQuality.ts'
import type { QualitySeverity } from '@/types/quality'

/**
 * The panel's shared vocabulary: how a band and a severity are painted. In one
 * place so the rail, the radar and the checks bar can't drift apart.
 *
 * A band never colours text (CON-440). `--warning` is too light to carry words
 * at AA on white, and a whole panel of workable scores painted orange said
 * nothing anyway — so the band is a word on a tinted chip with a solid marker,
 * and the numbers stay in the foreground ink.
 */

/** The chip's solid marker. */
export const BAND_SWATCH: Record<QualityBand, string> = {
  strong: 'bg-positive',
  workable: 'bg-warning',
  weak: 'bg-destructive',
}

/** The chip's wash — the band hue at low opacity, under foreground text. */
export const BAND_WASH: Record<QualityBand, string> = {
  strong: 'bg-positive/15',
  workable: 'bg-warning/15',
  weak: 'bg-destructive/10',
}

/**
 * Severity reads as a tag — the severity colour over a tenth-opacity wash of
 * itself. Matches the assistant's review findings, which use the same
 * high/medium/low vocabulary; they should not look like two different scales.
 */
export const SEVERITY_CLASS: Record<QualitySeverity, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-tertiary-foreground/10 text-tertiary-foreground',
}
