import { mergePageRefs, parseIdeaNote, refLabel } from '@/lib/assetAnalysis'
import type { Idea } from '@/lib/ideas'

/**
 * Where an idea came from, and the parts of it a card draws (CON-388).
 *
 * An idea arrives one of two ways: distilled from a document by its analysis
 * (CON-364), or written by a person. The card tells them apart by the slot at
 * the head of the row — a fit score for the one, the writer for the other —
 * and by its source line, so the two never need a badge.
 */

/** Whether an analysis wrote it. Everything else a person typed in. */
export function isAnalysed(idea: Pick<Idea, 'origin'>): boolean {
  return idea.origin === 'asset_analysis'
}

/** An analysed idea's three parts, the hook first. */
export type IdeaParts = {
  angle: string
  rationale: string
  /** The places it cites, merged and sorted ("pp. 5–6", not "p. 6, p. 5"). */
  sources: string[]
}

/**
 * The parts of an analysed idea: the server's split where it made one
 * (CON-389), otherwise read back out of the note, which carries the same three
 * as text — so an idea analysed before the split existed still opens to its
 * angle and its pages. A written idea has no parts; its note is just a note.
 */
export function ideaParts(idea: Idea): IdeaParts | null {
  if (!isAnalysed(idea)) return null
  const split =
    idea.angle !== undefined ||
    idea.rationale !== undefined ||
    idea.sources !== undefined
  const parts = split
    ? {
        angle: idea.angle ?? '',
        rationale: idea.rationale ?? '',
        sources: idea.sources ?? [],
      }
    : parseIdeaNote(idea.note)
  return { ...parts, sources: mergePageRefs(parts.sources) }
}

/**
 * The places an idea cites, as its source line names them: a web page by its
 * domain, anything else by its first two places in short form ("Competitors ·
 * rows 2–6", "SDLC methodology"), and how many more there are.
 */
export function citedPlace(idea: Idea): { places: string[]; more: number } {
  const domain = idea.sourceAsset?.domain
  if (domain) return { places: [domain], more: 0 }
  const sources = ideaParts(idea)?.sources ?? []
  return {
    places: sources.slice(0, 2).map(refLabel),
    more: Math.max(0, sources.length - 2),
  }
}
