import { useMemo } from 'react'
import type { Post } from '@/types/posts'
import type { ValidationReport } from '@/types/validation'
import { usePostTypeRules } from '@/hooks/usePostTypeRules'
import { evaluatePost } from '@/lib/postValidation'
import { getCharLimit } from '@/lib/platformLimits'

// Live, client-side validation for the post being edited. Rules come
// from the backend (post-type-rules); character limits are
// frontend-owned for now (see platformLimits.ts). Re-evaluates as the
// content / platform / post type change. Tolerates a not-yet-loaded
// doc so it can be called before the editor's loading guard.
export function usePostValidation(doc: Post | null | undefined): ValidationReport {
  const { data: rules } = usePostTypeRules(doc?.platform_id)

  return useMemo<ValidationReport>(() => {
    if (!doc) return { checks: [], overall: 'pass' }
    const view = rules?.find((r) => r.slug === doc.platform_post_type)
    return evaluatePost({
      contentText: doc.content,
      // No attachment UI yet — attachment-dependent checks surface as
      // pending. Wire real values here once attachments land.
      attachmentCount: 0,
      attachmentKinds: [],
      rule: view?.rule ?? null,
      charLimit: doc.platform_id ? getCharLimit(doc.platform_id) : undefined,
    })
  }, [rules, doc?.platform_post_type, doc?.content, doc?.platform_id])
}
