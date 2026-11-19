import { useState } from 'react'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  NotePencilIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FitRing } from '@/components/content/FitRing'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { SourceChip } from '@/components/content/asset-page/SourceChip'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useDateTimeLabel } from '@/hooks/useActivityLabels'
import { cn } from '@/lib'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import {
  POSTPONE_HORIZONS,
  hasWokenUp,
  postponeUntil,
  type Idea,
} from '@/lib/ideas'
import { citedPlace, ideaParts, isAnalysed } from '@/lib/ideaSource'
import { counted, formatDate } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { useIdeaPostRefs } from '@/hooks/useIdeaPosts'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import type { IdeaEdit } from '@/services/api/ideas'
import type { AssetListKind } from '@/types/assetList'
import {
  CARD,
  CARD_GRID,
  CARD_GRID_WIDE,
  CARD_SELECTED,
  opensCard,
} from '@/components/page-primitives/listCards'
import type { VerdictKey } from '@/lib/assetList'
import {
  AnswerRecord,
  FitSection,
  Part,
  type Answer,
} from './card/IdeaCardParts'
import { pileOf } from './card/ideaRow'
import { sourceFacts } from './card/sourceFacts'
import { HORIZON_KEYS, VERDICTS, VERDICT_ORDER, type Decide } from './verdicts'
import { NotGroundedMark } from '@/components/grounding/NotGroundedMark'
import { isNotGrounded } from '@/lib/grounding'
import { SeriesMark } from '@/components/series/SeriesMark'

/**
 * One idea on the Ideas page, as a card (design/ideas-cards): its own
 * surface, a hairline border, 4px from the next — the list's rules are in
 * `page-primitives/listCards`.
 *
 * **One 20px mark says where it came from**, on the title line: an analysed
 * idea's fit as a ring (the number on hover), a written one's writer as
 * initials in their colour, the assistant's suggestion as its spark. The line
 * under the summary names the source — the document and the places it cites,
 * or who wrote it and when — and at most one fact about where the idea
 * stands; opened, the card says everything.
 *
 * **The card is still the whole of triage.** The three answers are always on
 * it, in the same place: the one given is pressed, and pressing it again
 * takes it back. Hover only tints — nothing appears, moves or swaps — and the
 * whole card opens it.
 *
 * **Only a written idea is edited.** An analysed idea's words are the
 * analysis's and its score was given to them, so the server refuses a changed
 * title or note on one (409 `idea_read_only`); this card offers no field that
 * would be refused. Either kind can be moved to another campaign.
 */
