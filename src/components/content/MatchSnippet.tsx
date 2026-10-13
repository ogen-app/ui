import { useTranslation } from 'react-i18next'
import { snippetParts } from '@/lib/snippet'
import type { AssetTextMatch } from '@/types/assetList'

/**
 * Where a row matched a "Text mentions" search (CON-371): the passage with the
 * words highlighted, and where in the source it sits ("Page 14", "1:05–1:40").
 *
 * The server sends the passage HTML-escaped with `<mark>` around each matched
 * word. It is parsed into text rather than set as HTML, so nothing a document
 * contains can ever reach the page as markup.
 */
export function MatchSnippet({ match }: { match: AssetTextMatch }) {
  const { t } = useTranslation()
  const parts = snippetParts(match.snippet)
  return (
    <span className="text-[13px] leading-5 text-secondary-foreground">
      {match.source_label && (
        <span className="mr-1.5 text-tertiary-foreground">
          {t('content.filter.matchAt', { place: match.source_label })}
        </span>
      )}
      {parts.map((part, i) =>
        part.marked ? (
          <mark
            key={i}
            className="bg-warning/20 px-0.5 font-medium text-foreground"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  )
}
