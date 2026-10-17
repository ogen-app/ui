import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IdeasSurface } from '@/components/ideas/IdeasSurface'
import { parseIdeaListSearch, type IdeaListSearch } from '@/lib/ideaFilter'

/**
 * Ideas — the workspace's, which is to say the ones not yet committed to a
 * campaign.
 */
export const Route = createFileRoute('/_authenticated/ideas/')({
  component: WorkspaceIdeasView,
  // The list's filter, pile, sort and grouping — the keys `GET /api/ideas`
  // takes, so the address is the request (CON-388). Read only under
  // `ideas-smart-filter`; with it off a stale link narrows nothing.
  validateSearch: parseIdeaListSearch,
})

function WorkspaceIdeasView() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  // Replaced, not pushed: each token is not a page of history.
  const onSearchChange = useCallback(
    (next: IdeaListSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  return (
    <IdeasSurface
      heading={t('nav.ideas')}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}