export function IdeaRow({
  idea,
  now,
  expanded,
  onToggle,
  onDecide,
  onUndecide,
  onEdit,
  onDelete,
  /** The campaign's own list already knows which campaign it is. */
  showCampaign = true,
  compactSource = false,
  selection,
}: {
  idea: Idea
  now: Date
  expanded: boolean
  onToggle: () => void
  onDecide: Decide
  onUndecide: () => void
  onEdit: (change: IdeaEdit) => void
  /** Asks first — the surface holds the confirmation. */
  onDelete: () => void
  showCampaign?: boolean
  /**
   * Under a band that already names the document (grouped by source), the
   * source line keeps only the places it cites.
   */
  compactSource?: boolean
  /** The card's box, when the list can select. Shift extends a range. */
  selection?: {
    selected: boolean
    selecting: boolean
    onToggle: (shift: boolean) => void
  }
}) {
  const { t } = useTranslation()
  const analysed = isAnalysed(idea)
  const parts = ideaParts(idea)
  const answer: Answer = (verdict, remindAt = null) =>
    verdict === null ? onUndecide() : onDecide(verdict, remindAt)
  const editing = expanded && !analysed
  // An analysed idea's note is its parts; the angle is the line worth reading.
  const summary = parts ? parts.angle || parts.rationale : idea.note
  const selected = !!selection?.selected

  const verdict = pileOf(idea, now)
  const campaignName = useCampaignName(idea.campaignId)

  return (
    <li
      // What a link to this idea scrolls to (`?idea=`, CON-481).
      data-idea-id={idea.id}
      data-open={expanded || undefined}
      onClick={(event) => {
        if (opensCard(event)) onToggle()
      }}
      className={cn(
        CARD_GRID,
        showCampaign && CARD_GRID_WIDE,
        'group cursor-pointer py-4',
        selected ? CARD_SELECTED : CARD,
        expanded && !selected && 'bg-secondary',
      )}
    >
      <span className="flex h-5 items-center">
        {selection && (
          <Checkbox
            checked={selected}
            onClick={(event) => {
              // The press is the toggle, so Shift can extend a range.
              event.preventDefault()
              selection.onToggle(event.shiftKey)
            }}
            onKeyDown={(event) => {
              if (event.key !== ' ') return
              event.preventDefault()
              selection.onToggle(event.shiftKey)
            }}
            aria-label={t('ideas.bulk.select', { title: idea.title })}
            className={cn(
              'transition-opacity',
              !selected &&
                !selection.selecting &&
                'opacity-40 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
            )}
          />
        )}
      </span>

      <IdeaMark idea={idea} />

      <div className="flex min-w-0 flex-col">
        {editing ? (
          <TitleField idea={idea} onEdit={onEdit} />
        ) : (
          <h3 className="text-sm/5 font-medium break-words">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className={cn(
                'cursor-pointer text-left outline-none focus-visible:underline',
                !expanded && 'line-clamp-2',
              )}
            >
              {idea.title}
            </button>
          </h3>
        )}
        {!expanded && summary && (
          <p className="mt-1 line-clamp-2 text-sm/5 text-secondary-foreground">
            {summary}
          </p>
        )}
        {!expanded && (
          <SourceLine
            idea={idea}
            now={now}
            showCampaign={showCampaign}
            compact={compactSource}
          />
        )}
      </div>

      {/* The campaign's own column on a wide list; below it, the source
          line ends with it instead. */}
      {showCampaign && (
        <span className="hidden h-5 min-w-0 items-center gap-2 text-xs/4 text-secondary-foreground @4xl:flex">
          {campaignName && idea.campaignId && (
            <>
              <CampaignIcon
                abbr={identityAbbr(campaignName)}
                color={identityColorVar(idea.campaignId)}
                className="size-4"
              />
              <span className="truncate">{campaignName}</span>
            </>
          )}
        </span>
      )}

      <span className="flex h-5 items-center justify-end gap-3">
        {/* Written from general knowledge (CON-484): beside the answer it is
            waiting on, so it is read before the verdict. */}
        <NotGroundedMark mode={idea.groundingMode} />
        <RowAnswers
          title={idea.title}
          verdict={verdict}
          now={now}
          onDecide={onDecide}
          onUndecide={onUndecide}
        />
      </span>

      {expanded &&
        (analysed ? (
          <AnalysedBody
            idea={idea}
            now={now}
            onAnswer={answer}
            onEdit={onEdit}
            showCampaign={showCampaign}
          />
        ) : (
          <WrittenBody
            idea={idea}
            now={now}
            onAnswer={answer}
            onEdit={onEdit}
            onDelete={onDelete}
            showCampaign={showCampaign}
          />
        ))}
    </li>
  )
}

/**
 * The three answers, always on the card and always in the same place: the
 * one given is pressed, and pressing it again puts the idea back on the desk.
 * Later asks how long — a postponement names the day it comes back.
 */
