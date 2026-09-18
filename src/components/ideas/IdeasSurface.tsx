import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { useIdeas, useIdeaWriter } from '@/hooks/useIdeas'
import {
  countIdeas,
  decidedIdeas,
  triageQueue,
  type IdeaVerdict,
} from '@/lib/ideas'
import { IdeaCapture } from './IdeaCapture'
import { IdeaRow } from './IdeaRow'
import { VERDICT_ORDER, VERDICTS } from './verdicts'
import { cn } from '@/lib'

/**
 * What each pile says when it is the one you are looking at and it is empty.
 *
 * A table of keys rather than a key built from the pile name: i18next's keys
 * are a literal union here, and a template string is exactly the construction
 * that compiles today and stops naming a real entry the day a pile is renamed.
 */
const PILE_EMPTY = {
  waiting: 'ideas.pileEmpty.waiting',
  yes: 'ideas.pileEmpty.yes',
  later: 'ideas.pileEmpty.later',
  no: 'ideas.pileEmpty.no',
} as const satisfies Record<IdeaVerdict | 'waiting', string>

/**
 * Ideas — capture at the top, the undecided underneath, the answered piles
 * behind four counts.
 *
 * **Why this and not a board.** A kanban is a good picture of work in flight:
 * a handful of cards, each in a stage, moving left to right as somebody does
 * something to them. A backlog of ideas is neither of those things. It is one
 * big undifferentiated pile that has to be cheap to add to and occasionally
 * gets *answered* — and dragging a card out of a column is a fine way to move
 * the third item of nine and a miserable way to answer the forty-seventh of
 * two hundred: find the card, grab it, aim at a column, let go, four acts of
 * precision to say one word. So the same piles are here as counts you switch
 * between rather than columns you drag across. What a board buys — seeing the
 * piles at once — is worth little when two of the three are history.
 *
 * **And the answering happens on the row, not in a mode of its own.** An
 * earlier draft had a full-screen session: one idea at a time, answered from
 * the keyboard. It looked like the fast path and was not one, because the
 * decision was never the slow part — reading the line is, and the line is
 * already legible in the list. What the session actually added was a place to
 * go and come back from, a second set of controls to keep in step with the
 * row's, and a snapshot of the queue that could disagree with what was on
 * screen. The row carries the sentence and the three answers, which is the
 * whole of triage, so triage is just using the list.
 *
 * **The counts are the navigation and they always sum to the list.** Waiting,
 * yes, later, no — every idea in exactly one of them, which is why a woken
 * postponement is counted as waiting and not also as later. A set of tabs whose
 * figures do not add up is a screen people stop trusting long before they
 * report it.
 *
 * One component for both levels. The campaign's Ideas page is this with
 * `campaignId` set: the same rows, filtered, and captures made there belong to
 * that campaign. The workspace's is the same list with the filter off.
 */
