import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Note01Icon } from '@hugeicons/core-free-icons'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import {
  ASSET_KINDS,
  isPreset,
  previousDay,
  startOfDay,
} from '@/lib/assetFilter'
import {
  CREATED_PRESETS,
  FIT_BANDS,
  IDEA_FILTER_FIELDS,
  IDEA_ORIGINS,
  NONE,
  type IdeaFilterField,
  type IdeaToken,
} from '@/lib/ideaFilter'
import { formatDate, formatList } from '@/lib/intl'
import type { SmartVocabulary, ValueOption } from '@/lib/smartFilter'
import type { Translation } from '@/i18n/resources/en'
import type { IdeaListPage } from '@/services/api/ideas'
import type { AssetListKind } from '@/types/assetList'

const CREATED_KEY = {
  '1d': 'today',
  '7d': 'week',
  '30d': 'days30',
  month: 'month',
} as const

/**
 * The words and values of the Ideas filter bar (CON-388 §4) — the Assets
 * vocabulary's shape (`useFilterVocabulary`), for ideas.
 *
 * Every count is the server's: the `facets` of the current query, each
 * applying every other filter but not its own. A value nothing matches keeps
 * its row at zero, dimmed by the bar. Two values are shown but cannot be
 * asked for: a phase whose name holds a comma (values are comma-separated on
 * the wire), and the empty phase and author the facets carry for ideas that
 * have none, which are left out.
 */
