import { cn } from '@/lib'
import { tallyAssetKinds } from '@/lib/assetKind'
import { retrievability } from '@/lib/campaignSources'
import type { Asset } from '@/types/content'
import { ASSET_KIND_ICON, assetKindNoun } from './assetKindIcons'

/**
 * A library of documents as a row of tiles: how many of each kind is in it.
 *
 * **For the preview cards only** — Foundation's Sources card at the workspace
 * level, and the campaign's Foundation card on its Overview. Both used to list
 * documents by name, five of them, the way the Voices and Audiences cards list
 * theirs. That reads well for a library of four and stops being true at forty:
 * the five newest titles are not a picture of a bank, they are a sample nobody
 * asked for, and the card had grown a footnote saying as much. Kinds and counts
 * are the one summary that stays true at both sizes and does not need a
 * caveat — and they answer the question a preview is actually asked, which is
 * *what sort of thing is in there*, not *which five changed last*.
 *
 * **Tiles rather than a line of text**, and that is the difference between this
 * card and the two above it. Voices and audiences are things somebody wrote, so
 * their previews are sentences. A document library is a pile of files, and the
 * one interface everybody already reads at a glance for that is a folder: a
 * bordered box per kind, the glyph centred over its count. It also gives the
 * eye something to aim at — the card's job is to be clicked, and a paragraph is
 * not a target.
 *
 * Nothing here is a control. The whole card is the way in, and the list itself
 * is one click below it, where the names belong.
 */
export function AssetKindTally({
  assets,
  className,
}: {
  assets: Asset[]
  className?: string
}) {
  const tally = tallyAssetKinds(assets)
  if (tally.length === 0) return null

  // The tick these rows replaced said whether the app could actually write
  // from a document, and that is the one thing a count of kinds cannot say: a
  // hundred PDFs still being extracted look exactly like a hundred ready ones.
  // So the two states that are not "ready" keep their own words under the
  // tiles — muted, because they are a temporary state and a failure, not a
  // fifth kind of thing.
  const waiting = assets.filter(
    (asset) => retrievability(asset.status) === 'waiting',
  ).length
  const unreadable = assets.filter(
    (asset) => retrievability(asset.status) === 'never',
  ).length
  const notes = [
    waiting > 0 ? `${waiting} still being read` : null,
    unreadable > 0 ? `${unreadable} couldn’t be read` : null,
  ].filter(Boolean)

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <ul className="flex flex-wrap gap-2">
        {tally.map(({ kind, count }) => {
          const Icon = ASSET_KIND_ICON[kind]
          return (
            <li
              key={kind}
              className="flex w-24 flex-col items-center gap-1 rounded-md border border-quaternary px-2 py-3 text-center"
            >
              <Icon
                className="size-6 shrink-0 text-tertiary-foreground"
                aria-hidden
              />
              <span className="text-sm font-medium leading-5 tabular-nums">
                {count}
              </span>
              {/* The noun under the number rather than beside it: the tiles are
                  a fixed width so the counts line up down the row, and a word
                  of unpredictable length on the same line would push each
                  number to a different place. */}
              <span className="text-xs leading-4 text-tertiary-foreground">
                {assetKindNoun(kind, count)}
              </span>
            </li>
          )
        })}
      </ul>
      {notes.length > 0 && (
        <p className="text-xs text-tertiary-foreground">{notes.join(' · ')}</p>
      )}
    </div>
  )
}
