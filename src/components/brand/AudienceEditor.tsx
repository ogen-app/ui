import { useMemo, useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  BrandEditorFrame,
  DangerCard,
  EditorCard,
  EditorIntro,
  Field,
  ForkedNote,
} from './editor'
import {
  audienceStarterCopy,
  audienceStarterDraft,
  type AudienceStarter,
} from './AudiencesSection'
import type { BrandAudience, BrandUsage } from './types'

/**
 * One audience, being described — the second editor, and deliberately the same
 * screen as the first.
 *
 * ## Why it is not a form
 *
 * The section exists because of one failure: left to a blank box people
 * describe a fantasy. "Wealthy, successful, generous people looking for
 * somewhere to put their money" is the predictable answer to a question nobody
 * has a good way of answering, and it is in the seed data on purpose — it looks
 * like an audience, it validates, it saves, and it changes nothing about a
 * single post.
 *
 * A form cannot refuse that, and this screen does not try. What it does instead
 * is give the fantasy nowhere to go: the three consequence lines are the card
 * the screen is built around, and an audience nobody has actually looked at has
 * nothing to put in them. Three visible gaps are a better argument than a
 * validator, because they are the *user's* argument — they can see the answer
 * is missing rather than being told it is wrong.
 *
 * That is the same position the voice editor takes with samples, one section
 * over: the substance gets the biggest card, and the description is the small
 * one above it.
 *
 * ## What it shares
 *
 * The frame, the intro card, the cards, the labels, the fork note and the
 * danger zone are `editor.tsx` — see the note there. This file is the fields
 * and the words, which is what an editor should be.
 *
 * Nothing is blocked but a missing name, nothing is persisted beyond the stub
 * (CON-228), and `summary` is read off the three lines by us rather than typed,
 * so editing them invalidates it. All three are the voice editor's rules, for
 * the voice editor's reasons.
 */
