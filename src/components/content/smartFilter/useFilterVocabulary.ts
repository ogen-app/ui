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
import { formatDate, formatList, formatNumber } from '@/lib/intl'
import type { Clause, SentenceVocabulary, ValueOption } from '@/lib/smartFilter'
import type { Translation } from '@/i18n/resources/en'
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
 * The words and values of the Assets filter sentence (CON-371, as a sentence
 * since CON-392): how each clause reads, the values each field offers with
 * their counts, and what the panels and the starters say.
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

  /** One value as it reads inside a clause: "PDFs", "only partly read". */
  const sentenceValue = useCallback(
    (field: FilterField, value: string): string => {
      switch (field) {
        case 'kind':
          return t(`content.sentence.kind.${value as 'pdf'}`, {
            defaultValue: value,
          })
        case 'status':
          return t(`content.sentence.status.${value as 'ready'}`, {
            defaultValue: value,
          })
        case 'ideas':
          return t(`content.sentence.ideas.${value as 'yes'}`, {
            defaultValue: value,
          })
        case 'campaign':
          return value === NONE
            ? t('content.sentence.noCampaign')
            : valueLabel(field, value)
        case 'updated':
          return isPreset(value)
            ? t(`content.sentence.updated.${UPDATED_KEY[value]}`)
            : day(value)
        case 'title':
        case 'text':
          return t('content.sentence.quoted', { text: value })
        default:
          return valueLabel(field, value)
      }
    },
    [t, valueLabel, day],
  )

  /**
   * A token as its clause (CON-392): the catalogue key and what fills it.
   * One sentence per field and operator, so a language puts the words in its
   * own order; values are joined with "or", as the server matches any of
   * them. Type, kept, is the sentence's subject — "Showing *PDFs*, …".
   */
  const clause = useCallback(
    (token: FilterToken): Clause => {
      const { field, negated, values } = token
      const key = (
        name: ClauseName,
        fill: Record<string, string> = {},
      ): Clause => ({ key: `content.sentence.clause.${name}`, values: fill })
      if (field === 'updated') {
        if (negated) return key('updated_not', { values: day(values[0]) })
        if (values.length === 2)
          return key('updated_range', {
            from: day(values[0]),
            // The endpoint's upper bound is exclusive; people say the last day.
            to: day(previousDay(values[1])),
          })
        return key('updated', { values: sentenceValue(field, values[0]) })
      }
      if (field === 'text') return key('text', { values: values[0] ?? '' })
      if (!negated && values.length === 1) {
        if (field === 'tag' && values[0] === NONE) return key('tag_none')
        if (field === 'ideas' && values[0] === 'none') return key('ideas_none')
        if (field === 'ideas' && values[0] === 'unread')
          return key('ideas_unread')
      }
      const list = formatList(
        values.map((v) => sentenceValue(field, v)),
        'disjunction',
        locale,
      )
      return key(negated ? `${field}_not` : field, { values: list })
    },
    [day, sentenceValue, locale],
  )

  /** The clause as plain words — for screen readers and the empty state. */
  const tokenText = useCallback(
    (token: FilterToken) => {
      const { key, values } = clause(token)
      // One key of a known family; the union is wider than `t` resolves.
      const words = (t as (k: string, o: object) => string)(key, values)
      return words.replace(/<\/?\w+>/g, '')
    },
    [t, clause],
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
          // "Before" takes a day: the endpoint reads no preset as an upper
          // bound, so the panel opens on the date.
          if (negated) return []
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

  const question = useCallback(
    (field: FilterField) => t(`content.sentence.question.${field}`),
    [t],
  )
  const switchLabels = useCallback(
    (field: FilterField): [string, string] | null =>
      field === 'text'
        ? null
        : [
            t(`content.sentence.include.${field}`),
            t(`content.sentence.exclude.${field}`),
          ],
    [t],
  )
  const findLabel = useCallback(
    (field: FilterField) =>
      field === 'kind' || field === 'campaign' || field === 'tag'
        ? t(`content.sentence.find.${field}`)
        : null,
    [t],
  )
  const starter = useCallback(
    (field: FilterField) =>
      field === 'text' ? '' : t(`content.sentence.starter.${field}`),
    [t],
  )
  const starterHint = useCallback(
    (field: FilterField) =>
      field === 'kind' ||
      field === 'status' ||
      field === 'updated' ||
      field === 'ideas'
        ? t(`content.sentence.starterHint.${field}`)
        : null,
    [t],
  )
  const textPlaceholder = useCallback(
    (field: FilterField) =>
      t(
        field === 'text'
          ? 'content.sentence.textPlaceholder.text'
          : 'content.sentence.textPlaceholder.title',
      ),
    [t],
  )
  const matches = useCallback(
    (count: number) =>
      t('content.sentence.assets', {
        count,
        formatted: formatNumber(count, {}, locale),
      }),
    [t, locale],
  )

  const vocabulary: SentenceVocabulary<FilterField> & {
    valueLabel: typeof valueLabel
  } = useMemo(
    () => ({
      fields,
      order: SENTENCE_ORDER,
      subject: 'kind',
      showingKey: 'content.sentence.showing',
      showingSubjectKey: 'content.sentence.showingSubject',
      showingAllKey: 'content.sentence.showingAll',
      clause,
      tokenText,
      options,
      question,
      switchLabels,
      findLabel,
      starter,
      starterHint,
      textPlaceholder,
      matches,
      valueLabel,
    }),
    [
      fields,
      clause,
      tokenText,
      options,
      question,
      switchLabels,
      findLabel,
      starter,
      starterHint,
      textPlaceholder,
      matches,
      valueLabel,
    ],
  )
  return vocabulary
}

export type FilterVocabulary = ReturnType<typeof useFilterVocabulary>

/** The order the clauses read in; Type, kept, leads as the subject. */
const SENTENCE_ORDER: readonly FilterField[] = [
  'kind',
  'campaign',
  'tag',
  'title',
  'status',
  'updated',
  'ideas',
  'text',
]

/** The clauses the catalogue words, one per field and operator. */
type ClauseName = keyof Translation['content']['sentence']['clause']
