import {
  ArchiveIcon,
  CheckIcon,
  ClockCountdownIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { IdeaVerdict, PostponeHorizon } from '@/lib/ideas'

/**
 * The three answers, in one table.
 *
 * Keys rather than words, for the reason `PostsEmptyState`'s `COPY` is: a
 * module-level constant freezes whichever language happened to load first, so
 * what is tabulated here is the *identity* of each verdict — its glyph and its
 * catalogue keys — and the words are read at the point they are drawn. Written
 * `as const satisfies` rather than annotated, because an annotated
 * `Record<…, string>` widens the keys to `string` and `t()` stops type-checking
 * them.
 *
 * The order is the order the controls sit in and the order the counts read:
 * yes, not now, no. Best case first — a row whose leftmost control is the
 * archive is a row people mis-click into the bin.
 */
export const VERDICTS = {
  yes: {
    icon: CheckIcon,
    labelKey: 'ideas.verdict.yes',
    actionKey: 'ideas.action.yes',
    // `--accent`, the app's "this one", for the only affirmative here. The
    // other two are deliberately quiet: saying no is not a warning, and a
    // destructive red on it would make archiving feel like deletion, which is
    // exactly the confusion the verdict exists to avoid.
    tone: 'text-accent',
  },
  later: {
    icon: ClockCountdownIcon,
    labelKey: 'ideas.verdict.later',
    actionKey: 'ideas.action.later',
    tone: 'text-secondary-foreground',
  },
  no: {
    icon: ArchiveIcon,
    labelKey: 'ideas.verdict.no',
    actionKey: 'ideas.action.no',
    tone: 'text-tertiary-foreground',
  },
} as const satisfies Record<
  IdeaVerdict,
  { icon: Icon; labelKey: string; actionKey: string; tone: string }
>

/** The order the verdicts are offered in, everywhere they are offered. */
export const VERDICT_ORDER = ['yes', 'later', 'no'] as const

export const HORIZON_KEYS = {
  week: 'ideas.horizon.week',
  month: 'ideas.horizon.month',
  quarter: 'ideas.horizon.quarter',
} as const satisfies Record<PostponeHorizon, string>
