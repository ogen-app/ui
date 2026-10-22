import { ChatCircleTextIcon } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageActionBar } from '@/components/page-primitives/PageActionBar'
import {
  useAnswerDistill,
  useCommitDistill,
  useDiscardDistill,
} from '@/hooks/useBrandDistill'
import {
  buildCommit,
  commitIsEmpty,
  keptTally,
  readableCount,
  runRoute,
  siteHost,
  type DistillReview,
  type RunRoute,
} from '@/lib/brandDistill'
import { sourceLabel } from '@/lib/brandDistillCopy'
import { formatList } from '@/lib/intl'
import {
  useBrandDistillStore,
  useDistillReview,
} from '@/stores/brandDistillStore'
import type { DistillProposal, DistillRun } from '@/types/brandDistill'
import type { BrandData } from '../types'
import { GapQuestions } from './Questions'
import { FactsReview, GuardrailsReview } from './ReviewLines'
import { AudiencesReview, VoicesReview, type SourceNoun } from './ReviewEntries'

/**
 * What a finished read proposes, before any of it is saved (CON-400 boards
 * 3–5B).
 *
 * **Laid out like the hub**: the same section cards in the same order, so what
 * is proposed is already where it will live. Above them, the summary — what was
 * read, what is proposed, what was left out and why — and, while there are
 * any, the questions the sources left open.
 *
 * **Everything starts kept; the job is to drop.** The save bar says how many
 * of how many are going in, and saving sends only those, edits and all. The
 * bar is `PageActionBar` because this is an editor screen with one thing to
 * commit.
 */
export function ReviewScreen({
  run,
  proposal,
  brand,
}: {
  run: DistillRun
  proposal: DistillProposal
  /** The workspace's brand as it is — for the default, and "yours". */
  brand: BrandData | undefined
}) {
  const review = useDistillReview(run.id)
  const updateReview = useBrandDistillStore((s) => s.updateReview)
  const update = (fn: (r: DistillReview) => DistillReview) =>
    updateReview(run.id, fn)
  const closed = useBrandDistillStore((s) => s.closedQuestions.includes(run.id))
  const closeQuestions = useBrandDistillStore((s) => s.closeQuestions)
  const openQuestions = useBrandDistillStore((s) => s.openQuestions)

  const answer = useAnswerDistill(run.id)

  const route = runRoute(run)
  const g = proposal.guardrails
  const hasGuardrails =
    g.mayClaim.length + g.neverClaim.length + g.bannedWords.length > 0 ||
    g.disclaimer !== null
  const ctx = {
    review,
    update,
    answers: run.answers,
    sources: run.sources,
  }

  return (
    <>
      {proposal.questions.length > 0 && !closed && (
        <GapQuestions
          questions={proposal.questions}
          route={route}
          busy={answer.isPending}
          onAsk={(answers) => answer.mutate(answers)}
          onClose={() => closeQuestions(run.id)}
        />
      )}
      <Summary
        run={run}
        proposal={proposal}
        onOpenQuestions={() => {
          openQuestions(run.id)
          requestAnimationFrame(() =>
            document
              .getElementById('gap-questions')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          )
        }}
      />
      {proposal.voices.length > 0 && (
        <VoicesReview
          voices={proposal.voices}
          // A brand not yet read is not a brand with no voices: the star
          // promises the default, and only a workspace known to have none
          // gets it.
          hasVoices={brand === undefined || brand.voices.length > 0}
          sourceNoun={sourceNoun(route)}
          {...ctx}
        />
      )}
      {proposal.audiences.length > 0 && (
        <AudiencesReview audiences={proposal.audiences} {...ctx} />
      )}
      {hasGuardrails && (
        <GuardrailsReview
          proposal={proposal}
          currentWrittenAt={brand?.guardrails?.updatedAt ?? null}
          {...ctx}
        />
      )}
      {proposal.facts.length > 0 && (
        <FactsReview facts={proposal.facts} {...ctx} />
      )}
    </>
  )
}

/**
 * The review's commit: `N of M kept · DISCARD · SAVE TO FOUNDATION`.
 *
 * Its own component because the bar anchors to the content column, outside
 * the scroller the cards are in (`PageActionBar`) — the route renders it there.
 * It reads the same review the cards write, from the store, by run.
 *
 * Saving sends the kept items with every edit applied, lands back on the hub,
 * and leaves the receipt for the hub's one-off card. Discarding closes the run
 * — nothing was saved, so there is nothing to undo, and the read goes back to
 * the allowance if it never reached the model.
 */
