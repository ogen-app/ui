import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * A calendar's search that finds nothing, on any day (CON-534). Not the
 * lists' `NoMatches`: the search is the calendar's only clause, so there is
 * one thing to take away and no sketch of a table to wash. A week with no
 * match while others have some is just an empty week.
 */
export function PostsSearchNoMatches({
  text,
  onClear,
}: {
  text: string
  onClear: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-start gap-3 px-6 py-8">
      <p className="text-sm text-foreground">
        {t('postsFilter.search.nothingMatches', { text })}
      </p>
      <Button variant="default" size="sm" onClick={onClear}>
        {t('postsFilter.search.clearSearch')}
      </Button>
    </div>
  )
}
