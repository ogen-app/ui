import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CaretUpIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useDateTimeLabel } from '@/hooks/useActivityLabels'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { hasWokenUp, type Idea } from '@/lib/ideas'
import type { IdeaEdit } from '@/services/api/ideas'
import { VerdictControls, type Decide } from './VerdictControls'
import { VERDICTS } from './verdicts'
import { cn } from '@/lib'

/**
 * One idea, as a line you can answer without opening.
 *
 * **The row is the whole of triage.** Everything needed to decide is on it —
 * the sentence, and the three answers — and everything else is behind the
 * click that opens it. That split is the same one `TasksBoard` makes and for
 * the same reason: a list whose rows are two lines tall is a page you scroll
 * rather than a list you scan. It is also why this module has no separate
 * answering mode: there is nothing a mode could put on screen that this line
 * does not already carry.
 *
 * **A decided row keeps its verdict visible and its undo beside it.** Saying
 * no has to be cheap, and it is only cheap if taking it back is obvious;
 * hiding the reversal behind an expand would make the archive feel like a
 * place things go rather than a pile you can rummage in.
 *
 * Opening one edits it in place. The title and the note save on blur rather
 * than behind a SAVE button — this is a sentence somebody is fixing a typo in,
 * not a document — and the verdict is never among the fields, because a
 * decision is not an edit. Its endpoint is separate for exactly that reason.
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
}: {
  idea: Idea
  now: Date
  expanded: boolean
  onToggle: () => void
  onDecide: Decide
  onUndecide: () => void
  onEdit: (change: IdeaEdit) => void
  onDelete: () => void
  showCampaign?: boolean
}) {
  const { t } = useTranslation()
  const { data: campaigns } = useCampaigns()
  const when = useDateTimeLabel()

  const woken = hasWokenUp(idea, now)
  // A woken idea is stored as `later` and read as a question — the row follows
  // the reading, or the one idea that most needs answering would be drawn as
  // already answered.
  const decided = idea.verdict !== null && !woken
  const verdict = decided && idea.verdict ? VERDICTS[idea.verdict] : null

  const campaign = campaigns?.find((c) => c.id === idea.campaignId)
  const campaignName = idea.campaignId
    ? campaign?.name.trim() || t('nav.untitledCampaign')
    : null

  const record = [
    t('ideas.record.captured', { at: when(idea.createdAt) }),
    verdict && idea.decidedAt
      ? t('ideas.record.decided', {
          verdict: t(verdict.labelKey),
          at: when(idea.decidedAt),
        })
      : null,
    idea.verdict === 'later' && idea.remindAt && !woken
      ? t('ideas.record.returns', { at: when(idea.remindAt) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="w-full rounded-md bg-primary px-4 py-3 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        {verdict && (
          // The answer, at the head of the row where the tick is on a task —
          // the column that says what state this line is in.
          <span
            className="flex w-4 shrink-0 items-center justify-center"
            title={t(verdict.labelKey)}
          >
            <verdict.icon
              className={cn('size-4', verdict.tone)}
              weight="bold"
            />
          </span>
        )}

        {/* The title occupies one slot whether it is being read or edited —
            the row never shows it twice. An open row that repeated its own
            heading above the field editing it would look as though opening had
            done nothing, which is the same argument that takes the note preview
            off the line below. */}
        {expanded ? (
          <TitleField idea={idea} onEdit={onEdit} />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={false}
            className="flex min-w-0 flex-1 items-baseline gap-2 text-left cursor-pointer"
          >
            <span
              className={cn(
                'min-w-0 truncate text-sm',
                decided
                  ? 'text-tertiary-foreground'
                  : 'text-primary-foreground',
              )}
            >
              {idea.title}
            </span>
            {idea.note && (
              <span className="min-w-24 flex-1 truncate text-sm text-quaternary-foreground">
                {idea.note}
              </span>
            )}
            {woken && (
              // Why this one is back. Without it a postponed idea reappearing
              // in the inbox reads as the list having lost track of a decision.
              <span className="shrink-0 text-xs text-tertiary-foreground">
                {t('ideas.backFrom')}
              </span>
            )}
          </button>
        )}

        {/* Closing is a control of its own once the title has become a field:
            the row's own text is no longer something you can click without
            putting a cursor in it. */}
        {expanded && (
          <Button
            variant="ghost"
            size="smIcon"
            aria-expanded
            aria-label={t('ideas.action.close')}
            onClick={onToggle}
          >
            <CaretUpIcon className="size-4 text-tertiary-foreground" />
          </Button>
        )}

        {showCampaign && idea.campaignId && campaignName && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-tertiary-foreground">
            <CampaignIcon
              abbr={identityAbbr(campaignName)}
              color={identityColorVar(idea.campaignId)}
              className="size-5"
            />
            <span className="hidden sm:inline max-w-32 truncate">
              {campaignName}
            </span>
          </span>
        )}

        {decided ? (
          <Button
            variant="ghost"
            size="smIcon"
            aria-label={t('ideas.action.undecide')}
            onClick={onUndecide}
          >
            <ArrowCounterClockwiseIcon className="size-4 text-tertiary-foreground" />
          </Button>
        ) : (
          <VerdictControls onDecide={onDecide} now={now} />
        )}
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'flex flex-col gap-3 pt-3',
              // The panel starts in the title's column, not the row's — the
              // 16px verdict slot plus the 12px gap, when there is one.
              verdict && 'pl-7',
            )}
          >
            {expanded && <NoteField idea={idea} onEdit={onEdit} />}

            <div className="flex flex-col gap-2 border-t border-quaternary pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-[13px] leading-5 text-tertiary-foreground">
                {record}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {showCampaign && (
                  <CampaignPicker
                    value={idea.campaignId}
                    onChange={(campaignId) =>
                      onEdit({ campaign_id: campaignId })
                    }
                  />
                )}
                {/* The only irreversible thing in the module, and the reason it
                    is here rather than on the row: a verdict is an answer and
                    this is a deletion, and the two must not sit a pixel apart
                    on a line somebody is scanning past. Opening the idea is
                    the confirmation step. */}
                <Button
                  variant="ghost"
                  size="smIcon"
                  className="-mr-1"
                  aria-label={t('ideas.action.delete')}
                  onClick={onDelete}
                >
                  <TrashIcon className="size-4 text-tertiary-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
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
      className="min-w-0 flex-1"
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
      className="min-h-16"
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
        <Button variant="ghost" size="sm">
          <span className="max-w-40 truncate">
            {current?.name.trim() || t('ideas.field.noCampaign')}
          </span>
          <CaretDownIcon className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
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