function RowAnswers({
  title,
  verdict,
  now,
  onDecide,
  onUndecide,
}: {
  title: string
  verdict: VerdictKey
  now: Date
  onDecide: Decide
  onUndecide: () => void
}) {
  const { t } = useTranslation()
  return (
    <span
      role="group"
      aria-label={t('ideas.card.quickAnswers', { title })}
      className="-my-0.5 flex items-center gap-0.5"
    >
      {VERDICT_ORDER.map((v) => {
        const { icon: Glyph, tone, actionKey } = VERDICTS[v]
        const on = verdict === v
        const cls = cn(
          'flex size-6 cursor-pointer items-center justify-center rounded-button outline-none focus-visible:ring-2 focus-visible:ring-ring',
          on
            ? 'bg-primary ring-1 ring-quaternary'
            : 'hover:bg-primary hover:ring-1 hover:ring-quaternary data-[state=open]:bg-primary data-[state=open]:ring-1 data-[state=open]:ring-quaternary',
        )
        const glyph = (
          <Glyph
            aria-hidden
            className={cn('size-4', on ? tone : 'text-secondary-foreground')}
            weight={on ? 'bold' : 'regular'}
          />
        )
        if (v === 'later' && !on)
          return (
            <DropdownMenu key={v}>
              <DropdownMenuTrigger aria-label={t(actionKey)} className={cls}>
                {glyph}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                {POSTPONE_HORIZONS.map((horizon) => (
                  <DropdownMenuItem
                    key={horizon}
                    onSelect={() =>
                      onDecide('later', postponeUntil(now, horizon))
                    }
                  >
                    {t(HORIZON_KEYS[horizon])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        return (
          <button
            key={v}
            type="button"
            // Pressed, it says so; pressing it again puts the idea back.
            aria-label={t(actionKey)}
            aria-pressed={on}
            onClick={() => (on ? onUndecide() : onDecide(v, null))}
            className={cls}
          >
            {glyph}
          </button>
        )
      })}
    </span>
  )
}

/**
 * An idea the assistant generated from no document (CON-484): it was
 * suggested, whoever's request it came from, and every place that names the
 * idea's writer says so alike — the card, its mark and the opened idea.
 */
function suggested(idea: Idea): boolean {
  return !isAnalysed(idea) && isNotGrounded(idea.groundingMode)
}

/** Who to name as the idea's writer. */
function writerName(t: TFunction, idea: Idea): string {
  if (suggested(idea)) return t('ideas.card.assistant')
  return idea.authorName || t('ideas.card.someone')
}

/**
 * The card's 20px mark: the fit ring, the writer's initials on their colour,
 * or the assistant's spark — one family of circles in one column.
 */
function IdeaMark({ idea }: { idea: Idea }) {
  const { t } = useTranslation()
  const circle =
    'flex size-5 shrink-0 items-center justify-center rounded-full font-medium'
  if (isAnalysed(idea)) return <FitRing score={idea.fitScore} />
  if (suggested(idea))
    return (
      <span
        role="img"
        aria-label={t('ideas.card.suggested')}
        className={cn(circle, 'bg-secondary')}
      >
        <SparkleIcon aria-hidden weight="fill" className="size-3 text-accent" />
      </span>
    )
  const who = idea.authorName || t('ideas.card.someone')
  return (
    <span
      role="img"
      aria-label={t('ideas.card.writtenBy', { name: who })}
      className={cn(circle, 'text-[9px] text-primary')}
      style={{ background: identityColorVar(idea.createdBy ?? who) }}
    >
      {identityAbbr(who)}
    </span>
  )
}

/** A source document's kind, as a mark at the size of the line it sits in. */
function KindMark({
  kind,
  size = 14,
}: {
  kind: AssetListKind | null
  size?: number
}) {
  return (
    <HugeiconsIcon
      icon={(kind && KIND_ICON[kind]) || Note01Icon}
      size={size}
      strokeWidth={1.5}
      aria-hidden
      className={cn(
        'shrink-0',
        (kind && KIND_TONE[kind]) ?? 'text-kind-neutral',
      )}
    />
  )
}

/** The asset page an idea's source opens, on the reading it came from. */
/**
 * The asset page an idea's source opens, on the reading it came from — and,
 * given a place it cites, at that place (`?at=`, `lib/assetPlace`).
 */
function sourceLink(idea: Idea, at?: string) {
  const asset = idea.sourceAsset!
  return {
    to: '/assets/$assetId' as const,
    params: { assetId: asset.id },
    search: {
      lens: asset.reading?.campaignId ?? 'workspace',
      ...(at ? { at } : {}),
    },
  }
}

/**
 * The closed card's last line: where the idea came from, then at most one
 * fact about where it stands — in that order, always. A document by its kind
 * and title, linked, with the places it cites; a person by name and day.
 * Below the wide layout, where the campaign has no column, it ends with the
 * campaign the idea is filed under.
 */
function SourceLine({
  idea,
  now,
  showCampaign,
  compact,
}: {
  idea: Idea
  now: Date
  showCampaign: boolean
  compact: boolean
}) {
  const { t, i18n } = useTranslation()
  const campaign = useCampaignName(idea.campaignId)
  const day = (iso: string) =>
    formatDate(iso, { day: 'numeric', month: 'short' }, i18n.language) ?? ''
  const bits: React.ReactNode[] = []

  if (isAnalysed(idea)) {
    if (idea.sourceAsset) {
      const { places, more } = citedPlace(idea)
      bits.push(
        <span key="source" className="flex min-w-0 items-center gap-1.5">
          {compact ? (
            <KindMark kind={idea.sourceAsset.kind} size={12} />
          ) : (
            <Link
              // At the first place it cites, which is where it begins.
              {...sourceLink(idea, ideaParts(idea)?.sources[0])}
              className="flex min-w-0 items-center gap-1.5 hover:text-foreground hover:underline"
            >
              <KindMark kind={idea.sourceAsset.kind} size={12} />
              <span className="truncate">{idea.sourceAsset.title}</span>
            </Link>
          )}
          {places.length > 0 && (
            <span className="shrink-0 tabular-nums">
              {places.join(', ')}
              {more > 0 && ` ${t('ideas.card.morePlaces', { count: more })}`}
            </span>
          )}
        </span>,
      )
    } else {
      bits.push(<span key="gone">{t('ideas.card.documentDeleted')}</span>)
    }
  } else {
    bits.push(
      <span key="who" className="truncate">
        {/* Generated with no document behind it (CON-484): the assistant
            suggested it, whoever's request it came from. */}
        {suggested(idea)
          ? t('ideas.card.byAssistant')
          : idea.authorName || t('ideas.card.someone')}
      </span>,
      <span key="when" className="shrink-0">
        {day(idea.createdAt)}
      </span>,
    )
  }

  // Where it stands, most urgent first, and only the first of them.
  const standing: React.ReactNode =
    // Why this one is back: without it a postponed idea reappearing on the
    // desk reads as the list having lost track of a decision.
    hasWokenUp(idea, now) ? (
      <span key="back" className="text-foreground">
        {t('ideas.backFrom')}
      </span>
    ) : idea.verdict === 'later' && idea.remindAt ? (
      <span key="returns">
        {t('ideas.record.returns', { at: day(idea.remindAt) })}
      </span>
    ) : idea.postCount ? (
      // What it fed (CON-470) — a fact beside the verdict, never a verdict.
      <span key="used" className="inline-flex shrink-0 items-center gap-1">
        <NotePencilIcon aria-hidden className="size-3" />
        <span className="text-foreground">
          {t('ideas.lifecycle.used', counted(idea.postCount))}
        </span>
      </span>
    ) : idea.seriesId ? (
      // The series a content plan wrote it for (CON-496).
      <SeriesMark key="series" seriesId={idea.seriesId} />
    ) : null
  if (standing) bits.push(standing)

  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs/4 text-secondary-foreground">
      {bits.map((bit, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden>·</span>}
          {bit}
        </span>
      ))}
      {showCampaign && campaign && (
        // Only below the wide layout, where the campaign has no column.
        <span className="contents @4xl:hidden">
          <span aria-hidden>·</span>
          <span className="truncate">{campaign}</span>
        </span>
      )}
    </div>
  )
}

function useCampaignName(campaignId: string | null): string | null {
  const { t } = useTranslation()
  const { data: campaigns } = useCampaigns()
  if (!campaignId) return null
  const campaign = campaigns?.find((c) => c.id === campaignId)
  return campaign?.name.trim() || t('nav.untitledCampaign')
}

/**
 * Which reading the score is for. An idea keeps the score it was given when
 * it is filed into another campaign, and says so rather than passing it off
 * as that campaign's.
 */
function scoredFor(
  t: TFunction,
  idea: Idea,
  campaignName: (id: string) => string | null,
): string | null {
  const breakdown = idea.fitBreakdown
  if (!breakdown) return null
  if (breakdown.lens === 'workspace')
    return t('assetInsights.ideaFit.forWorkspace')
  const reading = idea.sourceAsset?.reading
  const name =
    breakdown.campaign_id && reading?.campaignId === breakdown.campaign_id
      ? reading.campaignName
      : breakdown.campaign_id
        ? campaignName(breakdown.campaign_id)
        : null
  return name
    ? t('assetInsights.ideaFit.forCampaign', { campaign: name })
    : t('assetInsights.ideaFit.scoredOther')
}

/** The opened analysed idea: its parts, its score, its source, the answer. */
function AnalysedBody({
  idea,
  now,
  onAnswer,
  onEdit,
  showCampaign,
}: {
  idea: Idea
  now: Date
  onAnswer: Answer
  onEdit: (change: IdeaEdit) => void
  showCampaign: boolean
}) {
  const { t } = useTranslation()
  const { data: campaigns } = useCampaigns()
  const parts = ideaParts(idea)
  const nameOf = (id: string) =>
    campaigns?.find((c) => c.id === id)?.name.trim() || null

  return (
    // In the title's column, to the row's end.
    <div
      data-card-body
      className="col-start-3 col-end-[-1] mt-3 flex cursor-auto flex-col gap-3"
    >
      {parts?.angle && (
        <p className="text-sm/5 text-foreground">{parts.angle}</p>
      )}
      {parts?.rationale && (
        <p className="whitespace-pre-line text-sm/5 text-secondary-foreground">
          {parts.rationale}
        </p>
      )}
      <FitSection idea={idea} scoredFor={scoredFor(t, idea, nameOf)} />
      <SourceSection idea={idea} sources={parts?.sources ?? []} />
      <MadeInto idea={idea} />
      {showCampaign && <FiledUnder idea={idea} onEdit={onEdit} />}
      <BodyFoot
        record={<AnswerRecord idea={idea} now={now} onAnswer={onAnswer} />}
        trailing={
          idea.sourceAsset && (
            <Link
              {...sourceLink(idea)}
              className="font-medium text-accent hover:underline"
            >
              {t('ideas.card.openSource')}
            </Link>
          )
        }
      />
    </div>
  )
}

/**
 * The opened card's last line: when its answer was given and the way back,
 * then the way on. The answers themselves are on the card, always.
 */
function BodyFoot({
  record,
  trailing,
}: {
  record: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-quaternary pt-3 text-xs/4 text-secondary-foreground">
      {record}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </div>
  )
}

/**
 * Where the analysed idea came from: the document, what it is and which
 * reading wrote the idea, then the places it cites as chips.
 */
function SourceSection({ idea, sources }: { idea: Idea; sources: string[] }) {
  const { t } = useTranslation()
  const asset = idea.sourceAsset
  if (!asset)
    return (
      <Part heading={t('ideas.card.source.heading')}>
        <p className="text-sm text-secondary-foreground">
          {t('ideas.card.documentDeleted')}
        </p>
      </Part>
    )
  const facts = sourceFacts(t, asset, { reading: true })

  return (
    <Part heading={t('ideas.card.source.heading')}>
      <Link
        {...sourceLink(idea)}
        className="flex min-w-0 items-center gap-2 text-sm text-foreground hover:underline"
      >
        <KindMark kind={asset.kind} size={18} />
        <span className="truncate">{asset.title}</span>
      </Link>
      <p className="text-xs text-secondary-foreground">{facts}</p>
      {sources.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            // Each chip opens the document at that place; there is no player
            // or sheet on this page for it to drive in place.
            <Link
              key={s}
              {...sourceLink(idea, s)}
              className="rounded-full outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <SourceChip label={s} interactive={false} />
            </Link>
          ))}
        </span>
      )}
    </Part>
  )
}

