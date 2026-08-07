import { useState } from 'react'
import {
  CaretDownIcon,
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
import { overallPct } from '@/lib/postQuality.ts'
import { QualityInlineSummary } from './quality/QualityInlineSummary.tsx'
import type { PostEvaluation } from '@/types/quality'

type Props = {
  checks: PostCheck[]
  /** The stored score: `null` never assessed, `undefined` not loaded yet. */
  assessment: PostEvaluation | null | undefined
  /** The live post's `updated_at`, for the staleness flag. */
  postUpdatedAt: string
  /** Scoring is switched off for this workspace — the bar says nothing of it. */
  qualityUnavailable: boolean
  /** A run is streaming, here or in the rail — they are the same run. */
  assessing: boolean
  /** Starts a run without leaving the bar. */
  onAssess: () => void
  /** Opens the quality rail, where a result can actually be read. */
  onOpenQuality: () => void
  className?: string
}

/**
 * The pre-publish bar, between the quick-settings bar and the post itself.
 *
 * Two different questions, deliberately in one place since CON-183:
 *
 * - **Platform requirements** — every rule the server enforces (post-type
 *   structure, platform media constraints) plus the character limits the front
 *   end still owns, from `lib/postValidation.ts`. Free, recomputed as you
 *   type, and a failure here is a refusal: the post cannot publish.
 * - **Quality** — the CON-85 score. Advisory, costs a model call, and only
 *   runs when asked.
 *
 * Collapsed, both fit one line: the requirements verdict, then the score as a
 * plain trailing clause. Flat on purpose — no colour, no badge. The score is
 * an opinion sharing a line with a statement about whether publishing will
 * work, and styling it to compete would be the one way to make that line lie.
 */
export function PostValidationsSection({
  checks,
  assessment,
  postUpdatedAt,
  qualityUnavailable,
  assessing,
  onAssess,
  onOpenQuality,
  className,
}: Props) {
  const overall = worstStatus(checks)
  const { heading, rows } = foldChecks(checks)
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((o) => !o)
  const showQuality = !qualityUnavailable
  const awaiting = awaitingPlatform(checks)
  // With no platform there are no requirements to list, so the only thing
  // left to expand is a score — and if there isn't one, the disclosure would
  // open an empty drawer. It goes away instead of opening onto nothing.
  const expandable = !awaiting || Boolean(showQuality && assessment)

  return (
    <div className={cn('w-full bg-primary px-10 py-3', className)}>
      {/* Three controls, not one: the assess link starts a run and the
          disclosure opens the list, and a button inside a button is both
          invalid and unreachable by keyboard. One type size throughout — this
          is a single sentence about the post, and sizing its clauses
          differently ranked them for the eye in an order nothing means.
          The link trails the score it acts on rather than sitting by the
          disclosure at the right edge, which would have read as a second
          control of the list. */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* A plain span when there is nothing behind it: a control that
              looks identical to the one that opens the list, and does
              nothing, is worse than no control. */}
          <Summary as={expandable ? 'button' : 'span'} onClick={toggle} open={open}>
            <StatusIcon status={overall} />
            <span className="min-w-0 truncate">
              {checksSummary(checks)}
              {showQuality &&
                assessment &&
                ` · Post quality ${Math.round(overallPct(assessment))}`}
            </span>
          </Summary>

          {showQuality && (
            <AssessLink assessment={assessment} assessing={assessing} onAssess={onAssess} />
          )}
        </div>

        {expandable && (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-2 cursor-pointer text-tertiary-foreground"
          >
            <span>{open ? 'Hide checks' : 'Show checks'}</span>
            <CaretDownIcon
              className={cn('size-4 transition-transform', open && 'rotate-180')}
            />
          </button>
        )}
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        {/* `pb-2` closes the expanded area against the bar's own `py-3`: the
            two sections need more room around them than the collapsed line
            does, and without it the quality button sat on the bottom edge. */}
        <div className="overflow-hidden pb-2">
          {/* Nothing at all while the platform is unpicked — the collapsed
              line has already said the only true thing there is to say. */}
          {!awaiting && (
            <>
              {/* The platform and post type live in the heading rather than
                  beside the rows: they are what the rows are measured
                  against, and the expanded area now holds two sections, so
                  each needs to say which question it answers. Same typography
                  as the quality heading below it. */}
              <h3 className="pt-5 font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
                {heading}
              </h3>

              <ul className="flex flex-col gap-1.5 pt-3">
            {rows.map((check) => (
              <li key={check.id} className="flex items-start gap-2 text-sm">
                <StatusIcon status={check.status} className="mt-0.5" />
                <span className="text-foreground">{check.label}</span>
                {check.detail && (
                  <span
                    className={cn(
                      'min-w-0 flex-1',
                      // Colour is reserved for the two statuses that mean
                      // something needs doing, and it is the same colour for
                      // both — matching `StatusIcon`, which no longer draws a
                      // red cross. A passing measurement is just information
                      // and reads as body text; tinting it grey made the one
                      // row worth reading look like the disabled remains of
                      // the rows that were folded away.
                      check.status === 'fail' || check.status === 'warn'
                        ? 'text-warning'
                        : 'text-foreground',
                    )}
                  >
                    {check.detail}
                  </span>
                )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {showQuality && assessment && (
            <QualityInlineSummary
              assessment={assessment}
              postUpdatedAt={postUpdatedAt}
              onOpenPanel={onOpenQuality}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Start a run, from the bar, at any width and in either collapsed state.
 *
 * Kept to a text link because it has to survive the collapsed row, where it
 * shares one line with the verdict it must not outweigh — and because the
 * offer and the repeat of it are the same action, only the wording differs.
 *
 * Silent while the stored score is still loading (`undefined`): the label
 * would otherwise say "Assess" for as long as the fetch takes and then change
 * under the cursor into "Re-assess", inviting a paid run over a score that was
 * already there.
 */
function AssessLink({
  assessment,
  assessing,
  onAssess,
}: {
  assessment: PostEvaluation | null | undefined
  assessing: boolean
  onAssess: () => void
}) {
  if (assessment === undefined && !assessing) return null

  if (assessing) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 text-tertiary-foreground">
        <CircleDashedIcon className="size-4 animate-spin" />
        <span>Assessing…</span>
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
      <span>{assessment ? 'Re-assess' : 'Assess quality'}</span>
    </button>
  )
}

/**
 * The verdict line, which is a disclosure control only when there is something
 * behind it. Same classes either way so the text does not shift by a pixel
 * when a score arrives and turns it into a button.
 */
function Summary({
  as,
  open,
  onClick,
  children,
}: {
  as: 'button' | 'span'
  open: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const className = 'flex min-w-0 items-center gap-2 text-left'
  if (as === 'span') return <span className={className}>{children}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(className, 'cursor-pointer')}
    >
      {children}
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
      return <WarningCircleIcon weight="fill" className={cn(shared, 'text-warning')} />
    case 'pending':
      return (
        <CircleDashedIcon className={cn(shared, 'text-tertiary-foreground animate-spin')} />
      )
    default:
      return (
        <CheckCircleIcon weight="fill" className={cn(shared, 'text-tertiary-foreground')} />
      )
  }
}