export function ReviewBar({
  run,
  proposal,
}: {
  run: DistillRun
  proposal: DistillProposal
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const review = useDistillReview(run.id)
  const setSaved = useBrandDistillStore((s) => s.setSaved)
  const forgetReview = useBrandDistillStore((s) => s.forgetReview)
  const commit = useCommitDistill(run.id)
  const discard = useDiscardDistill(run.id)
  const route = runRoute(run)
  const body = buildCommit(proposal, review)
  const { kept, total } = keptTally(proposal, review)

  const save = () =>
    commit.mutate(body, {
      onSuccess: (result) => {
        setSaved({
          runId: run.id,
          result,
          source: { route, label: sourceLabel(t, run) },
        })
        forgetReview(run.id)
        void navigate({ to: '/foundation' })
      },
    })

  return (
    <PageActionBar
      status={{
        key: `${kept}/${total}`,
        full: (
          <span className="px-1 text-sm font-medium tabular-nums">
            {t('brand.distill.review.kept', { kept, count: total })}
          </span>
        ),
        compact: (
          <span className="px-1 text-sm font-medium tabular-nums">
            {t('brand.distill.review.keptShort', { kept, count: total })}
          </span>
        ),
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        loading={discard.isPending}
        disabled={commit.isPending}
        onClick={() =>
          discard.mutate(undefined, {
            onSuccess: () => void navigate({ to: '/foundation' }),
          })
        }
      >
        {t('brand.distill.review.discard')}
      </Button>
      <Button
        size="sm"
        variant="defaultInverted"
        loading={commit.isPending}
        disabled={commitIsEmpty(body) || discard.isPending}
        onClick={save}
      >
        {t('brand.distill.review.save')}
      </Button>
    </PageActionBar>
  )
}

/**
 * "From 10 pages of acme-roasters.com, Ogen proposes 2 voices, 1 audience, 11
 * guardrail lines and 14 facts — every one quoting where it came from."
 *
 * Then what was left out and why — the drops the server counted rather than
 * hid — and, when the read ended with questions, a way to them.
 */
function Summary({
  run,
  proposal,
  onOpenQuestions,
}: {
  run: DistillRun
  proposal: DistillProposal
  onOpenQuestions: () => void
}) {
  const { t, i18n } = useTranslation()
  const route = runRoute(run)
  const g = proposal.guardrails
  const lines = g.mayClaim.length + g.neverClaim.length + (g.disclaimer ? 1 : 0)
  const parts = [
    proposal.voices.length > 0 &&
      t('brand.distill.count.voices', { count: proposal.voices.length }),
    proposal.audiences.length > 0 &&
      t('brand.distill.count.audiences', { count: proposal.audiences.length }),
    lines > 0 && t('brand.distill.count.lines', { count: lines }),
    g.bannedWords.length > 0 &&
      t('brand.distill.count.words', { count: g.bannedWords.length }),
    proposal.facts.length > 0 &&
      t('brand.distill.count.facts', { count: proposal.facts.length }),
  ].filter((p): p is string => Boolean(p))
  const what = formatList(parts, 'conjunction', i18n.language)

  const from =
    route === 'website' && run.website
      ? t('brand.distill.summary.fromPages', {
          count: readableCount(run),
          site: siteHost(run.website.url),
        })
      : route === 'document'
        ? run.sources.length === 1
          ? t('brand.distill.summary.fromFile', {
              title: run.sources[0].title,
            })
          : t('brand.distill.summary.fromFiles', {
              count: run.sources.length,
            })
        : t('brand.distill.summary.fromAnswers')

  const { duplicate, ungrounded, limit } = proposal.dropped
  const leftOut = [
    duplicate > 0 &&
      t('brand.distill.summary.leftDuplicate', { count: duplicate }),
    ungrounded > 0 &&
      t(`brand.distill.summary.leftUngrounded.${sourceNoun(route)}` as const, {
        count: ungrounded,
      }),
    limit > 0 && t('brand.distill.summary.leftLimit', { count: limit }),
  ].filter((p): p is string => Boolean(p))

  const questions = proposal.questions.length

  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-3 bg-primary px-6 py-6">
      <p className="text-base leading-6">
        {parts.length > 0
          ? t('brand.distill.summary.proposes', { from, what })
          : t('brand.distill.summary.nothing', { from })}
      </p>
      {leftOut.length > 0 && (
        <p className="text-sm leading-5 text-secondary-foreground">
          {t('brand.distill.summary.leftOut', {
            what: formatList(leftOut, 'conjunction', i18n.language),
          })}
        </p>
      )}
      {questions > 0 && (
        <p className="flex items-start gap-2 border-t border-quaternary pt-3 text-sm leading-5">
          <ChatCircleTextIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-accent"
          />
          <span>
            {t(`brand.distill.summary.gaps.${route}` as const, {
              count: questions,
            })}{' '}
            <button
              type="button"
              onClick={onOpenQuestions}
              className="cursor-pointer font-medium text-accent hover:underline"
            >
              {t('brand.distill.summary.answer', { count: questions })}
            </button>
          </span>
        </p>
      )}
    </section>
  )
}

function sourceNoun(route: RunRoute): SourceNoun {
  return route === 'website'
    ? 'site'
    : route === 'document'
      ? 'files'
      : 'answers'
}