/**
 * The posts made from the idea (CON-470): each with its platform, status and
 * date, opening the post. Read only when the row says there are some, so an
 * idea nobody used asks for nothing.
 */
function MadeInto({ idea }: { idea: Idea }) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const used = (idea.postCount ?? 0) > 0
  const posts = useIdeaPostRefs(idea.id, used)
  if (!used) return null
  return (
    <Part heading={t('ideas.lifecycle.madeInto.heading')}>
      {posts.isError ? (
        <p className="text-sm text-secondary-foreground">
          {t('ideas.lifecycle.madeInto.failed')}
        </p>
      ) : posts.isPending ? (
        <p className="text-sm text-tertiary-foreground">
          {t('ideas.lifecycle.madeInto.loading')}
        </p>
      ) : (posts.data ?? []).length === 0 ? (
        // The count said posts, but none came back: deleted since.
        <p className="text-sm text-tertiary-foreground">
          {t('ideas.lifecycle.madeInto.empty')}
        </p>
      ) : (
        // Two lines a row, hairlines between, the whole row opening the post
        // (CON-485): the title, then "Platform · Type · Status"; its day and
        // time on the right.
        <ul className="flex flex-col border-t border-border">
          {(posts.data ?? []).map((post) => {
            const platform = resolve(post.platform_id)
            const type = post.platform_post_type
              ? (platform?.postTypes?.find(
                  (pt) => pt.slug === post.platform_post_type,
                )?.label ?? post.platform_post_type)
              : undefined
            return (
              <li key={post.id} className="border-b border-border">
                <Link
                  to="/campaigns/$campaignId/posts/$postId"
                  params={{ campaignId: post.campaign_id, postId: post.id }}
                  className="flex min-w-0 items-baseline gap-3 py-2 hover:bg-secondary"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm text-foreground">
                      {post.title || t('ideas.lifecycle.madeInto.untitled')}
                    </span>
                    <span className="text-xs text-secondary-foreground">
                      {[platform?.name, type, postStatusLabel(t, post.status)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-secondary-foreground tabular-nums">
                    {post.scheduled_at
                      ? formatDate(
                          post.scheduled_at,
                          {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                          i18n.language,
                        )
                      : t('ideas.lifecycle.madeInto.notScheduled')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Part>
  )
}

/** The opened written idea: its note, who wrote it, where it is filed, the answer. */
function WrittenBody({
  idea,
  now,
  onAnswer,
  onEdit,
  onDelete,
  showCampaign,
}: {
  idea: Idea
  now: Date
  onAnswer: Answer
  onEdit: (change: IdeaEdit) => void
  onDelete: () => void
  showCampaign: boolean
}) {
  const { t } = useTranslation()
  const when = useDateTimeLabel()

  return (
    <div
      data-card-body
      className="col-start-3 col-end-[-1] mt-3 flex cursor-auto flex-col gap-3"
    >
      <NoteField idea={idea} onEdit={onEdit} />
      {/* No rule above: the note field's own underline is the line. */}
      <div className="flex flex-col gap-1 text-xs/4 text-secondary-foreground">
        <p>
          {suggested(idea)
            ? t('ideas.card.suggestedAt', { at: when(idea.createdAt) })
            : t('ideas.card.writtenByAt', {
                name: writerName(t, idea),
                at: when(idea.createdAt),
              })}
        </p>
        <p>{t('ideas.card.unscored')}</p>
      </div>
      <MadeInto idea={idea} />
      {showCampaign && <FiledUnder idea={idea} onEdit={onEdit} />}
      <BodyFoot
        record={
          <>
            <AnswerRecord idea={idea} now={now} onAnswer={onAnswer} />
            <span>{t('ideas.card.savedOnBlur')}</span>
          </>
        }
        trailing={
          // The only irreversible thing on the card, and it asks first.
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer font-medium text-destructive hover:underline"
          >
            {t('ideas.action.delete')}
          </button>
        }
      />
    </div>
  )
}

/**
 * Which campaign an idea is filed under, and the way to change it — for
 * either kind: filing is not an edit of the words.
 */
function FiledUnder({
  idea,
  onEdit,
}: {
  idea: Idea
  onEdit: (change: IdeaEdit) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 text-xs/4 text-secondary-foreground">
      <span>{t('ideas.card.filedUnder')}</span>
      <CampaignPicker
        value={idea.campaignId}
        onChange={(campaignId) => onEdit({ campaign_id: campaignId })}
      />
    </div>
  )
}

/**
 * The sentence itself, editable in the slot it was being read in.
 *
 * Both fields here follow the same rule: local state, saved on blur. A
 * controlled field writing through on every keystroke would put a request
 * behind each letter, and the optimistic cache would then re-render the row
 * under the cursor while it was being typed in.
 *
 * Seeded once, on the mount the expansion causes, and deliberately not
 * re-synced afterwards. The only thing that could change it under an open row
 * is somebody else's edit arriving on a refetch, and replacing what is in front
 * of you with it — mid-sentence, with no warning and no way back — is worse
 * than letting this session finish on the version it started from. Closing and
 * reopening shows theirs.
 */
function TitleField({
  idea,
  onEdit,
}: {
  idea: Idea
  onEdit: (change: IdeaEdit) => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(idea.title)

  return (
    <Input
      value={title}
      autoFocus
      // The field's own padding hangs out to the left, so the words stay in
      // the title column they were read in.
      className="-my-1 -ml-3 h-8 w-[calc(100%+0.75rem)] pl-3 min-w-0 font-medium"
      aria-label={t('ideas.field.title')}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={() => {
        const trimmed = title.trim()
        // An empty title would leave a row nothing can identify. Reverting is
        // better than refusing: there is no error worth showing on a field
        // somebody has already tabbed away from.
        if (!trimmed) return setTitle(idea.title)
        if (trimmed !== idea.title) onEdit({ title: trimmed })
      }}
    />
  )
}

/** The rest of it — mounted, and seeded, with the expansion. */
function NoteField({
  idea,
  onEdit,
}: {
  idea: Idea
  onEdit: (change: IdeaEdit) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(idea.note)

  return (
    <Textarea
      value={note}
      className="-ml-3 min-h-16 w-[calc(100%+0.75rem)] pl-3"
      aria-label={t('ideas.field.note')}
      placeholder={t('ideas.field.notePlaceholder')}
      onChange={(event) => setNote(event.target.value)}
      onBlur={() => {
        if (note.trim() !== idea.note) onEdit({ note: note.trim() })
      }}
    />
  )
}

/**
 * Which campaign an idea belongs to, changed after the fact.
 *
 * This is what a *yes* leads to while there is no promotion step: an accepted
 * idea moved onto a campaign is on that campaign's list, in front of the people
 * writing its posts. Naming a campaign is not a verdict and does not touch one
 * — an idea can be filed under a campaign and still be waiting, which is
 * exactly the state a campaign's own backlog is made of.
 */
function CampaignPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (campaignId: string | null) => void
}) {
  const { t } = useTranslation()
  const { data: campaigns } = useCampaigns()
  const current = campaigns?.find((c) => c.id === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2">
          <span className="max-w-48 truncate text-foreground">
            {current?.name.trim() || t('ideas.field.noCampaign')}
          </span>
          <span className="text-accent">{t('ideas.card.change')}</span>
          <CaretDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuItem onSelect={() => onChange(null)}>
          {t('ideas.field.noCampaign')}
        </DropdownMenuItem>
        {(campaigns ?? []).map((campaign) => (
          <DropdownMenuItem
            key={campaign.id}
            onSelect={() => onChange(campaign.id)}
          >
            {campaign.name.trim() || t('nav.untitledCampaign')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
