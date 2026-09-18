import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { brandSection } from '@/lib/brandSections'
import {
  AddEntryCard,
  BrandLibrary,
  LibraryCard,
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

  return (
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
          <SeriesCard key={entry.id} series={entry} onOpen={onOpen} />
        ))
      )}
    </BrandLibrary>
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
}: {
  series: ContentSeries
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  const formats = useFeatureFlag('content-formats')

  return (
    <LibraryCard onClick={onOpen ? () => onOpen(series.id) : undefined}>
      <header className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
          {series.name}
        </h3>
        {series.promise ? (
          <p className="text-sm leading-5 text-secondary-foreground">
            {series.promise}
          </p>
        ) : null}
      </header>

      {/* The recipe, quoted rather than summarised. It is the object's whole
          content, and a card that showed only its presence would be the filing
          cabinet this feature is trying not to be. Clamped, because a long
          recipe must not push the next card off the screen — the editor is one
          click away and is where it is read in full. */}
      {series.recipe ? (
        <p className="line-clamp-3 text-sm leading-5 whitespace-pre-line">
          {series.recipe}
        </p>
      ) : (
        <p className="text-sm leading-5 text-tertiary-foreground">
          {t('series.library.noRecipe')}
        </p>
      )}

      {/* The same foot the voice and audience cards have — what it has done,
          then what it is, bulleted and set in the line-under-the-name colour.
          Kept identical on purpose. */}
      <footer>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
          <li>{seriesMetaLine(t, series, { withFormat: formats })}</li>
          <li>{supplyLine(t, series.supply)}</li>
        </ul>
      </footer>
    </LibraryCard>
  )
}
