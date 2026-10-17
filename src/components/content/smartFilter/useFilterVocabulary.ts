import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { useTags } from '@/hooks/useTags'
import {
  ASSET_KINDS,
  FILTER_FIELDS,
  FILTER_STATUSES,
  IDEAS_VALUES,
  NONE,
  UPDATED_PRESETS,
  isPreset,
  previousDay,
  startOfDay,
  type ChoiceField,
  type FilterField,
  type FilterToken,
} from '@/lib/assetFilter'
import { formatDate, formatList } from '@/lib/intl'
import type { SmartVocabulary, ValueOption } from '@/lib/smartFilter'
import type { AssetListPage } from '@/types/assetList'

export type { ValueOption }

/** The ideas values in the pill's vocabulary (`waiting` is `undecided`). */
const IDEAS_ICON = {
  undecided: VERDICT_ICON.waiting,
  yes: VERDICT_ICON.yes,
  later: VERDICT_ICON.later,
  no: VERDICT_ICON.no,
} as const

const UPDATED_KEY = {
  '1d': 'today',
  '7d': 'week',
  '30d': 'days30',
  month: 'month',
} as const

/**
 * The words and values of the Assets filter bar (CON-371): what each field is
 * called, its operators, the values it offers with their counts, and how a
 * token reads.
 *
 * Every count is the server's — the `facets` of the current query, which apply
 * every other filter but not the field's own, so ticking a second tag still
 * shows what it would add. A value nothing matches keeps its row at zero,
 * dimmed by the bar, so the list never changes shape under the pointer.
 */
