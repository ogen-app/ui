/**
 * Save a document as a `.md` file, from the browser.
 *
 * Shared by the post editor and a campaign's document editor: both already
 * hold their text as markdown, so downloading is a blob and a synthetic click
 * — no request, and nothing the server has to know about.
 */
export function downloadMarkdown(
  title: string,
  content: string,
  /** Filename for an untitled document. */
  fallbackName = 'document',
): void {
  const trimmed = title.trim()
  // The title is the app's label for the document, not part of its body, so
  // the file has to carry it explicitly or it leaves with no name inside it.
  const markdown = trimmed ? `# ${trimmed}\n\n${content}` : content
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(trimmed) || fallbackName}.md`
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
