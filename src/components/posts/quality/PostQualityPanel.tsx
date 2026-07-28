import { usePostAssessment } from '@/hooks/usePostAssessment.ts'
import type { Post } from '@/types/posts'
import { PostQualityPanelView } from './PostQualityPanelView.tsx'

/**
 * The "Quality" sidebar panel, wired to the API.
 *
 * Nothing but wiring lives here — every decision about what to draw is in
 * `PostQualityPanelView`, which takes its whole state as props so the design
 * harness at `/design/post-quality` can render each one.
 */
export function PostQualityPanel({ doc, onClose }: { doc: Post; onClose?: () => void }) {
  const {
    assessment,
    loading,
    unavailable,
    loadError,
    reload,
    assess,
    assessing,
    steps,
    cached,
    assessError,
  } = usePostAssessment(doc.id)

  return (
    <PostQualityPanelView
      assessment={assessment}
      // The live document's, not the stored evaluation's copy of the post:
      // this is what the staleness flag compares against, so it has to be the
      // version in the editor rather than the one the score was taken from.
      postUpdatedAt={doc.updated_at}
      loading={loading}
      unavailable={unavailable}
      loadError={loadError}
      onReload={reload}
      onAssess={assess}
      assessing={assessing}
      steps={steps}
      cached={cached}
      assessError={assessError}
      onClose={onClose}
    />
  )
}