export function useIdeaVocabulary({
  facets,
  sourceLabels,
  scoped,
}: {
  facets: IdeaListPage['facets']
  sourceLabels: { id: string; title: string; kind: AssetListKind }[]
  /** A campaign's own page: Campaign is the scope, not a field. */
  scoped: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { names: campaignNames } = useCampaignNames()
  const members = useWorkspaceMembers()
  const memberNames = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data],
  )
  const sources = useMemo(
    () => new Map(sourceLabels.map((s) => [s.id, s])),
    [sourceLabels],
  )

  const fields = useMemo(
    () =>
      IDEA_FILTER_FIELDS.filter(
        (field) => !(scoped && field === 'campaign_id'),
      ),
    [scoped],
  )

  const fieldLabel = useCallback(
    (field: IdeaFilterField) => t(`ideas.filter.field.${field}`),
    [t],
  )
  const fieldHint = useCallback(
    (field: IdeaFilterField) => t(`ideas.filter.fieldHint.${field}`),
    [t],
  )

  const operatorLabel = useCallback(
    (field: IdeaFilterField, negated: boolean) => {
      switch (field) {
        case 'created':
          return negated
            ? t('content.filter.op.before')
            : t('content.filter.op.in')
        case 'text':
          return t('content.filter.op.contains')
        default:
          return negated
            ? t('content.filter.op.isNot')
            : t('content.filter.op.is')
      }
    },
    [t],
  )

  const hasOperatorStep = useCallback(
    (field: IdeaFilterField) => field !== 'text',
    [],
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
    (field: IdeaFilterField, value: string): string => {
      switch (field) {
        case 'origin':
          return t(`ideas.filter.origin.${value as 'manual'}`, {
            defaultValue: value,
          })
        case 'fit':
          return t(`ideas.filter.fit.${value as 'high'}`, {
            defaultValue: value,
          })
        case 'kind':
          return t(`content.list.kind.${value as 'pdf'}`, {
            defaultValue: value,
          })
        case 'source_asset':
          return value === NONE
            ? t('ideas.filter.noDocument')
            : (sources.get(value)?.title ?? t('ideas.filter.unknownDocument'))
        case 'campaign_id':
          return value === NONE
            ? t('content.filter.noCampaign')
            : (campaignNames.get(value) ?? t('content.filter.unknownCampaign'))
        case 'author':
          return memberNames.get(value) ?? t('ideas.filter.formerMember')
        case 'created':
          return isPreset(value)
            ? t(`content.filter.updated.${CREATED_KEY[value]}`)
            : day(value)
        default:
          return value
      }
    },
    [t, sources, campaignNames, memberNames, day],
  )

  const tokenValueText = useCallback(
    (token: Pick<IdeaToken, 'field' | 'values'>) => {
      const { field, values } = token
      if (field === 'created' && values.length === 2)
        return t('content.filter.range', {
          from: day(values[0]),
          // The endpoint's upper bound is exclusive; people say the last day.
          to: day(previousDay(values[1])),
        })
      if (field === 'text')
        return t('content.filter.quoted', { text: values[0] ?? '' })
      return formatList(
        values.map((v) => valueLabel(field, v)),
        'disjunction',
        locale,
      )
    },
    [t, day, valueLabel, locale],
  )

  /** One value as it reads inside a clause: "PDFs", "high", "no campaign". */
  const sentenceValue = useCallback(
    (field: IdeaFilterField, value: string): string => {
      switch (field) {
        case 'origin':
          return t(`ideas.sentence.origin.${value as 'manual'}`, {
            defaultValue: value,
          })
        case 'kind':
          return t(`ideas.sentence.kind.${value as 'pdf'}`, {
            defaultValue: value,
          })
        case 'fit':
          return t(`ideas.sentence.fit.${value as 'high'}`, {
            defaultValue: value,
          })
        case 'campaign_id':
          return value === NONE
            ? t('ideas.sentence.noCampaign')
            : valueLabel(field, value)
        case 'source_asset':
          return value === NONE
            ? t('ideas.sentence.noDocument')
            : valueLabel(field, value)
        case 'created':
          return isPreset(value)
            ? t(`ideas.sentence.created.${CREATED_KEY[value]}`)
            : day(value)
        default:
          return valueLabel(field, value)
      }
    },
    [t, valueLabel, day],
  )

  /**
   * A token as its clause in the sentence (CON-391): the catalogue key and
   * what fills it. One sentence per field and operator, so a language puts
   * the words in its own order; values are joined with "or", as the server
   * matches any of them.
   */
  const clause = useCallback(
    (token: IdeaToken): Clause => {
      const { field, negated, values } = token
      const key = (name: ClauseName, fill: Record<string, string> = {}) => ({
        key: `ideas.sentence.clause.${name}` as const,
        values: fill,
      })
      if (field === 'created') {
        if (negated)
          // "Before" a preset is its own phrase — "more than 7 days ago" —
          // never "before in the last 7 days".
          return isPreset(values[0])
            ? key('created_not_preset', {
                values: t(
                  `ideas.sentence.createdBefore.${CREATED_KEY[values[0]]}`,
                ),
              })
            : key('created_not', { values: day(values[0]) })
        if (values.length === 2)
          return key('created_range', {
            from: day(values[0]),
            // The endpoint's upper bound is exclusive; people say the last day.
            to: day(previousDay(values[1])),
          })
        return key('created', { values: sentenceValue(field, values[0]) })
      }
      if (field === 'text') return key('text', { values: values[0] ?? '' })
      if (!negated && values.length === 1) {
        if (field === 'source_asset' && values[0] === NONE)
          return key('source_asset_none')
        if (field === 'fit' && values[0] === 'unscored')
          return key('fit_unscored')
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
    (token: IdeaToken) => {
      const { key, values } = clause(token)
      // One key of a known family; the union is wider than `t` resolves.
      const words = (t as (k: string, o: object) => string)(key, values)
      return words.replace(/<\/?\w+>/g, '')
    },
    [t, clause],
  )

  /**
   * The values a field offers. Counts are shown for "is" only: for "is not"
   * the facet answers a different question. Fixed vocabularies keep their own
   * order (fit best first); the rest read most-used first, "none" pinned
   * under a rule.
   */
  const options = useCallback(
    (field: IdeaFilterField, negated: boolean): ValueOption[] => {
      if (field === 'text') return []
      const list = negated ? null : facets[field]
      const counts = list ? new Map(list.map((f) => [f.value, f.count])) : null
      const count = (value: string) =>
        counts ? (counts.get(value) ?? 0) : null
      const byCount = (a: ValueOption, b: ValueOption) =>
        (b.count ?? 0) - (a.count ?? 0) || a.label.localeCompare(b.label)
      /** The values the facet knows, whatever the operator. */
      const seen = (facets[field] ?? [])
        .map((f) => f.value)
        .filter((v) => v !== '' && v !== NONE)

      switch (field) {
        case 'origin':
          return IDEA_ORIGINS.map((value) => ({
            value,
            label: valueLabel(field, value),
            count: count(value),
          }))
        case 'fit':
          return FIT_BANDS.map((value) => ({
            value,
            // The band's range in the menu, where the choice is made; the
            // token says the band alone ("Fit is High or Medium").
            label:
              value === 'unscored'
                ? valueLabel(field, value)
                : t('ideas.filter.fitRange', {
                    band: valueLabel(field, value),
                    range: t(`ideas.filter.fitBand.${value}`),
                  }),
            count: count(value),
            pinned: value === 'unscored',
          }))
        case 'kind':
          return ASSET_KINDS.map((value) => ({
            value,
            label: valueLabel(field, value),
            count: count(value),
            icon: KIND_ICON[value],
            tone: KIND_TONE[value] ?? 'text-kind-neutral',
          })).sort(byCount)
        case 'created':
          return CREATED_PRESETS.map((value) => ({
            value,
            label: valueLabel(field, value),
            count: count(value),
          }))
        case 'source_asset':
          return [
            ...seen
              .map((value) => {
                const kind = sources.get(value)?.kind
                return {
                  value,
                  label: valueLabel(field, value),
                  count: count(value),
                  icon: (kind && KIND_ICON[kind]) || Note01Icon,
                  tone: (kind && KIND_TONE[kind]) ?? 'text-kind-neutral',
                }
              })
              .sort(byCount),
            {
              value: NONE,
              label: valueLabel(field, NONE),
              count: count(NONE),
              pinned: true,
            },
          ]
        case 'campaign_id': {
          const ids = seen.length ? seen : [...campaignNames.keys()]
          return [
            ...ids
              .map((value) => ({
                value,
                label: valueLabel(field, value),
                count: count(value),
              }))
              .sort(byCount),
            {
              value: NONE,
              label: valueLabel(field, NONE),
              count: count(NONE),
              pinned: true,
            },
          ]
        }
        case 'author':
          return seen
            .map((value) => ({
              value,
              label: valueLabel(field, value),
              count: count(value),
            }))
            .sort(byCount)
        case 'phase':
          return seen
            .map((value) => ({
              value,
              label: value,
              // Values travel comma-separated, so this one cannot be asked
              // for — shown, so the list matches the cards, and dimmed.
              ...(value.includes(',')
                ? { count: null, disabled: true }
                : { count: count(value) }),
            }))
            .sort(byCount)
      }
    },
    [facets, valueLabel, sources, campaignNames, t],
  )

  const label = t('ideas.filter.label')
  const placeholder = t('ideas.filter.placeholder')
  const textPlaceholder = useCallback(
    () => t('ideas.filter.textPlaceholder'),
    [t],
  )
  const vocabulary: SmartVocabulary<IdeaFilterField> & {
    valueLabel: typeof valueLabel
    clause: typeof clause
  } = useMemo(
    () => ({
      label,
      placeholder,
      textPlaceholder,
      fields,
      fieldLabel,
      fieldHint,
      operatorLabel,
      hasOperatorStep,
      tokenValueText,
      tokenText,
      options,
      valueLabel,
      clause,
    }),
    [
      label,
      placeholder,
      textPlaceholder,
      fields,
      fieldLabel,
      fieldHint,
      operatorLabel,
      hasOperatorStep,
      tokenValueText,
      tokenText,
      options,
      valueLabel,
      clause,
    ],
  )
  return vocabulary
}

export type IdeaVocabulary = ReturnType<typeof useIdeaVocabulary>

/** The clauses the catalogue words, one per field and operator. */
type ClauseName = keyof Translation['ideas']['sentence']['clause']

/** A clause's catalogue key and what fills it. */
export type Clause = {
  key: `ideas.sentence.clause.${ClauseName}`
  values: Record<string, string>
}