export function IdeasSurface({
  campaignId = null,
  /** Given at workspace level, where this owns the page header. */
  heading,
}: {
  campaignId?: string | null
  heading?: string
}) {
  const { t } = useTranslation()
  const { ideas, isLoading, isError } = useIdeas(campaignId)
  const { capture, decide, undecide, edit, remove } = useIdeaWriter(campaignId)

  /**
   * The clock, read once when the screen opens.
   *
   * Everything time-dependent here is a postponement coming due, which is a
   * once-a-month event per idea — so the honest granularity is "when you open
   * the page", and an interval re-render would be a timer running all day to
   * catch a boundary nobody is watching for.
   */
  const [now] = useState(() => new Date())

  const [pile, setPile] = useState<IdeaVerdict | 'waiting'>('waiting')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const counts = useMemo(() => countIdeas(ideas, now), [ideas, now])
  const waiting = useMemo(() => triageQueue(ideas, now), [ideas, now])
  const visible = useMemo(
    () => (pile === 'waiting' ? waiting : decidedIdeas(ideas, pile, now)),
    [ideas, now, pile, waiting],
  )

  const body = (() => {
    if (isLoading) return <PageLoader />
    if (isError) return <PageError header={t('ideas.loadFailed')} />

    return (
      <div className="flex grow flex-col px-3 lg:px-6 pb-10">
        {/* One column, and everything on the screen is inside it — the capture
            box, the counts, the rows, and what stands in for them when there
            are none. The first-run state used to be a full-bleed illustration
            while the list that replaces it was this narrow, so filing the very
            first idea moved the whole screen sideways under the person who
            filed it. A page whose width is a function of how much is on it
            reads as two different pages. */}
        <div className="mx-auto flex w-full max-w-content grow flex-col gap-4">
          <IdeaCapture onCapture={(title) => void capture(title)} />

          {ideas.length === 0 ? (
            // No illustration and no empty-state panel: the field above is
            // not a call to action, it *is* the action, and a picture under it
            // saying "no ideas yet" only restates the blank list.
            <div className="pt-6">
              <p className="text-sm text-secondary-foreground">
                {t('ideas.empty.title')}
              </p>
              <p className="pt-1 text-sm text-tertiary-foreground">
                {t('ideas.empty.subtitle')}
              </p>
            </div>
          ) : (
            <>
              <PileTabs counts={counts} active={pile} onSelect={setPile} />

              <div className="flex flex-col gap-2">
                {visible.length === 0 ? (
                  <p className="py-8 text-center text-sm text-tertiary-foreground">
                    {t(PILE_EMPTY[pile])}
                  </p>
                ) : (
                  visible.map((idea) => (
                    <IdeaRow
                      key={idea.id}
                      idea={idea}
                      now={now}
                      showCampaign={campaignId === null}
                      expanded={idea.id === expandedId}
                      onToggle={() =>
                        setExpandedId((id) => (id === idea.id ? null : idea.id))
                      }
                      onDecide={(verdict, remindAt) =>
                        void decide(idea.id, verdict, remindAt)
                      }
                      onUndecide={() => void undecide(idea.id)}
                      onEdit={(change) => void edit(idea.id, change)}
                      onDelete={() => void remove(idea.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  })()

  // The campaign's document shell owns the header and the scrolling for its
  // sections, so at that level this renders bare.
  if (!heading) return body

  return (
    <PageContainer variant="fullFlex">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader title={heading} />
        {body}
      </div>
    </PageContainer>
  )
}

/**
 * The four piles as one row of counts.
 *
 * Counts rather than bare labels because the figure is the reason to switch:
 * "Later 12" is an invitation and "Later" is a filing cabinet. The active one
 * is marked by weight and a rule under it rather than by colour — three of
 * these four are neutral states, and colouring the selection would compete with
 * the verdict glyphs on the rows below.
 */
function PileTabs({
  counts,
  active,
  onSelect,
}: {
  counts: ReturnType<typeof countIdeas>
  active: IdeaVerdict | 'waiting'
  onSelect: (pile: IdeaVerdict | 'waiting') => void
}) {
  const { t } = useTranslation()
  const piles = ['waiting', ...VERDICT_ORDER] as const

  return (
    <div className="flex items-center gap-1 border-b border-quaternary">
      {piles.map((pile) => (
        <button
          key={pile}
          type="button"
          onClick={() => onSelect(pile)}
          aria-current={pile === active}
          className={cn(
            'cursor-pointer border-b-2 px-3 py-2 text-sm transition-colors',
            pile === active
              ? 'border-primary-foreground font-medium text-primary-foreground'
              : 'border-transparent text-tertiary-foreground hover:text-primary-foreground',
          )}
        >
          {pile === 'waiting'
            ? t('ideas.pile.waiting')
            : t(VERDICTS[pile].labelKey)}
          <span className="ml-1.5 text-tertiary-foreground tabular-nums">
            {counts[pile]}
          </span>
        </button>
      ))}
    </div>
  )
}
