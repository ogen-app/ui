import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  CircleIcon,
  ClockIcon,
  LightbulbIcon,
} from '@phosphor-icons/react'
import { cn } from '@/lib'
import { parseIdeaNote } from '@/lib/assetAnalysis'
import type { Idea } from '@/lib/ideas'
import { ideaFromWire } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { SourceChip } from './SourceChip'

/** How many ideas show before "Show N more". */
const FIRST_IDEAS = 5

/**
 * The ideas one lens distilled (CON-364), as the Ideas inbox holds them.
 *
 * Read-only on purpose: triage lives in the inbox, and turning an idea into a
 * post is its own piece of work (CON-365). A row opens in place to show the
 * angle in full, why it fits and where in the source it comes from, with the
 * way to the inbox under it. An idea someone has already said no to is left
 * out — it was answered, and this list is what is still worth making.
 */
export function AssetIdeaList({
  lens,
  spreadsheet = false,
}: {
  lens: AssetAnalysis
  /**
   * A spreadsheet's ideas quote its figures, and a workbook is usually
   * internal data — so the footnote says to check before posting.
   */
  spreadsheet?: boolean
}) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const ideas = useMemo(
    () => lens.ideas.map(ideaFromWire).filter((idea) => idea.verdict !== 'no'),
    [lens.ideas],
  )
  const shown = showAll ? ideas : ideas.slice(0, FIRST_IDEAS)
  const hidden = ideas.length - shown.length

  const heading =
    lens.campaign_id !== null && lens.campaign_name
      ? t('assetInsights.ideas.headingFor', { campaign: lens.campaign_name })
      : t('assetInsights.ideas.heading')

  return (
    <section className="flex flex-col gap-4 border-t border-quaternary pt-8">
      <header className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
          <LightbulbIcon className="size-5 text-accent" aria-hidden />
          <span>{heading}</span>
          {ideas.length > 0 && (
            <span className="font-normal text-tertiary-foreground">
              {ideas.length}
            </span>
          )}
        </h3>
        {ideas.length > 0 && (
          <InboxLink lens={lens} label={t('assetInsights.ideas.viewAll')} />
        )}
      </header>

      {ideas.length === 0 ? (
        <div className="flex items-start gap-3 py-2">
          <LightbulbIcon
            className="mt-0.5 size-5 shrink-0 text-tertiary-foreground"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {t('assetInsights.ideas.emptyTitle')}
            </p>
            <p className="text-sm text-tertiary-foreground">
              {t('assetInsights.ideas.emptyBody')}
            </p>
          </div>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {shown.map((idea, index) => (
              <IdeaRow
                key={idea.id}
                index={index}
                idea={idea}
                lens={lens}
                expanded={open === idea.id}
                onToggle={() => setOpen(open === idea.id ? null : idea.id)}
              />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="cursor-pointer self-start text-sm font-medium text-accent hover:underline"
            >
              {t('assetInsights.ideas.showMore', { count: hidden })}
            </button>
          )}
          <p className="text-xs text-tertiary-foreground">
            {t('assetInsights.ideas.footnote')}
            {spreadsheet && ` ${t('assetInsights.sheet.footnote')}`}
          </p>
        </>
      )}
    </section>
  )
}

function IdeaRow({
  index,
  idea,
  lens,
  expanded,
  onToggle,
}: {
  /** Its place in the list — rows arrive one after another, not at once. */
  index: number
  idea: Idea
  lens: AssetAnalysis
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const { angle, rationale, sources } = parseIdeaNote(idea.note)
  const Caret = expanded ? CaretDownIcon : CaretRightIcon
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
      className={cn(
        'rounded-md border border-quaternary transition-colors motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both',
        expanded ? 'bg-secondary' : 'hover:bg-secondary',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
      >
        <VerdictMark idea={idea} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            {idea.title}
          </span>
          {angle && !expanded && (
            <span className="truncate text-sm text-tertiary-foreground">
              {angle}
            </span>
          )}
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {/* Labels only: these sit inside the row's button. The playable
              chips are in the opened row. */}
          {sources.slice(0, 3).map((s) => (
            <SourceChip key={s} label={s} interactive={false} />
          ))}
        </span>
        <Caret className="mt-0.5 size-4 shrink-0 text-tertiary-foreground" />
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 pl-11">
          {angle && (
            <p className="text-sm leading-6 text-foreground">{angle}</p>
          )}
          {rationale && (
            <p className="whitespace-pre-line text-sm leading-6 text-secondary-foreground">
              {rationale}
            </p>
          )}
          {sources.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <SourceChip key={s} label={s} citedBy={idea.title} />
              ))}
            </span>
          )}
          <p className="border-t border-quaternary pt-3 text-xs text-tertiary-foreground">
            {t(`assetInsights.ideas.where.${idea.verdict ?? 'inbox'}`)} ·{' '}
            <InboxLink lens={lens} label={t('assetInsights.ideas.open')} />
          </p>
        </div>
      )}
    </li>
  )
}

function VerdictMark({ idea }: { idea: Idea }) {
  const { t } = useTranslation()
  const label = t(`assetInsights.ideas.verdict.${idea.verdict ?? 'inbox'}`)
  const className = 'mt-0.5 size-4 shrink-0'
  switch (idea.verdict) {
    case 'yes':
      return (
        <CheckIcon
          weight="bold"
          className={cn(className, 'text-accent')}
          aria-label={label}
        />
      )
    case 'later':
      return (
        <ClockIcon
          className={cn(className, 'text-warning')}
          aria-label={label}
        />
      )
    default:
      return (
        <CircleIcon
          className={cn(className, 'text-tertiary-foreground')}
          aria-label={label}
        />
      )
  }
}

/**
 * The Ideas page these rows live on: the campaign's for a campaign lens, whose
 * ideas are filed to it, and the workspace's otherwise.
 */
function InboxLink({ lens, label }: { lens: AssetAnalysis; label: string }) {
  const className = 'text-accent hover:underline'
  return lens.campaign_id ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId: lens.campaign_id }}
      className={cn(className, 'text-sm font-medium')}
    >
      {label}
    </Link>
  ) : (
    <Link to="/ideas" className={cn(className, 'text-sm font-medium')}>
      {label}
    </Link>
  )
}
