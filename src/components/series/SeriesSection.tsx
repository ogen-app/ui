import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { LibrarySelectionBar } from '@/components/brand/librarySelection'
import {
  useLibrarySelection,
  type LibrarySelection,
} from '@/components/brand/useLibrarySelection'
import { useFeatureFlag } from '@/config/featureFlags'
import { brandSection } from '@/lib/brandSections'
import {
  AddEntryCard,
  BrandLibrary,
  LibraryEntry,
  PlainActionCard,
  StarterCard,
  StarterGroup,
} from '@/components/brand/shell'
import { seriesMetaLine, supplyLine } from './format'
import { SERIES_STARTERS, seriesStarterCopy } from './starters'
import type { ContentSeries } from './types'

/**
 * The recurring things this workspace makes — the library, one card each.
 *
 * Voices' layout exactly: one entry per full-width card, the way to add one as
 * the last card, and an empty section that offers three of ours rather than a
 * blank list. Same primitives on purpose, so the two screens cannot drift into
 * looking like they were built by different people.
 *
 * **What a card has to say is a series' two halves**, and neither is optional
 * reading. The recipe is what makes it a standing instruction rather than a
 * label — so a series with none is visibly unticked on the hub and visibly
 * quiet here. The supply line is what says whether an empty Ideas queue matters
 * to it: "supplies its own subject" and "waits for an idea" are the difference
 * between a series that runs unattended forever and one that has been silently
 * doing nothing since the day it was written.
 *
 * Nothing here validates or refuses. A series saves with an empty recipe and
 * still works as a grouping key, which is most of its value before a generator
 * reads one.
 */
export function SeriesSection({
  series,
  onAdd,
  onOpen,
  onStart,
}: {
  series: ContentSeries[]
  /** Write one from nothing. */
  onAdd?: () => void
  onOpen?: (id: string) => void
  /** Fork one of ours. */
  onStart?: (starterId: string) => void
}) {
  const { t } = useTranslation()
  const empty = series.length === 0
  // Ticks for the assistant to read (CON-472); none while the list is empty.
  const selection = useLibrarySelection(
    'series',
    useMemo(() => series.map((e) => e.id), [series]),
  )

  return (
    <>
      <BrandLibrary
        add={
          empty ? (
            <PlainActionCard
              label={t('series.library.writeYourOwn')}
              onClick={onAdd}
            />
          ) : (
            <AddEntryCard
              label={t('series.library.add')}
              hint={t('series.library.addHint')}
              onClick={onAdd}
            />
          )
        }
      >
        {empty ? (
          <SeriesEmpty onStart={onStart} />
        ) : (
          series.map((entry) => (
            <SeriesCard
              key={entry.id}
              series={entry}
              onOpen={onOpen}
              selection={selection}
            />
          ))
        )}
      </BrandLibrary>
      <LibrarySelectionBar kind="series" selection={selection} />
    </>
  )
}

/** Three cards — the page's intro card has already stated the absence. */
function SeriesEmpty({ onStart }: { onStart?: (starterId: string) => void }) {
  const { t } = useTranslation()
  const { tone } = brandSection('series')
  return (
    <StarterGroup
      title={t('series.library.starterGroupTitle')}
      body={t('series.library.starterGroupBody')}
    >
      {SERIES_STARTERS.map((starter) => {
        const copy = seriesStarterCopy(t, starter)
        return (
          <StarterCard
            key={starter.id}
            icon={starter.icon}
            tone={tone}
            title={copy.title}
            body={copy.body}
            onClick={onStart ? () => onStart(starter.id) : undefined}
          />
        )
      })}
    </StarterGroup>
  )
}

function SeriesCard({
  series,
  onOpen,
  selection,
}: {
  selection?: LibrarySelection
  series: ContentSeries
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  const formats = useFeatureFlag('content-formats')

  return (
    <LibraryEntry
      tick={
        selection && {
          checked: selection.ticked.has(series.id),
          shown: selection.ticked.size > 0,
          onToggle: () => selection.toggle(series.id),
        }
      }
      onOpen={onOpen ? () => onOpen(series.id) : undefined}
      name={series.name}
      line={series.promise}
      // The recipe, quoted rather than summarised. It is the object's whole
      // content, and a card that showed only its presence would be the filing
      // cabinet this feature is trying not to be.
      substance={series.recipe}
      empty={t('series.library.noRecipe')}
      facts={[
        seriesMetaLine(t, series, { withFormat: formats }),
        supplyLine(t, series.supply),
      ]}
    />
  )
}
