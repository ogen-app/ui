import { CheckIcon, CircleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib'
import { counted, formatDate } from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'
import { DISABLED_ACCENT, StepCard, StepFooter } from '../OnboardingFrame'

export const PLAN_STEPS = ['brief', 'brand', 'slots', 'drafts'] as const

export type PlannedPost = {
  id: string
  /** The platform's `zernio_id`. */
  platform: string
  /** `YYYY-MM-DD`. */
  date: string
  postType: string
  title: string
  /** Still being written. */
  writing?: boolean
}

/**
 * The plan being made — `generate-draft`'s stream, drawn as it lands: the
 * steps it reports as a checklist (the brand read's grammar: a tick for done,
 * a pulsing dot for the one in hand, a ring for what is to come), and each
 * post as a row the moment its `post` event says it is saved. The campaign
 * opens when it is done; nothing is scheduled until the person says so.
 */
export function PlanningStep({
  campaign,
  stepIndex,
  posts,
  done,
  onOpen,
}: {
  campaign: string
  /** How far the stream has got through `PLAN_STEPS`. */
  stepIndex: number
  posts: PlannedPost[]
  done: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const written = posts.filter((p) => !p.writing).length

  return (
    <StepCard
      title={t('onboarding.planning.title', { campaign })}
      lead={t('onboarding.planning.lead')}
      footer={
        <StepFooter
          next={
            <div className="flex items-center gap-3">
              {written > 0 && (
                <span className="text-sm text-secondary-foreground tabular-nums">
                  {t('onboarding.planning.drafted', counted(written))}
                </span>
              )}
              <Button
                variant="accent"
                className={DISABLED_ACCENT}
                disabled={!done}
                onClick={onOpen}
              >
                {t('onboarding.planning.open')}
              </Button>
            </div>
          }
        />
      }
    >
      <ol className="flex flex-col gap-2.5">
        {PLAN_STEPS.map((step, i) => {
          const state =
            done || i < stepIndex ? 'done' : i === stepIndex ? 'now' : 'next'
          return (
            <li key={step} className="flex items-center gap-3 text-sm">
              {state === 'done' ? (
                <CheckIcon
                  aria-hidden
                  weight="bold"
                  className="size-4 animate-step-tick text-positive"
                />
              ) : state === 'now' ? (
                <span
                  aria-hidden
                  className="relative flex size-4 items-center justify-center"
                >
                  <span className="absolute size-1.5 animate-step-ping rounded-full bg-warning" />
                  <span className="relative size-1.5 rounded-full bg-warning" />
                </span>
              ) : (
                <CircleIcon
                  aria-hidden
                  className="size-4 text-quaternary-foreground"
                />
              )}
              <span
                className={cn(
                  state === 'next'
                    ? 'text-secondary-foreground'
                    : 'text-primary-foreground',
                  state === 'now' && 'font-medium',
                )}
              >
                {t(`onboarding.planning.steps.${step}`)}
              </span>
            </li>
          )
        })}
      </ol>

      {posts.length > 0 && (
        <ul className="flex flex-col border-t border-quaternary">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))}
        </ul>
      )}
    </StepCard>
  )
}

function PostRow({ post }: { post: PlannedPost }) {
  const { t } = useTranslation()
  const platform = getPlatformByZernioId(post.platform)
  const Icon = platform?.icon
  const type = platform?.postTypes.find((p) => p.slug === post.postType)

  return (
    <li className="page-content-motion flex items-center gap-3 border-b border-quaternary py-3">
      <span className="w-24 shrink-0 text-sm text-secondary-foreground tabular-nums">
        {formatDate(`${post.date}T12:00:00`, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </span>
      {Icon && (
        <Icon
          aria-hidden
          weight="fill"
          className="size-4 shrink-0"
          style={{ color: platform.color }}
        />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          post.writing && 'text-secondary-foreground',
        )}
      >
        {post.title}
      </span>
      {post.writing ? (
        <span className="flex shrink-0 items-center gap-2 text-sm text-secondary-foreground">
          <Spinner tone="onSurface" className="w-4" />
          {t('onboarding.planning.writing')}
        </span>
      ) : (
        <span className="shrink-0 text-sm text-secondary-foreground">
          {type?.label}
        </span>
      )}
    </li>
  )
}
