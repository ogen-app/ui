import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  CircleDashedIcon,
  GaugeIcon,
  SparkleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib'
import {
  awaitingPlatform,
  checksSummary,
  foldChecks,
  worstStatus,
  type CheckStatus,
  type PostCheck,
} from '@/lib/postValidation'
import { isSubmitted } from '@/lib/postStatusMachine'
import {
  overallBand,
  overallPct,
  postSuggestions,
  suggestionCountLine,
} from '@/lib/postQuality'
import { BandTag } from '../quality/BandTag'
import { SettingRow, SummaryLine } from '../quickBar/parts'
import { formatNumber } from '@/lib/intl'
import { QualityInlineSummary } from '../quality/QualityInlineSummary'
import type { PostEvaluation } from '@/types/quality'
import type { PostStatus } from '@/types/posts'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'
import { TextButton } from '@/components/ui/text-button'
import { GradientMark } from '@/components/ui/gradient-button'

type Props = {
  checks: PostCheck[]
  /** Decides which of the tab's two halves still have a question to answer. */
  status: PostStatus
  /** The stored score: `null` never assessed, `undefined` not loaded yet. */
  assessment: PostEvaluation | null | undefined
  /** The assessment a newer run replaced while the post was open (CON-440). */
  previousAssessment?: PostEvaluation | null
  /** Scoring is switched off for this workspace — the tab says nothing of it. */
  qualityUnavailable: boolean
  /**
   * A run is going — streaming here or on the Quality tab (they are the same run),
   * or one the server started at a checkpoint (CON-438).
   */
  assessing: boolean
  /** The post's run allowance is used up, so there is no run to offer. */
  exhausted?: boolean
  /** Starts a run without leaving the tab. */
  onAssess: () => void
  /** Opens the Quality tab, where a result can actually be read. */
  onOpenQuality: () => void
}

/**
 * The post editor's Checks tab — whether the post will publish, and what the
 * score says about it.
 *
 * Two different questions, deliberately in one place since CON-183:
 *
 * - **Platform requirements** — every rule the server enforces (post-type
 *   structure, platform media constraints) plus the character limits the front
 *   end still owns, from `lib/postValidation.ts`. Free, recomputed as you
 *   type, and a failure here is a refusal: the post cannot publish. The tab's
 *   badge counts these.
 * - **Quality** — the CON-85 score. Advisory, costs a model call, and only
 *   runs when asked; its full reading is the Quality tab.
 *
 * The two halves stop applying at different moments (CON-251), which is why
 * this reads the status rather than taking one `locked` flag:
 *
 * - **Requirements go once the post is `published`**, and not a moment
 *   earlier. They are a forecast — "will this publish?" — and publishing
 *   settles it by event. While `scheduled` they are still worth reading,
 *   because unscheduling is a real way to act on them.
 * - **The offer to assess goes as soon as the post is submitted.** A run costs
 *   a model call, and on a scheduled post it would buy a verdict about text
 *   nobody can change without unscheduling first. The score already taken
 *   stays.
 */
