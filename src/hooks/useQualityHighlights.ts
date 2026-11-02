import { useCallback, useEffect, useMemo, useState } from 'react'
import { postSuggestions } from '@/lib/postQuality.ts'
import {
  findSpan,
  mapRangeThroughEdit,
  type SpanRange,
  type SpanStatus,
} from '@/lib/qualityHighlights.ts'
import type { HighlightSpan } from '@/components/posts/quality/highlightPlugin.ts'
import type { PostEvaluation, QualitySeverity } from '@/types/quality'

/** A suggestion's span found in the title, carried through the title's edits. */
export type TitleMark = SpanRange & {
  index: number
  severity: QualitySeverity
  edited: boolean
}

/**
 * One opening of the panel on one run. Everything a highlight remembers lives
 * here, so closing the panel or a new run forgets all of it at once.
 */
type Session = {
  key: string
  /** Which suggestions were looked for in the body — found in the title or not. */
  body: HighlightSpan[]
  title: string
  titleMarks: TitleMark[]
  /** Title matches an edit removed entirely. */
  titleLost: number[]
  chosen: number | null
}

function startSession(
  key: string,
  evaluation: PostEvaluation,
  title: string,
): Session {
  const body: HighlightSpan[] = []
  const titleMarks: TitleMark[] = []
  postSuggestions(evaluation).forEach((s, index) => {
    const range = s.span ? findSpan(title, s.span) : null
    if (range) {
      titleMarks.push({ ...range, index, severity: s.severity, edited: false })
    } else {
      body.push({ index, span: s.span ?? '', severity: s.severity })
    }
  })
  return { key, body, title, titleMarks, titleLost: [], chosen: null }
}

function followTitle(session: Session, title: string): Session {
  const titleMarks: TitleMark[] = []
  const titleLost = [...session.titleLost]
  for (const mark of session.titleMarks) {
    const { range, touched } = mapRangeThroughEdit(session.title, title, mark)
    if (range) {
      titleMarks.push({ ...mark, ...range, edited: mark.edited || touched })
    } else {
      titleLost.push(mark.index)
    }
  }
  return { ...session, title, titleMarks, titleLost }
}

/**
 * The quality panel's marks in the post (CON-441), owned by the post page
 * because it holds both ends: the title and the body the marks sit in, and
 * the assessment and the open panel they come from.
 *
 * While the panel is open, each suggestion's span is looked for once — in the
 * title first, then in the body — and from then on followed through the
 * author's edits rather than looked for again, so text typed over a span
 * reads as edited instead of the mark jumping to another match.
 */
export function useQualityHighlights({
  assessment,
  open,
  title,
}: {
  assessment: PostEvaluation | null | undefined
  open: boolean
  title: string
}) {
  const key =
    open && assessment ? `${assessment.id}:${assessment.updated_at}` : null

  const [session, setSession] = useState<Session | null>(null)
  // Derived during render: a new run or a reopened panel starts over, and a
  // title edit carries the title's marks with it.
  if ((session?.key ?? null) !== key) {
    setSession(key && assessment ? startSession(key, assessment, title) : null)
  } else if (session && session.title !== title) {
    setSession(followTitle(session, title))
  }

  const [body, setBody] = useState<{
    key: string
    statuses: Record<number, SpanStatus>
  } | null>(null)

  const onBodyStatus = useCallback(
    (statuses: Record<number, SpanStatus>) => {
      if (key) setBody({ key, statuses })
    },
    [key],
  )

  // A row in the list toggles; a click in the post only ever picks, since the
  // author clicking into a chosen span is about to edit it, not let go of it.
  const toggle = useCallback((index: number) => {
    setSession((s) =>
      s ? { ...s, chosen: s.chosen === index ? null : index } : s,
    )
  }, [])
  const pick = useCallback((index: number) => {
    setSession((s) => (s && s.chosen !== index ? { ...s, chosen: index } : s))
  }, [])

  const clear = useCallback(() => {
    setSession((s) => (s && s.chosen !== null ? { ...s, chosen: null } : s))
  }, [])

  const chosen = session?.chosen ?? null
  // Esc lets go of the chosen span, wherever focus is. Anything that already
  // used the key — a dialog, the radar's guide — has said so.
  useEffect(() => {
    if (chosen === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) clear()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chosen, clear])

  const statuses = useMemo(() => {
    if (!session) return [] as (SpanStatus | undefined)[]
    const out: (SpanStatus | undefined)[] = []
    for (const mark of session.titleMarks) {
      out[mark.index] = mark.edited ? 'edited' : 'marked'
    }
    for (const index of session.titleLost) out[index] = 'edited'
    if (body?.key === session.key) {
      for (const s of session.body) out[s.index] = body.statuses[s.index]
    }
    return out
  }, [session, body])

  return {
    /** Whether the panel is open on a run, so there is anything to mark. */
    active: session !== null,
    chosen,
    toggle,
    pick,
    statuses,
    /** For the body editor: stable for the whole session. */
    bodySpans: session?.body ?? null,
    onBodyStatus,
    titleMarks: session?.titleMarks ?? [],
  }
}
