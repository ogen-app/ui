// Frontend mirror of the backend's per-content-type validation rules
// (`platforms.PostTypeRuleView`, exposed at
// `GET /api/platforms/{id}/post-type-rules`) plus the client-side
// evaluation result shapes used by the Validations panel and rail
// indicator.

// Structural rule for one post-type slug, with the platform's
// per-kind attachment cap already resolved server-side.
// `max_attachments === null` means "unbounded by this rule".
export type ResolvedPostTypeRule = {
  requires_content: boolean
  allowed_kinds: string[]
  min_attachments: number
  max_attachments: number | null
}

// One entry in the post-type-rules response. `rule` is null for
// whitelist-only slugs (e.g. live-video, event) the platform accepts
// but enforces no structural rules on.
export type PostTypeRuleView = {
  slug: string
  label: string
  whitelist_only: boolean
  rule: ResolvedPostTypeRule | null
}

// Roll-up severity of a validation report. 'pending' checks roll up
// into 'warning'. Callers map this onto a UI tone where needed (e.g.
// the rail indicator).
export type ValidationSeverity = 'error' | 'warning'

// Outcome of a single check.
//  pass    — requirement satisfied
//  warning — soft issue (e.g. approaching a limit)
//  error   — blocking failure
//  pending — cannot be evaluated yet (e.g. needs the attachment UI)
export type ValidationLevel = 'pass' | 'warning' | 'error' | 'pending'

export type ValidationCheck = {
  id: string
  label: string
  // Supporting text, e.g. "1,240 / 3,000 characters".
  detail?: string
  level: ValidationLevel
}

export type ValidationReport = {
  checks: ValidationCheck[]
  // Highest severity across all checks, or 'pass' when everything
  // passes. Drives the rail indicator.
  overall: 'pass' | ValidationSeverity
}