export function AudienceEditor({
  header,
  audience,
  starter,
  onSave,
  onCancel,
  onDelete,
}: {
  /** The page header, rendered inside the frame's scroller. */
  header?: ReactNode
  /** The audience being edited, or `null` when describing a new one. */
  audience: BrandAudience | null
  /** The relationship this was started from, when arriving via a starter card. */
  starter?: AudienceStarter | null
  onSave?: (audience: BrandAudience) => void
  onCancel?: () => void
  /** Only offered for an audience that exists. */
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const initial = useMemo(
    () => draftFrom(t, audience, starter),
    [t, audience, starter],
  )
  const [draft, setDraft] = useState<Draft>(initial)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const named = draft.name.trim().length > 0
  const changed = linesOf(draft) !== linesOf(audience)

  return (
    <BrandEditorFrame
      header={header}
      contentKey={audience ? 'edit' : 'new'}
      blocker={named ? undefined : t('brand.audiences.editor.needsName')}
      commitLabel={
        audience
          ? t('brand.audiences.editor.save')
          : t('brand.audiences.editor.create')
      }
      onCancel={onCancel}
      onSave={() => onSave?.(assemble(t, draft, audience, starter))}
    >
      <AudienceIntro name={audience?.name} />

      {starter && !audience && (
        <ForkedNote
          icon={starter.icon}
          title={audienceStarterCopy(t, starter).title}
        >
          {t('brand.audiences.editor.forkedNote')}
        </ForkedNote>
      )}

      {/* No `DefaultControl` here, and the voice editor has one. An audience
          has no workspace default to promote it to — the resolution stops at
          the campaign. See `resolveAudience` in `binding.ts`. */}
      <EditorCard title={t('brand.audiences.editor.general')}>
        <Field label={t('brand.audiences.editor.name')}>
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={t('brand.audiences.editor.namePlaceholder')}
          />
        </Field>
        {/* Labelled by what it is for, the same way the voice editor labels its
            description: "who" invites a demographic, and what belongs here is
            the version with a habit and a suspicion in it. */}
        <Field
          label={t('brand.audiences.editor.who')}
          hint={t('brand.audiences.editor.whoHint')}
        >
          <Textarea
            value={draft.who}
            onChange={(e) => set('who', e.target.value)}
            placeholder={t('brand.audiences.editor.whoPlaceholder')}
            className="min-h-24"
          />
        </Field>
      </EditorCard>

      <ConsequencesCard
        draft={draft}
        onChange={set}
        summary={changed ? null : audience?.summary || null}
      />

      {audience && onDelete && (
        <DangerCard
          noun={t('brand.audiences.editor.noun')}
          name={audience.name}
          cost={deletionCost(t, audience.usage)}
          onDelete={onDelete}
        />
      )}
    </BrandEditorFrame>
  )
}

/**
 * The card the screen is built around — what follows from who they are.
 *
 * Three lines, and they are the whole design position. A label ("high net
 * worth") can be written by anybody about anybody; where somebody reads, what
 * loses them, and what they need before they believe a number can only be
 * written by somebody who has looked. So the labels do the work a validator
 * cannot: the fantasy answer is visibly useless here, because it has nothing to
 * put in three lines it can plainly see are empty.
 *
 * The reading goes on top in the foreground colour, exactly where the samples
 * card puts its own — and the description under it survives only while the
 * lines are incomplete, which is exactly when somebody still needs telling what
 * this card is for.
 */
function ConsequencesCard({
  draft,
  onChange,
  summary,
}: {
  draft: Draft
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void
  /** Our reading of these three lines, or `null` once they have moved under it. */
  summary: string | null
}) {
  const { t } = useTranslation()
  const blank = !draft.readsOn && !draft.scrollsPastWhen && !draft.believesWhen
  const incomplete =
    !draft.readsOn || !draft.scrollsPastWhen || !draft.believesWhen

  return (
    <EditorCard
      title={t('brand.audiences.editor.consequences')}
      hint={
        <>
          {summary ? (
            <span>
              <span className="text-primary-foreground">
                {t('brand.audiences.editor.readsAs')}
              </span>{' '}
              {summary}
            </span>
          ) : (
            !incomplete && (
              <span>{t('brand.audiences.editor.summaryPending')}</span>
            )
          )}
          {incomplete && (
            <span>{t('brand.audiences.editor.consequencesHint')}</span>
          )}
        </>
      }
    >
      {blank && (
        <p className="border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
          {t('brand.audiences.editor.blank')}
        </p>
      )}

      <Field
        label={t('brand.audiences.editor.readsOnLabel')}
        hint={t('brand.audiences.editor.readsOnHint')}
      >
        <Input
          value={draft.readsOn}
          onChange={(e) => onChange('readsOn', e.target.value)}
          placeholder={t('brand.audiences.editor.readsOnPlaceholder')}
        />
      </Field>
      <Field
        label={t('brand.audiences.editor.scrollsPastLabel')}
        hint={t('brand.audiences.editor.scrollsPastHint')}
      >
        <Input
          value={draft.scrollsPastWhen}
          onChange={(e) => onChange('scrollsPastWhen', e.target.value)}
          placeholder={t('brand.audiences.editor.scrollsPastPlaceholder')}
        />
      </Field>
      <Field
        label={t('brand.audiences.editor.believesLabel')}
        hint={t('brand.audiences.editor.believesHint')}
      >
        <Input
          value={draft.believesWhen}
          onChange={(e) => onChange('believesWhen', e.target.value)}
          placeholder={t('brand.audiences.editor.believesPlaceholder')}
        />
      </Field>
    </EditorCard>
  )
}

/** See `EditorIntro`. The saved name, never the draft's. */
function AudienceIntro({ name }: { name?: string }) {
  const { t } = useTranslation()
  return (
    <EditorIntro
      section="audiences"
      // The name is spliced by the catalogue rather than here: "X Audience" is
      // an English word order, and Spanish puts the noun first.
      title={
        name
          ? t('brand.audiences.editor.introNamed', { name })
          : t('brand.audiences.editor.introNew')
      }
      body={t('brand.audiences.editor.introBody')}
    />
  )
}

/* ---------------------------------------------------------------- the draft */

type Draft = Pick<
  BrandAudience,
  'name' | 'who' | 'readsOn' | 'scrollsPastWhen' | 'believesWhen'
>

function draftFrom(
  t: TFunction,
  audience: BrandAudience | null,
  starter?: AudienceStarter | null,
): Draft {
  if (audience) {
    return {
      name: audience.name,
      who: audience.who,
      readsOn: audience.readsOn,
      scrollsPastWhen: audience.scrollsPastWhen,
      believesWhen: audience.believesWhen,
    }
  }
  // A starter hands over its name and nothing else — see `audienceStarterDraft`.
  return {
    name: starter ? audienceStarterDraft(t, starter).name : '',
    who: '',
    readsOn: '',
    scrollsPastWhen: '',
    believesWhen: '',
  }
}

/**
 * The three consequence lines as one string, for asking whether they have
 * moved. Only the three: renaming an audience or rewording its description does
 * not invalidate a reading that was taken off the consequences.
 */
function linesOf(entry: Draft | BrandAudience | null): string {
  if (!entry) return ''
  return [entry.readsOn, entry.scrollsPastWhen, entry.believesWhen].join(
    '\u0000',
  )
}

/**
 * The draft as a whole audience, for the caller to store.
 *
 * `summary` is cleared whenever the three lines have moved, rather than carried
 * forward: it is our reading of them, and a reading of text that no longer
 * exists is worse than none.
 *
 * The id is `''` for an audience that has never been stored — ids are the
 * server's (CON-228), so a create is a `POST` with no id.
 */
function assemble(
  t: TFunction,
  draft: Draft,
  audience: BrandAudience | null,
  starter?: AudienceStarter | null,
): BrandAudience {
  const changed = linesOf(draft) !== linesOf(audience)
  return {
    id: audience?.id ?? '',
    ...draft,
    summary: changed ? '' : (audience?.summary ?? ''),
    usage: audience?.usage ?? { drafts: 0, published: 0 },
    origin:
      audience?.origin ??
      (starter
        ? {
            kind: 'template',
            templateName: audienceStarterCopy(t, starter).title,
          }
        : { kind: 'blank' }),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * What deleting this audience costs, in the numbers this audience has.
 *
 * Each count is a whole sentence per plural form rather than a stem with
 * `post was`/`posts were` spliced into it: English happens to change two words
 * there and other languages change others, so the fragment that used to be
 * chosen here is the translator's to write out in full.
 */
function deletionCost(t: TFunction, usage: BrandUsage): string {
  const { published, drafts } = usage
  if (published > 0) {
    return t('brand.audiences.editor.deleteCostPublished', {
      count: published,
    })
  }
  if (drafts > 0) {
    return t('brand.audiences.editor.deleteCostDrafts', { count: drafts })
  }
  return t('brand.audiences.editor.deleteCostNone')
}
