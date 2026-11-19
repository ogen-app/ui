import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  CircleDashedIcon,
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
import { QualityInlineSummary } from '../quality/QualityInlineSummary'
import type { PostEvaluation } from '@/types/quality'
import type { PostStatus } from '@/types/posts'

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
                <h3 className="pt-2 font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
                  {heading}
                </h3>
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
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
                {t('posts.quality.inlineHeading')}
              </h3>
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
    <button
      type="button"
      onClick={onAssess}
      className="flex shrink-0 items-center gap-1.5 text-tertiary-foreground underline underline-offset-2 hover:text-foreground cursor-pointer"
    >
      <SparkleIcon className="size-4" />
      <span>
        {assessment ? t('posts.quality.reassess') : t('posts.quality.assess')}
      </span>
    </button>
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
