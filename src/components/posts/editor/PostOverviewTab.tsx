import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BooksIcon } from '@phosphor-icons/react'
import { isNotGrounded } from '@/lib/grounding'
import type { PostTab } from '@/lib/postTabs'
import type { PostCheck } from '@/lib/postValidation'
import type { PostNote } from '@/services/api/postNotes'
import type { PostEvaluation } from '@/types/quality'
import { cn } from '@/lib'
import { SummaryLine } from '../quickBar/parts'
import { PostHealthSummary } from './PostChecksTab'
import { PublishingSettings, WritingSettings } from './PostSettings'

/** How many notes the Overview quotes before pointing at the Notes tab. */
const NOTES_SHOWN = 2

type Props = Parameters<typeof PublishingSettings>[0] & {
  checks: PostCheck[]
  assessment: PostEvaluation | null | undefined
  qualityUnavailable: boolean
  assessing: boolean
  exhausted?: boolean
  onAssess: () => void
  notes: PostNote[]
  /** Opens one of the other tabs — every section here is a way into one. */
  onOpenTab: (tab: PostTab) => void
}

/**
 * The tab a post opens on: everything about it that needs an answer, on one
 * side, without opening anything.
 *
 * The other tabs were findable but not found. Nobody opens a tab called
 * Quality to learn whether they should care about quality, and a note the
 * team left is only read by someone who already knew it was there. So the
 * answers come to this tab instead, each cut to what says whether to look
 * further, each a way into the tab with the rest:
 *
 *   - **Publishing** — where, when and how. The fields that can stop it going
 *     out, which is why this tab carries the warning mark and why a blocked
 *     SCHEDULE flashes this list.
 *   - **Health** — the requirements' verdict and the score (`PostHealthSummary`).
 *   - **Notes** — the first few, quoted; left out while there are none.
 *   - **Sources** — how many, or that it is written from general knowledge.
 *   - **Writing** — phase, voice, audience, format: set once, if at all, so last.
 */
export function PostOverviewTab({
  checks,
  assessment,
  qualityUnavailable,
  assessing,
  exhausted,
  onAssess,
  notes,
  onOpenTab,
  ...publishing
}: Props) {
  const { t } = useTranslation()
  const { doc, changeDoc } = publishing

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col px-3 pb-6 lg:px-6">
        <Section title={t('posts.editor.overview.publishing')} first>
          <PublishingSettings {...publishing} />
        </Section>

        <Section title={t('posts.editor.overview.health')}>
          <PostHealthSummary
            checks={checks}
            status={doc.status}
            assessment={assessment}
            qualityUnavailable={qualityUnavailable}
            assessing={assessing}
            exhausted={exhausted}
            onAssess={onAssess}
            onOpenChecks={() => onOpenTab('checks')}
            onOpenQuality={() => onOpenTab('quality')}
          />
        </Section>

        {notes.length > 0 && (
          <Section
            title={t('posts.editor.overview.notes', { count: notes.length })}
          >
            <NotesSummary notes={notes} onOpen={() => onOpenTab('notes')} />
          </Section>
        )}

        <Section title={t('posts.editor.overview.sources')}>
          <SummaryLine
            onOpen={() => onOpenTab('sources')}
            label={t('posts.editor.tabs.sources')}
          >
            <BooksIcon className="size-4 shrink-0 text-tertiary-foreground" />
            <span className="min-w-0 truncate text-sm">
              {isNotGrounded(doc.grounding_mode)
                ? t('posts.editor.overview.notGrounded')
                : doc.used_asset_ids.length > 0
                  ? t('posts.editor.overview.sourceCount', {
                      count: doc.used_asset_ids.length,
                    })
                  : t('posts.editor.overview.noSources')}
            </span>
          </SummaryLine>
        </Section>

        <Section title={t('posts.editor.overview.writing')}>
          <WritingSettings doc={doc} changeDoc={changeDoc} />
        </Section>
      </div>
    </div>
  )
}

/**
 * The first notes, quoted: the server puts the draft thesis first, which is
 * the one most worth reading before writing. The whole block opens the Notes
 * tab, where they are edited.
 */
function NotesSummary({
  notes,
  onOpen,
}: {
  notes: PostNote[]
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const more = notes.length - NOTES_SHOWN
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t('posts.editor.overview.open', {
        tab: t('posts.editor.tabs.notes'),
      })}
      className="-mx-1.5 flex flex-col gap-2 rounded-button px-1.5 py-1 text-left text-sm outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {notes.slice(0, NOTES_SHOWN).map((note) => (
        <span key={note.id} className="flex min-w-0 flex-col">
          {note.title && (
            <span className="truncate font-medium text-foreground">
              {note.title}
            </span>
          )}
          <span className="line-clamp-2 text-secondary-foreground">
            {note.body}
          </span>
        </span>
      ))}
      {more > 0 && (
        <span className="text-tertiary-foreground">
          {t('posts.editor.overview.moreNotes', { count: more })}
        </span>
      )}
    </button>
  )
}

function Section({
  title,
  first,
  children,
}: {
  title: string
  /** No rule above the first section — the tab strip is already there. */
  first?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3',
        first ? 'pt-4' : 'mt-5 border-t border-border pt-5',
      )}
    >
      <h3 className="font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}
