import type { TFunction } from 'i18next'
import { formatList } from '@/lib/intl'
import type { SavedReceipt } from '@/stores/brandDistillStore'
import type {
  DistillAnswer,
  DistillEvidence,
  DistillQuestion,
  DistillRun,
} from '@/types/brandDistill'
import { runRoute, siteHost } from './brandDistill'

/**
 * The words a brand read (CON-400) puts together out of its data: where an
 * item came from, a question in the reader's language, the run's source, the
 * receipt of a save. Pure functions that take `t` first, like
 * `components/analytics/format.ts`, so a component and a test can both call
 * them and neither holds a frozen label.
 */

/**
 * Where one piece of evidence came from: the page or the file, or the question
 * an answer was given to.
 */
export function evidenceLabel(
  t: TFunction,
  evidence: DistillEvidence,
  answers: DistillAnswer[],
): string {
  if (evidence.kind === 'answer') {
    const question = answers.find(
      (a) => a.questionId === evidence.questionId,
    )?.question
    return question
      ? t('brand.distill.source.answerTo', { question: trimQuestion(question) })
      : t('brand.distill.source.answer')
  }
  return evidence.label ?? ''
}

/** "Who are you not for?" reads as `your answer to "who are you not for"`. */
function trimQuestion(question: string): string {
  const bare = question.trim().replace(/[?.!]+$/, '')
  return bare.charAt(0).toLowerCase() + bare.slice(1)
}

/**
 * A starter question in the reader's language, by its stable id; one this
 * build has never heard of keeps the server's own words.
 */
export function questionText(t: TFunction, question: DistillQuestion): string {
  return STARTER_IDS.includes(question.id)
    ? t(`brand.distill.questions.starter.${question.id as StarterId}`)
    : question.text
}

const STARTER_IDS: string[] = [
  'q_offer',
  'q_three_words',
  'q_never_post',
  'q_not_for',
  'q_proof',
  'q_legal',
  'q_disclaimer',
] satisfies StarterId[]

type StarterId =
  | 'q_offer'
  | 'q_three_words'
  | 'q_never_post'
  | 'q_not_for'
  | 'q_proof'
  | 'q_legal'
  | 'q_disclaimer'

/** The answers worth sending: blank ones are skipped questions. */
export function filledAnswers(
  t: TFunction,
  questions: DistillQuestion[],
  values: Record<string, string>,
): DistillAnswer[] {
  return questions
    .filter((q) => (values[q.id] ?? '').trim() !== '')
    .map((q) => ({
      questionId: q.id,
      question: questionText(t, q),
      answer: values[q.id].trim(),
    }))
}

/** The run's source, as the saved receipt and the page title name it. */
export function sourceLabel(t: TFunction, run: DistillRun): string {
  const route = runRoute(run)
  if (route === 'website' && run.website) return siteHost(run.website.url)
  if (route === 'document')
    return run.sources.length === 1
      ? run.sources[0].title
      : t('brand.distill.summary.files', { count: run.sources.length })
  return ''
}

/**
 * "1 voice, 1 audience, 9 guardrail lines and 12 facts, read off
 * acme-roasters.com. 2 facts were already in your ledger, so they were left as
 * they were."
 *
 * Counted from the commit's answer rather than from what was sent: a line the
 * server declined is not a line that was saved.
 */
export function savedSentence(
  t: TFunction,
  saved: SavedReceipt,
  locale: string,
): string {
  const { applied, skipped } = saved.result
  const lines = applied.guardrails.filter(
    (id) => id.startsWith('g:mayClaim') || id.startsWith('g:neverClaim'),
  ).length
  const words = applied.guardrails.filter((id) =>
    id.startsWith('g:bannedWords'),
  ).length
  const disclaimer = applied.guardrails.includes('g:disclaimer')

  const parts = [
    applied.voices.length > 0 &&
      t('brand.distill.count.voices', { count: applied.voices.length }),
    applied.audiences.length > 0 &&
      t('brand.distill.count.audiences', { count: applied.audiences.length }),
    lines > 0 && t('brand.distill.count.lines', { count: lines }),
    words > 0 && t('brand.distill.count.words', { count: words }),
    disclaimer && t('brand.distill.count.disclaimer'),
    applied.facts.length > 0 &&
      t('brand.distill.count.facts', { count: applied.facts.length }),
  ].filter((p): p is string => Boolean(p))

  const what =
    parts.length > 0
      ? formatList(parts, 'conjunction', locale)
      : t('brand.distill.saved.nothing')
  const from =
    saved.source.route === 'website'
      ? t('brand.distill.saved.fromWebsite', { what, site: saved.source.label })
      : saved.source.route === 'document'
        ? t('brand.distill.saved.fromDocument', {
            what,
            title: saved.source.label,
          })
        : t('brand.distill.saved.fromAnswers', { what })

  const duplicateFacts = skipped.filter(
    (s) => s.reason === 'duplicate' && s.proposalId.startsWith('f'),
  ).length
  const duplicateOther = skipped.filter(
    (s) => s.reason === 'duplicate' && !s.proposalId.startsWith('f'),
  ).length
  const overLimit = skipped.filter((s) => s.reason !== 'duplicate').length

  return [
    from,
    duplicateFacts > 0 &&
      t('brand.distill.saved.duplicateFacts', { count: duplicateFacts }),
    duplicateOther > 0 &&
      t('brand.distill.saved.duplicateItems', { count: duplicateOther }),
    overLimit > 0 && t('brand.distill.saved.overLimit', { count: overLimit }),
  ]
    .filter(Boolean)
    .join(' ')
}
