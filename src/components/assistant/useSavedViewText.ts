import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFilterVocabulary } from '@/components/content/smartFilter/useFilterVocabulary'
import { ASSET_MODEL } from '@/components/content/smartFilter/assetModel'
import { useIdeaVocabulary } from '@/components/ideas/query/useIdeaVocabulary'
import { filterFromSearch, searchFromAssetViewQuery } from '@/lib/assetFilter'
import {
  IDEA_FILTER_MODEL,
  NONE,
  ideaFilterFromSearch,
  searchFromViewQuery,
  type IdeaFilter,
  type IdeaFilterField,
} from '@/lib/ideaFilter'
import { formatList } from '@/lib/intl'
import {
  ledBySubject,
  orderedTokens,
  type FilterModel,
  type SentenceVocabulary,
} from '@/lib/smartFilter'

const NO_FACETS = {}
const NO_SOURCES: never[] = []

/**
 * A smart group's filter as one line of plain words (CON-476): "PDFs, in
 * Spring reopening", "Documents not analysed yet". The clauses are the list's
 * own sentence — its vocabulary, its order, its subject — read off the stored
 * query, so the card and the list say the same thing. Never counts: the card
 * carries no facets, and a group's count is the server's.
 *
 * Both lists' vocabularies are read, because a hook can't be chosen by the
 * list a result names; each is a page of cached lookups (campaigns, tags,
 * members) the rail has usually loaded already.
 */
export function useSavedViewText(): (
  list: 'assets' | 'ideas',
  query: string,
) => string | null {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const assets = useFilterVocabulary({ facets: NO_FACETS, scoped: false })
  const ideas = useIdeaVocabulary({
    facets: NO_FACETS,
    sourceLabels: NO_SOURCES,
    scoped: false,
  })

  return useCallback(
    (list, query) => {
      if (!query) return null
      const read =
        list === 'assets'
          ? clauses(
              ASSET_MODEL,
              filterFromSearch(searchFromAssetViewQuery(query)),
              assets,
              locale,
            )
          : ideaClauses(
              ideaFilterFromSearch(searchFromViewQuery(query)),
              ideas,
              locale,
            )
      if (!read) return null
      if (read.led)
        return t('assistant.assets.views.sentenceSubject', {
          clauses: read.text,
        })
      return list === 'assets'
        ? t('assistant.assets.views.sentenceAssets', { clauses: read.text })
        : t('assistant.assets.views.sentenceIdeas', { clauses: read.text })
    },
    [t, locale, assets, ideas],
  )
}

/**
 * An ideas group narrowed to particular documents. The card has no titles for
 * them — the Ideas list reads its own from the page it loaded — so it would
 * say "unknown document"; the group is described by its count instead.
 */
function ideaClauses(
  filter: IdeaFilter,
  vocab: SentenceVocabulary<IdeaFilterField>,
  locale: string,
) {
  const { any, not } = filter.source_asset
  if ([...any, ...not].some((id) => id !== NONE)) return null
  return clauses(IDEA_FILTER_MODEL, filter, vocab, locale)
}

function clauses<F, Field extends string>(
  model: FilterModel<F, Field>,
  filter: F,
  vocab: SentenceVocabulary<Field>,
  locale: string,
): { led: boolean; text: string } | null {
  const tokens = orderedTokens(model, filter, vocab)
  if (tokens.length === 0) return null
  return {
    led: ledBySubject(tokens, vocab.subject),
    text: formatList(tokens.map(vocab.tokenText), 'unit', locale),
  }
}
