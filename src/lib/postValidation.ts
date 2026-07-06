// Pure, client-side validation engine. Given a post's content +
// attachments and the platform's resolved post-type rule, it produces
// the list of checks rendered by the Validations panel and the
// roll-up severity driving the rail indicator. No React, no I/O — easy
// to unit test.

import type {
  ResolvedPostTypeRule,
  ValidationCheck,
  ValidationLevel,
  ValidationReport,
  ValidationSeverity,
} from '@/types/validation'

const CHAR_WARN_RATIO = 0.9

// Approximate plain-text projection of BlockNote markdown so character
// counts track what a reader sees rather than the markup. Conservative
// on purpose — it strips formatting markers without mangling words.
export function toPlainText(markdown: string): string {
  return (markdown ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^\s*[-*+]\s+/gm, '') // bullet list markers
    .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
    .replace(/^\s*>\s?/gm, '') // blockquotes
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$2') // strikethrough
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/\r/g, '')
}

export function plainTextLength(markdown: string): number {
  return toPlainText(markdown).trim().length
}

function fmt(n: number): string {
  return n.toLocaleString()
}

const KIND_LABEL: Record<string, string> = {
  image: 'image',
  video: 'video',
  pdf: 'PDF',
}

function kindList(kinds: string[]): string {
  const labels = kinds.map((k) => KIND_LABEL[k] ?? k)
  if (labels.length === 0) return 'attachment'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

// True when the post type involves attachments at all — used to skip
// attachment/media rows for text-only types.
function involvesAttachments(rule: ResolvedPostTypeRule): boolean {
  return (
    rule.min_attachments > 0 ||
    rule.allowed_kinds.length > 0 ||
    (rule.max_attachments != null && rule.max_attachments > 0)
  )
}

export type EvaluatePostInput = {
  contentText: string // raw markdown (doc.content)
  attachmentCount: number
  attachmentKinds: string[]
  rule: ResolvedPostTypeRule | null
  charLimit?: number
}

const SEVERITY_RANK: Record<ValidationLevel, number> = {
  error: 3,
  warning: 2,
  pending: 2,
  pass: 0,
}

function rollUp(checks: ValidationCheck[]): 'pass' | ValidationSeverity {
  let worst = 0
  for (const c of checks) worst = Math.max(worst, SEVERITY_RANK[c.level])
  if (worst >= 3) return 'error'
  if (worst >= 2) return 'warning'
  return 'pass'
}

export function evaluatePost(input: EvaluatePostInput): ValidationReport {
  const checks: ValidationCheck[] = []
  const len = plainTextLength(input.contentText)
  const rule = input.rule

  // 1. Content required
  if (rule?.requires_content) {
    checks.push({
      id: 'content-required',
      label: 'Content required',
      detail: len > 0 ? undefined : 'Add text to this post',
      level: len > 0 ? 'pass' : 'error',
    })
  }

  // 2. Character limit (frontend-owned until the backend encodes it)
  if (input.charLimit != null) {
    const limit = input.charLimit
    const over = len > limit
    const near = !over && len >= Math.floor(limit * CHAR_WARN_RATIO)
    const level: ValidationLevel = over ? 'error' : near ? 'warning' : 'pass'
    checks.push({
      id: 'char-limit',
      label: 'Character limit',
      detail: `${fmt(len)} / ${fmt(limit)} characters`,
      level,
    })
  }

  // 3 + 4. Attachments — count/kind and per-file media rules. No
  // attachment UI exists yet, so these surface as pending rather than
  // hard failures. Tracked in CON-91.
  if (rule && involvesAttachments(rule)) {
    const min = rule.min_attachments
    const max = rule.max_attachments
    const count = input.attachmentCount
    const need = kindList(rule.allowed_kinds)

    const range =
      max == null
        ? `${min}+`
        : min === max
          ? `${min}`
          : `${min}–${max}`

    let level: ValidationLevel
    let detail: string
    if (count === 0 && min > 0) {
      level = 'pending'
      detail = `Needs ${range} ${need} · upload coming soon`
    } else if (max != null && count > max) {
      level = 'error'
      detail = `${count} / ${max} ${need} — too many`
    } else if (count < min) {
      level = 'error'
      detail = `${count} / ${range} ${need}`
    } else {
      level = 'pass'
      detail = `${count} ${need}${max != null ? ` / ${max}` : ''}`
    }
    checks.push({ id: 'attachment-count', label: 'Attachments', detail, level })

    checks.push({
      id: 'media-rules',
      label: 'Media file rules',
      detail: 'Size & format checks · pending attachment support',
      level: 'pending',
    })
  }

  return { checks, overall: rollUp(checks) }
}