export function useFilterVocabulary({
  facets,
  scoped,
}: {
  facets: AssetListPage['facets']
  /** A campaign's own page: Campaign is the scope, not a field. */
  scoped: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const tags = useTags()
  const { names: campaignNames } = useCampaignNames()

  const fields = useMemo(
    () => FILTER_FIELDS.filter((field) => !(scoped && field === 'campaign')),
    [scoped],
  )

  const fieldLabel = useCallback(
    (field: FilterField) => t(`content.filter.field.${field}`),
    [t],
  )

  const fieldHint = useCallback(
    (field: FilterField) => t(`content.filter.fieldHint.${field}`),
    [t],
  )

  /** The operator, as the token says it. */
  const operatorLabel = useCallback(
    (field: FilterField, negated: boolean) => {
      switch (field) {
        case 'title':
          return negated
            ? t('content.filter.op.notContains')
            : t('content.filter.op.contains')
        case 'updated':
          return negated
            ? t('content.filter.op.before')
            : t('content.filter.op.in')
        case 'ideas':
          return negated
            ? t('content.filter.op.hasNo')
            : t('content.filter.op.has')
        case 'text':
          return t('content.filter.op.mentions')
        default:
          return negated
            ? t('content.filter.op.isNot')
            : t('content.filter.op.is')
      }
    },
    [t],
  )

  /** Whether the field has two operators to choose between. */
  const hasOperatorStep = useCallback(
    (field: FilterField) => field !== 'text',
    [],
  )

  const countsOf = useCallback(
    (field: ChoiceField | 'updated') => {
      const list = facets[field]
      return list ? new Map(list.map((f) => [f.value, f.count])) : null
    },
    [facets],
  )

  const day = useCallback(
    (value: string) =>
      formatDate(
        startOfDay(value),
        { day: 'numeric', month: 'short', year: 'numeric' },
        locale,
      ),
    [locale],
  )

  /** One value as words. */
  const valueLabel = useCallback(
    (field: FilterField, value: string): string => {
      switch (field) {
        case 'kind':
          return t(`content.list.kind.${value}`, { defaultValue: value })
        case 'status':
          return t(`content.filter.status.${value}`, { defaultValue: value })
        case 'ideas':
          return t(`content.filter.ideas.${value}`, { defaultValue: value })
        case 'campaign':
          return value === NONE
            ? t('content.filter.noCampaign')
            : (campaignNames.get(value) ?? t('content.filter.unknownCampaign'))
        case 'tag':
          return value === NONE
            ? t('content.filter.noTags')
            : (tags.data?.find((tag) => tag.id === value)?.name ??
                t('content.filter.unknownTag'))
        case 'updated':
          return isPreset(value)
            ? t(`content.filter.updated.${UPDATED_KEY[value]}`)
            : day(value)
        default:
          return value
      }
    },
    [t, campaignNames, tags.data, day],
  )

  /** A token's values as one phrase: "Gartner or Finance", "1 Oct – 7 Oct". */
  const tokenValueText = useCallback(
    (token: Pick<FilterToken, 'field' | 'values'>) => {
      const { field, values } = token
      if (field === 'updated' && values.length === 2)
        return t('content.filter.range', {
          from: day(values[0]),
          // The endpoint's upper bound is exclusive; people say the last day.
          to: day(previousDay(values[1])),
        })
      if (field === 'title' || field === 'text')
        return formatList(
          values.map((v) => t('content.filter.quoted', { text: v })),
          'disjunction',
          locale,
        )
      return formatList(
        values.map((v) => valueLabel(field, v)),
        'disjunction',
        locale,
      )
    },
    [t, day, valueLabel, locale],
  )

  /** The whole token as one sentence — for screen readers and the empty state. */
  const tokenText = useCallback(
    (token: FilterToken) =>
      t('content.filter.tokenPlain', {
        field: fieldLabel(token.field),
        op: operatorLabel(token.field, token.negated),
        values: tokenValueText(token),
      }),
    [t, fieldLabel, operatorLabel, tokenValueText],
  )

  /**
   * The values a choice field offers, in the order it reads best: problem
   * states first for Status, the pill's order for Ideas, most-used first for
   * the rest — with "none" pinned under a rule.
   *
   * Counts are shown for the including operator only. For "is not" the facet
   * would answer a different question (how many *have* it), and for a field
   * an asset can hold several values of, what excluding one leaves cannot be
   * worked out from it at all.
   */
  const options = useCallback(
    (field: FilterField, negated: boolean): ValueOption[] => {
      if (field === 'title' || field === 'text') return []
      const counts = negated ? null : countsOf(field)
      const count = (value: string) =>
        counts ? (counts.get(value) ?? 0) : null
      const byCount = (a: ValueOption, b: ValueOption) =>
        (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label)

      switch (field) {
        case 'kind':
          return ASSET_KINDS.map((value) => ({
            value,
            label: valueLabel('kind', value),
            count: count(value),
            icon: KIND_ICON[value],
          })).sort(byCount)
        case 'status':
          return FILTER_STATUSES.map((value) => ({
            value,
            label: valueLabel('status', value),
            count: count(value),
          }))
        case 'ideas':
          return IDEAS_VALUES.map((value) => ({
            value,
            label: valueLabel('ideas', value),
            count: count(value),
            ...(value in IDEAS_ICON
              ? {
                  icon: IDEAS_ICON[value as keyof typeof IDEAS_ICON],
                  tone:
                    value === 'undecided'
                      ? ('accent' as const)
                      : value === 'yes'
                        ? ('positive' as const)
                        : ('muted' as const),
                }
              : { pinned: true }),
          }))
        case 'updated':
          return UPDATED_PRESETS.map((value) => ({
            value,
            label: valueLabel('updated', value),
            count: count(value),
          }))
        case 'campaign': {
          // Every campaign the facet knows, or — before it has answered —
          // every one there is, so the list is never empty for a beat.
          const ids = counts
            ? [...counts.keys()].filter((id) => id !== NONE)
            : [...campaignNames.keys()]
          return [
            ...ids
              .filter((id) => campaignNames.has(id))
              .map((id) => ({
                value: id,
                label: valueLabel('campaign', id),
                count: count(id),
              }))
              .sort(byCount),
            {
              value: NONE,
              label: valueLabel('campaign', NONE),
              count: count(NONE),
              pinned: true,
            },
          ]
        }
        case 'tag':
          return [
            ...(tags.data ?? [])
              .map((tag) => ({
                value: tag.id,
                label: tag.name,
                count: count(tag.id),
              }))
              .sort(byCount),
            {
              value: NONE,
              label: valueLabel('tag', NONE),
              count: count(NONE),
              pinned: true,
            },
          ]
      }
    },
    [countsOf, valueLabel, campaignNames, tags.data],
  )

  const textPlaceholder = useCallback(
    (field: FilterField) =>
      field === 'text'
        ? t('content.filter.textPlaceholder')
        : t('content.filter.titlePlaceholder'),
    [t],
  )

  return {
    label: t('content.filter.label'),
    placeholder: t('content.filter.placeholder'),
    textPlaceholder,
    fields,
    fieldLabel,
    fieldHint,
    operatorLabel,
    hasOperatorStep,
    valueLabel,
    tokenValueText,
    tokenText,
    options,
  }
}

export type FilterVocabulary = ReturnType<typeof useFilterVocabulary> &
  SmartVocabulary<FilterField>