export function PostChecksTab({
  checks,
  status,
  assessment,
  previousAssessment = null,
  qualityUnavailable,
  assessing,
  exhausted = false,
  onAssess,
  onOpenQuality,
}: Props) {
  const { t } = useTranslation()
  const overall = worstStatus(checks)
  const { heading, rows } = foldChecks(checks)
  const showQuality = !qualityUnavailable
  const showChecks = status !== 'published'
  const canAssess = showQuality && !isSubmitted(status)
  const awaiting = awaitingPlatform(checks)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-3 pt-4 pb-6 text-sm lg:px-6">
        {showChecks && (
          <section className="flex flex-col gap-3">
            <p className="flex items-center gap-2">
              <StatusIcon status={overall} />
              <span>{checksSummary(checks)}</span>
            </p>
            {/* Nothing more while the platform is unpicked — the line above
                has already said the only true thing there is to say. The
                platform and post type are the heading: they are what the rows
                are measured against. */}
            {!awaiting && (
              <>
                <SmallHeading as="h3" className="pt-2">
                  {heading}
                </SmallHeading>
                <ul className="flex flex-col gap-1.5">
                  {rows.map((check) => (
                    <li key={check.id} className="flex items-start gap-2">
                      <StatusIcon status={check.status} className="mt-0.5" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-foreground">{check.label}</span>
                        {check.detail && (
                          <span
                            className={cn(
                              // Colour is reserved for the two statuses that
                              // mean something needs doing, and it is the same
                              // colour for both — matching `StatusIcon`. A
                              // passing measurement is just information.
                              check.status === 'fail' || check.status === 'warn'
                                ? 'text-warning'
                                : 'text-secondary-foreground',
                            )}
                          >
                            {check.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {showQuality && (
          <section
            className={cn(
              'flex flex-col gap-3',
              showChecks && 'border-t border-border pt-5',
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <SmallHeading as="h3">
                {t('posts.quality.inlineHeading')}
              </SmallHeading>
              {canAssess && (
                <AssessLink
                  assessment={assessment}
                  assessing={assessing}
                  exhausted={exhausted}
                  onAssess={onAssess}
                />
              )}
            </div>
            {assessment ? (
              <QualityInlineSummary
                assessment={assessment}
                previous={previousAssessment}
                onOpenPanel={onOpenQuality}
              />
            ) : (
              assessment === null &&
              !assessing && (
                <p className="text-tertiary-foreground">
                  {t('posts.editor.checks.notAssessed')}
                </p>
              )
            )}
          </section>
        )}
      </div>
    </div>
  )
}

/** How many problems the Overview names before it says "and N more". */
const SUMMARY_ROWS = 3

/**
 * The Overview's Health row: the Checks tab cut to its verdict and the first
 * few requirements that fail, the verdict opening the tab with the rest.
 *
 * It exists because nobody opens a tab to find out whether they should care
 * what is in it. Gone once the post is `published`, as on the Checks tab:
 * the requirements were a forecast, and publishing settled it.
 */
export function PostChecksSummary({
  checks,
  onOpen,
}: {
  checks: PostCheck[]
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const problems = awaitingPlatform(checks)
    ? []
    : checks.filter((c) => c.status === 'fail' || c.status === 'warn')
  const more = problems.length - SUMMARY_ROWS
  const label = t('posts.editor.tabs.checks')

  return (
    <SettingRow
      label={label}
      note={
        problems.length > 0 && (
          <ul className="flex flex-col gap-0.5 text-sm">
            {problems.slice(0, SUMMARY_ROWS).map((check) => (
              <li key={check.id} className="min-w-0 text-foreground">
                {problemSentence(t, check)}
              </li>
            ))}
            {more > 0 && (
              <li className="text-tertiary-foreground">
                {t('posts.editor.overview.moreChecks', { count: more })}
              </li>
            )}
          </ul>
        )
      }
    >
      <SummaryLine onOpen={onOpen} label={label}>
        <StatusIcon status={worstStatus(checks)} />
        <span className="min-w-0 truncate">{checksSummary(checks)}</span>
      </SummaryLine>
    </SettingRow>
  )
}

/**
 * A failing check as one plain sentence — "Length is 106 characters over." —
 * falling back to its label and detail for a check that sets no problem.
 */
function problemSentence(t: TFunction, check: PostCheck): string {
  const problem = check.problem
  if (!problem)
    return check.detail ? `${check.label}: ${check.detail}` : check.label
  if ('text' in problem) return problem.text
  return t(`posts.editor.overview.problems.${problem.key}`, {
    count: problem.count ?? 1,
    max: problem.max,
  })
}

/**
 * The Overview's Quality row: the score, its band and how many suggestions it
 * made — opening the Quality tab — or, before there is one, the offer to take
 * it. The offer goes once the post is submitted, as on the Checks tab.
 */
export function PostQualitySummary({
  status,
  assessment,
  assessing,
  exhausted = false,
  onAssess,
  onOpen,
}: {
  status: PostStatus
  assessment: PostEvaluation | null | undefined
  assessing: boolean
  exhausted?: boolean
  onAssess: () => void
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const label = t('posts.editor.overview.score')
  const mark = (
    <GaugeIcon className="size-4 shrink-0 text-tertiary-foreground" />
  )

  if (assessment) {
    return (
      <SettingRow label={label}>
        <SummaryLine onOpen={onOpen} label={t('posts.editor.tabs.quality')}>
          {mark}
          <QualityLine assessment={assessment} />
        </SummaryLine>
      </SettingRow>
    )
  }
  return (
    <SettingRow label={label}>
      {mark}
      <span className="min-w-0 truncate text-tertiary-foreground">
        {assessment === null && !assessing
          ? t('posts.editor.overview.notAssessed')
          : null}
      </span>
      {!isSubmitted(status) && (
        <span className="ml-auto">
          <AssessLink
            assessment={assessment}
            assessing={assessing}
            exhausted={exhausted}
            onAssess={onAssess}
          />
        </span>
      )}
    </SettingRow>
  )
}

/** "72 GOOD · 3 suggestions" — the score, its band, and whether to look. */
function QualityLine({ assessment }: { assessment: PostEvaluation }) {
  const { t } = useTranslation()
  const pct = Math.round(overallPct(assessment))
  const suggestions = postSuggestions(assessment)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="font-medium tabular-nums text-foreground">
        {formatNumber(pct)}
      </span>
      <BandTag band={overallBand(pct)} />
      {suggestions.length > 0 && (
        <span className="min-w-0 truncate text-secondary-foreground">
          {suggestionCountLine(t, suggestions)}
        </span>
      )}
    </span>
  )
}

/**
 * Start a run, from the tab.
 *
 * A text link because the offer and the repeat of it are the same action,
 * only the wording differs.
 *
 * Silent while the stored score is still loading (`undefined`): the label
 * would otherwise say "Assess" for as long as the fetch takes and then change
 * under the cursor into "Re-assess", inviting a paid run over a score that was
 * already there.
 */
function AssessLink({
  assessment,
  assessing,
  exhausted,
  onAssess,
}: {
  assessment: PostEvaluation | null | undefined
  assessing: boolean
  exhausted: boolean
  onAssess: () => void
}) {
  const { t } = useTranslation()
  if (assessment === undefined && !assessing) return null

  if (assessing) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-tertiary-foreground">
        <CircleDashedIcon className="size-4 animate-spin" />
        <span>{t('posts.quality.assessing')}</span>
      </span>
    )
  }

  // Said rather than hidden: a link that vanishes reads as a glitch, and the
  // Quality tab's hint says the rest.
  if (exhausted) {
    return (
      <span className="shrink-0 text-tertiary-foreground">
        {t('posts.quality.runs.noneShort')}
      </span>
    )
  }

  return (
    // Inline, not a flex box: the words carry the baseline, so the link sits
    // on its heading's line; the mark rides the text like a glyph.
    // At the heading's 12px: a link bigger than the heading it answers
    // outweighs it.
    <TextButton className="shrink-0 text-xs" onClick={onAssess}>
      <GradientMark
        icon={SparkleIcon}
        weight="bold"
        className="mr-1 size-3.5"
      />
      <span className="text-sweep">
        {assessment ? t('posts.quality.reassess') : t('posts.quality.assess')}
      </span>
    </TextButton>
  )
}

function StatusIcon({
  status,
  className,
}: {
  status: CheckStatus
  className?: string
}) {
  const shared = cn('size-4 shrink-0', className)
  switch (status) {
    // One warning mark for both, in warning orange. A red cross is the
    // vocabulary of a failed operation — something the user did that went
    // wrong — and nothing here has been attempted yet: an unfinished draft is
    // the ordinary state of a post being written. Destructive red belongs to
    // the actions that destroy things, and spending it on "you haven't picked
    // a post type" is what makes it stop meaning anything there.
    case 'fail':
    case 'warn':
      return (
        <WarningCircleIcon
          weight="fill"
          className={cn(shared, 'text-warning')}
        />
      )
    case 'pending':
      return (
        <CircleDashedIcon
          className={cn(shared, 'text-tertiary-foreground animate-spin')}
        />
      )
    default:
      return (
        <CheckCircleIcon
          weight="fill"
          className={cn(shared, 'text-tertiary-foreground')}
        />
      )
  }
}
