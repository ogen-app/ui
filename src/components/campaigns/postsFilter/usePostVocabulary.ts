import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { useCampaign, useCampaigns } from '@/hooks/useCampaigns'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { previousDay, startOfDay } from '@/lib/assetFilter'
import { formatDate, formatList, formatNumber } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import {
  CAMPAIGN_POST_FILTER_FIELDS,
  POST_FILTER_FIELDS,
  POST_SCHEDULED,
  POST_STATUSES,
  type PostFilterField,
  type PostToken,
} from '@/lib/postFilter'
import type { Clause, SentenceVocabulary, ValueOption } from '@/lib/smartFilter'
import type { Translation } from '@/i18n/resources/en'
import type { PostStatus } from '@/types/posts'

/**
 * The words and values of the posts filter (CON-472) — the Ideas
 * vocabulary's shape (`useIdeaVocabulary`), for posts.
 *
 * On a campaign's pages the values a field offers are the campaign's own: its
 * platforms, and the post types those platforms take there. On the
 * workspace's (`campaignId` null) they are every live campaign's, and the
 * campaigns themselves are a field. The endpoint returns no facets, so no
 * value carries a count, and none is ever counted here.
 */
export function usePostVocabulary(campaignId: string | null) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { resolve } = usePlatformCatalog()
  const campaign = useCampaign(campaignId ?? '')
  const campaignsQuery = useCampaigns()
  // Archived campaigns' posts are not on the workspace's pages
  // (`useWorkspacePosts`), so they are not offered either.
  const campaigns = useMemo(
    () => (campaignsQuery.data ?? []).filter((c) => !c.archived_at),
    [campaignsQuery.data],
  )
  const targets = useMemo(() => {
    if (campaignId) return campaign.data?.target_platforms ?? []
    // Each platform once, with every post type any campaign takes on it.
    const merged = new Map<string, Set<string>>()
    for (const c of campaigns)
      for (const target of c.target_platforms ?? []) {
        const types = merged.get(target.id) ?? new Set<string>()
        for (const slug of target.post_types) types.add(slug)
        merged.set(target.id, types)
      }
    return [...merged].map(([id, types]) => ({ id, post_types: [...types] }))
  }, [campaignId, campaign.data, campaigns])
  const textSearch = useFeatureFlag('posts-text-search')
  const fields = useMemo(
    () =>
      (campaignId ? CAMPAIGN_POST_FILTER_FIELDS : POST_FILTER_FIELDS).filter(
        (field) => textSearch || field !== 'text',
      ),
    [campaignId, textSearch],
  )

  /** Every post type the campaign's platforms take, each worded once. */
  const postTypes = useMemo(() => {
    const out = new Map<string, string>()
    for (const target of targets) {
      const named = resolve(target.id)?.postTypes ?? []
      for (const slug of target.post_types)
        if (!out.has(slug))
          out.set(slug, named.find((p) => p.slug === slug)?.label ?? slug)
    }
    return out
  }, [targets, resolve])

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
    (field: PostFilterField, value: string): string => {
      switch (field) {
        case 'campaign_id':
          return (
            campaigns.find((c) => c.id === value)?.name ??
            t('postsFilter.unknownCampaign')
          )
        case 'status':
          return postStatusLabel(t, value as PostStatus)
        case 'platform':
          return resolve(value)?.name ?? t('postsFilter.unknownPlatform')
        case 'post_type':
          return postTypes.get(value) ?? value
        case 'scheduled':
          return t(`postsFilter.scheduled.${value as 'yes'}`, {
            defaultValue: value,
          })
        case 'date':
          return day(value)
        case 'text':
          return value
      }
    },
    [t, campaigns, resolve, postTypes, day],
  )

  /** One value as it reads inside a clause: "drafts", "with a date". */
  const sentenceValue = useCallback(
    (field: PostFilterField, value: string): string => {
      switch (field) {
        case 'status':
          return t(`postsFilter.sentence.status.${value as 'draft'}`, {
            defaultValue: value,
          })
        case 'scheduled':
          return t(`postsFilter.sentence.scheduled.${value as 'yes'}`, {
            defaultValue: value,
          })
        default:
          return valueLabel(field, value)
      }
    },
    [t, valueLabel],
  )

  /** A token as its clause: the catalogue key and what fills it. */
  const clause = useCallback(
    (token: PostToken): Clause => {
      const { field, negated, values } = token
      const key = (
        name: ClauseName,
        fill: Record<string, string> = {},
      ): Clause => ({
        key: `postsFilter.sentence.clause.${name}`,
        values: fill,
      })
      if (field === 'date') {
        if (values.length === 2)
          return key('date_range', {
            from: day(values[0]),
            // The endpoint's upper bound is exclusive; people say the last day.
            to: day(previousDay(values[1])),
          })
        return negated
          ? key('date_not', { values: day(values[0]) })
          : key('date', { values: day(values[0]) })
      }
      if (field === 'scheduled')
        return key('scheduled', { values: sentenceValue(field, values[0]) })
      if (field === 'text') return key('text', { values: values[0] ?? '' })
      const list = formatList(
        values.map((v) => sentenceValue(field, v)),
        'disjunction',
        locale,
      )
      return key(negated ? `${field}_not` : field, { values: list })
    },
    [day, sentenceValue, locale],
  )

  const tokenText = useCallback(
    (token: PostToken) => {
      const { key, values } = clause(token)
      // One key of a known family; the union is wider than `t` resolves.
      const words = (t as (k: string, o: object) => string)(key, values)
      return words.replace(/<\/?\w+>/g, '')
    },
    [t, clause],
  )

  const options = useCallback(
    (field: PostFilterField): ValueOption[] => {
      const option = (value: string): ValueOption => ({
        value,
        label: valueLabel(field, value),
        count: null,
      })
      switch (field) {
        case 'campaign_id':
          return campaigns.map((c) => option(c.id))
        case 'status':
          return POST_STATUSES.map(option)
        case 'platform':
          return targets.map((p) => option(p.id))
        case 'post_type':
          return [...postTypes.keys()].map(option)
        case 'scheduled':
          return POST_SCHEDULED.map(option)
        case 'date':
          // The endpoint takes days, not presets: a range is picked.
          return []
        case 'text':
          return []
      }
    },
    [valueLabel, campaigns, targets, postTypes],
  )

  const question = useCallback(
    (field: PostFilterField) => t(`postsFilter.sentence.question.${field}`),
    [t],
  )
  const switchLabels = useCallback(
    (field: PostFilterField): [string, string] | null =>
      // A search has no "not".
      field === 'scheduled' || field === 'text'
        ? null
        : [
            t(`postsFilter.sentence.include.${field}`),
            t(`postsFilter.sentence.exclude.${field}`),
          ],
    [t],
  )
  const findLabel = useCallback(
    (field: PostFilterField) =>
      field === 'campaign_id' ? t('postsFilter.sentence.findCampaign') : null,
    [t],
  )
  const starter = useCallback(
    // A search is typed into Add, never started from the list.
    (field: PostFilterField) =>
      field === 'text' ? '' : t(`postsFilter.sentence.starter.${field}`),
    [t],
  )
  const starterHint = useCallback(
    (field: PostFilterField) =>
      field === 'status' ? t('postsFilter.sentence.starterHint.status') : null,
    [t],
  )
  const textPlaceholder = useCallback(
    () => t('postsFilter.sentence.textPlaceholder'),
    [t],
  )
  const matches = useCallback(
    (count: number) =>
      t('postsFilter.sentence.posts', {
        count,
        formatted: formatNumber(count, {}, locale),
      }),
    [t, locale],
  )

  return useMemo<SentenceVocabulary<PostFilterField>>(
    () => ({
      fields,
      order: fields,
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
    ],
  )
}

/** The clauses the catalogue words, one per field and operator. */
type ClauseName = keyof Translation['postsFilter']['sentence']['clause']
