import { Fragment, type ReactNode } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AiIdeaIcon,
  ArrowDown01Icon,
  ArrowUpDownIcon,
  Layers01Icon,
} from '@hugeicons/core-free-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ASSET_GROUPS,
  SORT_PAIRS,
  type AssetGrouping,
  type AssetSort,
} from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'

/** Each sort's catalogue key — a table, since a sort value isn't a key. */
const SORT_KEY = {
  '-updated_at': 'updatedNewest',
  updated_at: 'updatedOldest',
  '-created_at': 'addedNewest',
  created_at: 'addedOldest',
  title: 'titleAsc',
  '-title': 'titleDesc',
  relevance: 'relevance',
} as const satisfies Record<AssetSort, string>

/** Each grouping's catalogue key, `none` included. */
const GROUP_KEY = {
  created: 'created',
  campaign: 'campaign',
  tag: 'tag',
  kind: 'kind',
  none: 'none',
} as const satisfies Record<AssetGrouping, string>

/**
 * The line between the filter sentence and the list (CON-378): select all
 * and how much is left to answer on the left, how the list is laid out on the
 * right.
 *
 * The sentence counts **ideas** — the server's sum over the whole match
 * (`ideas_undecided_total`, CON-379), never one added up here — and says over
 * how many documents: the filtered count, or every document when nothing is
 * filtered. The figure goes to where the ideas are answered. With nothing undecided it
 * says nothing: a sentence about zero is a sentence nobody needed.
 *
 * Group by and Sort are plain words with a chevron, no box: they change how
 * the list is read, not what is in it, and the filter bar above already looks
 * like the control. Sort leaves the column headers it used to live in, since
 * the list has none.
 */
export function AssetViewBar({
  leading,
  undecided,
  documents,
  ideasLink,
  grouping,
  onGroupingChange,
  scoped,
  sort,
  onSortChange,
  searching,
}: {
  /** The list's select-all, at the line's start over the rows' boxes. */
  leading?: ReactNode
  /** Undecided ideas over the whole match. */
  undecided: number
  /** The documents matching the filter — all of them when nothing is filtered. */
  documents: number
  /** Where the undecided ideas are answered. */
  ideasLink: LinkProps
  grouping: AssetGrouping
  onGroupingChange: (next: AssetGrouping) => void
  /** A campaign's own page: no Campaign grouping, every row is in it. */
  scoped: boolean
  sort: AssetSort
  onSortChange: (next: AssetSort) => void
  /** Searching inside the documents, which is what makes Best match a sort. */
  searching: boolean
}) {
  const { t, i18n } = useTranslation()
  const groupings = ASSET_GROUPS.filter((g) => !(scoped && g === 'campaign'))
  // Best match is a group of its own, first, while searching; then each
  // field's two directions together.
  const sortGroups: readonly (readonly AssetSort[])[] = searching
    ? [['relevance'], ...SORT_PAIRS]
    : SORT_PAIRS

  return (
    <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-5 gap-y-1 px-1 text-[13px]">
      {leading}
      {undecided > 0 && (
        <p className="mr-auto flex items-center gap-1.5 text-sm text-secondary-foreground">
          <HugeiconsIcon
            icon={AiIdeaIcon}
            size={21.6}
            strokeWidth={1.5}
            aria-hidden
            className="shrink-0 text-accent"
          />
          <span>
            <Trans
              i18nKey="content.view.undecided"
              count={undecided}
              values={{
                formatted: formatNumber(undecided, {}, i18n.language),
                documents: t('content.view.documents', {
                  count: documents,
                  formatted: formatNumber(documents, {}, i18n.language),
                }),
              }}
              components={{
                ideas: (
                  <Link
                    {...ideasLink}
                    className="font-medium text-accent outline-none hover:underline focus-visible:underline"
                  />
                ),
              }}
            />
          </span>
        </p>
      )}

      <div className="ml-auto flex items-center gap-5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-secondary-foreground outline-none focus-visible:underline">
            <HugeiconsIcon icon={Layers01Icon} size={16} aria-hidden />
            {t('content.view.groupBy')}
            <span className="flex items-center gap-1 font-medium text-foreground">
              {t(`content.view.group.${GROUP_KEY[grouping]}`)}
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} aria-hidden />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-64">
            <DropdownMenuLabel className="text-[11px] tracking-wide text-secondary-foreground">
              {t('content.view.groupByHeading')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={grouping}
              onValueChange={(v) => onGroupingChange(v as AssetGrouping)}
            >
              {groupings.map((g) => (
                <DropdownMenuRadioItem key={g} value={g}>
                  <span>{t(`content.view.group.${GROUP_KEY[g]}`)}</span>
                  {g === 'tag' && (
                    <span className="ml-auto pl-3 text-xs text-secondary-foreground">
                      {t('content.view.groupHint.tag')}
                    </span>
                  )}
                </DropdownMenuRadioItem>
              ))}
              <DropdownMenuSeparator className="mx-2" />
              <DropdownMenuRadioItem value="none">
                {t('content.view.group.none')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-secondary-foreground outline-none focus-visible:underline">
            <HugeiconsIcon icon={ArrowUpDownIcon} size={16} aria-hidden />
            {t('content.view.sortBy')}
            <span className="flex items-center gap-1 font-medium text-foreground">
              {t(`content.view.sort.${SORT_KEY[sort]}`)}
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} aria-hidden />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-60">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(v) => onSortChange(v as AssetSort)}
            >
              {sortGroups.map((group, i) => (
                <Fragment key={group.join()}>
                  {/* Inset from the menu's edges: a rule between two pairs,
                      not a border across the menu. */}
                  {i > 0 && <DropdownMenuSeparator className="mx-2" />}
                  {group.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {t(`content.view.sort.${SORT_KEY[s]}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </Fragment>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
