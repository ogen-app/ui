import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BooksIcon } from '@phosphor-icons/react'
import { isNotGrounded } from '@/lib/grounding'
import type { PostTab } from '@/lib/postTabs'
import type { PostCheck } from '@/lib/postValidation'
import type { PostNote } from '@/services/api/postNotes'
import type { PostEvaluation } from '@/types/quality'
import { cn } from '@/lib'
import { SettingList, SettingRow, SummaryLine } from '../quickBar/parts'
import { PostChecksSummary, PostQualitySummary } from './PostChecksTab'
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
 * further, each a way into the tab with the rest. Every section is the same
 * two columns (`SettingList`), so the values read straight down the tab:
 *
 *   - **Publishing** — where, when and how. The fields that can stop it going
 *     out, which is why this tab carries the warning mark and why a blocked
 *     SCHEDULE flashes this list.
 *   - **Health** — the requirements' verdict and the first few that fail.
 *   - **Quality** — the score and its suggestions, or the offer to take one.
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

        {doc.status !== 'published' && (
          <Section title={t('posts.editor.overview.health')}>
            <SettingList>
              <PostChecksSummary
                checks={checks}
                onOpen={() => onOpenTab('checks')}
              />
            </SettingList>
          </Section>
        )}

        {!qualityUnavailable && (
          <Section title={t('posts.editor.overview.quality')}>
            <SettingList>
              <PostQualitySummary
                status={doc.status}
                assessment={assessment}
                assessing={assessing}
                exhausted={exhausted}
                onAssess={onAssess}
                onOpen={() => onOpenTab('quality')}
              />
            </SettingList>
          </Section>
        )}

        {notes.length > 0 && (
          <Section title={t('posts.editor.overview.notes')}>
            <NotesSummary notes={notes} onOpen={() => onOpenTab('notes')} />
          </Section>
        )}

        <Section title={t('posts.editor.overview.sources')}>
          <SettingList>
            <SettingRow label={t('posts.editor.overview.attached')}>
              <SummaryLine
                onOpen={() => onOpenTab('sources')}
                label={t('posts.editor.tabs.sources')}
              >
                <BooksIcon className="size-4 shrink-0 text-tertiary-foreground" />
                <span className="min-w-0 truncate">
                  {isNotGrounded(doc.grounding_mode)
                    ? t('posts.editor.overview.notGrounded')
                    : doc.used_asset_ids.length > 0
                      ? t('posts.editor.overview.sourceCount', {
                          count: doc.used_asset_ids.length,
                        })
                      : t('posts.editor.overview.noSources')}
                </span>
              </SummaryLine>
            </SettingRow>
          </SettingList>
        </Section>

        <Section title={t('posts.editor.overview.writing')}>
          <WritingSettings doc={doc} changeDoc={changeDoc} />
        </Section>
      </div>
    </div>
  )
}

/**
 * The first notes, a row each: the note's title where the label goes, its
 * text where the value goes. The server puts the draft thesis first, which is
 * the one most worth reading before writing. Each opens the Notes tab, where
 * they are edited.
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
  const open = t('posts.editor.overview.open', {
    tab: t('posts.editor.tabs.notes'),
  })
  return (
    <SettingList>
      {notes.slice(0, NOTES_SHOWN).map((note) => (
        <SettingRow
          key={note.id}
          label={note.title || t('posts.editor.overview.note')}
        >
          <button
            type="button"
            onClick={onOpen}
            title={open}
            className="-mx-1.5 flex min-w-0 flex-1 rounded-button px-1.5 py-0.5 text-left outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <span className="line-clamp-2 text-secondary-foreground">
              {note.body}
            </span>
          </button>
        </SettingRow>
      ))}
      {more > 0 && (
        <SettingRow label="">
          <span className="text-tertiary-foreground">
            {t('posts.editor.overview.moreNotes', { count: more })}
          </span>
        </SettingRow>
      )}
    </SettingList>
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
