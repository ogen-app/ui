import { useState } from 'react'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FitTrack } from '@/components/content/FitTrack'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { SourceChip } from '@/components/content/asset-page/SourceChip'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useDateTimeLabel } from '@/hooks/useActivityLabels'
import { cn } from '@/lib'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { hasWokenUp, type Idea } from '@/lib/ideas'
import { citedPlace, ideaParts, isAnalysed } from '@/lib/ideaSource'
import { formatDate } from '@/lib/intl'
import type { IdeaEdit } from '@/services/api/ideas'
import type { AssetListKind } from '@/types/assetList'
import {
  AnswerGroup,
  AnswerRecord,
  FitSection,
  Part,
  VerdictMark,
  type Answer,
} from './card/IdeaCardParts'
import { IDEA_ROW, pileOf } from './card/ideaRow'
import { sourceFacts } from './card/sourceFacts'
import { VerdictControls, type Decide } from './VerdictControls'

/**
 * One idea on the Ideas page, as the CON-387 card (CON-388): the same row the
 * asset page and the Assets list draw, so an idea looks the same wherever it
 * is met.
 *
 * **The slot at the head of the row says where it came from.** An analysed
 * idea has its fit score on a track; a written one has its writer — initials
 * in their colour and the word *Written*. No badge and no third colour: the
 * column that ranks the list also tells its two kinds apart. The line under
 * the note names the source the same way — the document and the place it
 * cites, or who wrote it and when.
 *
 * **The row is still the whole of triage.** Hovered or focused, the verdict
 * mark gives way to the three answers, so the forty-seventh idea of two
 * hundred is answered without opening. Opening it shows everything that
 * informs the answer and ends in the full answer group.
 *
 * **Only a written idea is edited.** An analysed idea's words are the
 * analysis's and its score was given to them, so the server refuses a changed
 * title or note on one (409 `idea_read_only`); this row offers no field that
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
  /**
   * The row's box, when the list can select (CON-388 §6). Its column is
   * reserved whether or not the box shows, so nothing shifts when it does.
   */
  selection?: { selected: boolean; selecting: boolean; onToggle: () => void }
}) {
  const { t } = useTranslation()
  const analysed = isAnalysed(idea)
  const parts = ideaParts(idea)
  const answer: Answer = (verdict, remindAt = null) =>
    verdict === null ? onUndecide() : onDecide(verdict, remindAt)
  const editing = expanded && !analysed
  // An analysed idea's note is its parts; the angle is the line worth reading.
  const summary = parts ? parts.angle || parts.rationale : idea.note
  const Caret = expanded ? CaretDownIcon : CaretRightIcon

  const head = (
    <>
      <span className="flex h-6 items-center">
        {analysed ? (
          <FitTrack score={idea.fitScore} />
        ) : (
          <AuthorSlot name={idea.authorName ?? null} id={idea.createdBy} />
        )}
      </span>
      {editing ? (
        <TitleField idea={idea} onEdit={onEdit} />
      ) : (
        <span
          className={cn(
            'text-sm/6 text-foreground',
            expanded && 'font-semibold',
          )}
        >
          {idea.title}
        </span>
      )}
      <VerdictMark verdict={pileOf(idea, now)} />
    </>
  )

  return (
    <li
      data-open={expanded || undefined}
      className={cn(
        IDEA_ROW,
        'group',
        selection && 'pl-9',
        selection?.selected && 'bg-accent/5 before:opacity-0',
      )}
    >
      {selection && (
        // Under the filter bar's select-all: the list hangs 12px out, so the
        // box sits 24px into the row.
        <Checkbox
          checked={selection.selected}
          onCheckedChange={selection.onToggle}
          aria-label={t('ideas.bulk.select', { title: idea.title })}
          className={cn(
            'absolute top-[18px] left-6',
            !selection.selected &&
              !selection.selecting &&
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
        />
      )}
      {editing ? (
        // The title is a field now, so the head is no longer one button: the
        // caret becomes the control that closes it.
        <div className="grid grid-cols-[4rem_minmax(0,1fr)_16px_16px] items-start gap-x-3 px-3 py-3.5">
          {head}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded
            aria-label={t('ideas.action.close')}
            className="mt-1 cursor-pointer"
          >
            <CaretUpIcon className="size-4 text-secondary-foreground" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="grid w-full cursor-pointer grid-cols-[4rem_minmax(0,1fr)_16px_16px] gap-x-3 px-3 py-3.5 text-left"
        >
          {head}
          <Caret className="mt-1 size-4 shrink-0 text-secondary-foreground" />
          {summary && !expanded && (
            <span className="col-span-2 col-start-2 mt-0.5 line-clamp-2 text-[13px]/[19px] text-secondary-foreground">
              {summary}
            </span>
          )}
        </button>
      )}

      {!expanded && (
        <>
          <SourceLine
            idea={idea}
            now={now}
            showCampaign={showCampaign}
            compact={compactSource}
          />
          <QuickAnswers title={idea.title} now={now} onDecide={onDecide} />
        </>
      )}

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
 * A written idea's slot: its writer's initials in their identity colour, and
 * *Written* beside them. Named for a screen reader, as the fit track is.
 */
function AuthorSlot({ name, id }: { name: string | null; id: string | null }) {
  const { t } = useTranslation()
  const who = name || t('ideas.card.someone')
  return (
    <span
      role="img"
      aria-label={t('ideas.card.writtenBy', { name: who })}
      className="flex w-16 shrink-0 items-center gap-1.5"
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-primary"
        style={{ background: identityColorVar(id ?? who) }}
      >
        {identityAbbr(who)}
      </span>
      <span aria-hidden className="text-[11px] text-secondary-foreground">
        {t('ideas.card.written')}
      </span>
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
function sourceLink(idea: Idea) {
  const asset = idea.sourceAsset!
  return {
    to: '/assets/$assetId' as const,
    params: { assetId: asset.id },
    search: { lens: asset.reading?.campaignId ?? 'workspace' },
  }
}

/**
 * The closed row's last line: where the idea came from. A document by its
 * kind and title, linked, with the places it cites; a person by name and day.
 * The workspace's list ends it with the campaign the idea is filed under.
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
  const bits: React.ReactNode[] = []

  if (isAnalysed(idea)) {
    if (idea.sourceAsset) {
      const { places, more } = citedPlace(idea)
      if (!compact)
        bits.push(
          <Link
            key="source"
            {...sourceLink(idea)}
            className="inline-flex min-w-0 items-center gap-1.5 text-foreground hover:underline"
          >
            <KindMark kind={idea.sourceAsset.kind} />
            <span className="truncate">{idea.sourceAsset.title}</span>
          </Link>,
        )
      if (places.length > 0)
        bits.push(
          <span key="places" className="shrink-0 tabular-nums">
            {places.join(', ')}
            {more > 0 && ` ${t('ideas.card.morePlaces', { count: more })}`}
          </span>,
        )
    } else {
      bits.push(<span key="gone">{t('ideas.card.documentDeleted')}</span>)
    }
  } else {
    bits.push(
      <span key="who" className="truncate">
        {idea.authorName || t('ideas.card.someone')}
      </span>,
      <span key="when" className="shrink-0">
        {formatDate(
          idea.createdAt,
          { day: 'numeric', month: 'short' },
          i18n.language,
        ) ?? ''}
      </span>,
    )
  }
  if (showCampaign && campaign)
    bits.push(
      <span key="campaign" className="truncate">
        {campaign}
      </span>,
    )
  if (hasWokenUp(idea, now))
    // Why this one is back. Without it a postponed idea reappearing with the
    // undecided reads as the list having lost track of a decision.
    bits.push(<span key="back">{t('ideas.backFrom')}</span>)

  return (
    <div className="-mt-2 flex min-w-0 items-center gap-1.5 pr-3 pb-3.5 pl-[88px] text-xs text-secondary-foreground">
      {bits.map((bit, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden>·</span>}
          {bit}
        </span>
      ))}
    </div>
  )
}

/**
 * The three answers, over the verdict mark while the row is hovered or has
 * focus — so a row is answered without being opened, and reached by keyboard
 * the same way.
 */
function QuickAnswers({
  title,
  now,
  onDecide,
}: {
  title: string
  now: Date
  onDecide: Decide
}) {
  const { t } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('ideas.card.quickAnswers', { title })}
      className="absolute top-2 right-[26px] flex rounded-md bg-secondary pl-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100"
    >
      <VerdictControls onDecide={onDecide} now={now} />
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
    // In the title's column: the row's padding, the slot and its gap.
    <div className="flex flex-col gap-3 pr-3 pb-4 pl-[88px]">
      {parts?.angle && (
        <p className="text-sm leading-6 text-foreground">{parts.angle}</p>
      )}
      {parts?.rationale && (
        <p className="whitespace-pre-line text-sm leading-6 text-secondary-foreground">
          {parts.rationale}
        </p>
      )}
      <FitSection idea={idea} scoredFor={scoredFor(t, idea, nameOf)} />
      <SourceSection idea={idea} sources={parts?.sources ?? []} />
      {showCampaign && <FiledUnder idea={idea} onEdit={onEdit} />}
      <AnswerGroup
        idea={idea}
        now={now}
        onAnswer={onAnswer}
        trailing={
          idea.sourceAsset && (
            <Link
              {...sourceLink(idea)}
              className="text-sm font-medium text-accent hover:underline"
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
            <SourceChip key={s} label={s} citedBy={idea.title} />
          ))}
        </span>
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
    <div className="flex flex-col gap-3 pr-3 pb-4 pl-[88px]">
      <NoteField idea={idea} onEdit={onEdit} />
      {/* No rule above: the note field's own underline is the line. */}
      <div className="flex flex-col gap-1 text-xs text-secondary-foreground">
        <p>
          {t('ideas.card.writtenByAt', {
            name: idea.authorName || t('ideas.card.someone'),
            at: when(idea.createdAt),
          })}
        </p>
        <p>{t('ideas.card.unscored')}</p>
      </div>
      {showCampaign && <FiledUnder idea={idea} onEdit={onEdit} />}
      <AnswerGroup
        idea={idea}
        now={now}
        onAnswer={onAnswer}
        record={
          <div className="flex flex-col gap-1">
            <AnswerRecord idea={idea} now={now} onAnswer={onAnswer} />
            <p>
              {t('ideas.card.savedOnBlur')}
              {' · '}
              {/* The only irreversible thing on the card, and it asks first. */}
              <button
                type="button"
                onClick={onDelete}
                className="cursor-pointer font-medium text-destructive hover:underline"
              >
                {t('ideas.action.delete')}
              </button>
            </p>
          </div>
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
    <div className="flex items-center gap-2 text-xs text-secondary-foreground">
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
      className="-my-1 -ml-3 h-8 w-[calc(100%+0.75rem)] pl-3 min-w-0 font-semibold"
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
