import { useMemo, useState, type ReactNode } from 'react'
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
import type { AudienceStarter } from './AudiencesSection'
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
  const initial = useMemo(() => draftFrom(audience, starter), [audience, starter])
  const [draft, setDraft] = useState<Draft>(initial)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const named = draft.name.trim().length > 0
  const changed = linesOf(draft) !== linesOf(audience)

  return (
    <BrandEditorFrame
      header={header}
      contentKey={audience ? 'edit' : 'new'}
      blocker={named ? undefined : 'Needs a name before it can be saved.'}
      commitLabel={audience ? 'Save audience' : 'Create audience'}
      onCancel={onCancel}
      onSave={() => onSave?.(assemble(draft, audience, starter))}
    >
      <AudienceIntro name={audience?.name} />

      {starter && !audience && (
        <ForkedNote icon={starter.icon} title={starter.title}>
          Nothing is saved yet, and the three lines below are blank: a template
          knows which relationship you mean, and nothing whatever about the
          people in it.
        </ForkedNote>
      )}

      <EditorCard title="General">
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Sceptical index holders"
          />
        </Field>
        {/* Labelled by what it is for, the same way the voice editor labels its
            description: "who" invites a demographic, and what belongs here is
            the version with a habit and a suspicion in it. */}
        <Field
          label="Who they are"
          hint="Concrete and narrowing. An age, a habit and a suspicion — not “professionals”."
        >
          <Textarea
            value={draft.who}
            onChange={(e) => set('who', e.target.value)}
            placeholder="Retail investors, 30–45, already hold index funds, distrust anything that sounds like a pitch, read on a phone in the evening."
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
          noun="AUDIENCE"
          name={audience.name}
          cost={deletionCost(audience.usage)}
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
  const blank = !draft.readsOn && !draft.scrollsPastWhen && !draft.believesWhen
  const incomplete =
    !draft.readsOn || !draft.scrollsPastWhen || !draft.believesWhen

  return (
    <EditorCard
      title="What follows"
      hint={
        <>
          {summary ? (
            <span>
              <span className="text-primary-foreground">Reads as</span> {summary}
            </span>
          ) : (
            !incomplete && <span>Read back off these three once this is saved.</span>
          )}
          {incomplete && (
            <span>
              The three things that change what gets written. An audience that
              cannot answer them is a label, and a label moves nothing.
            </span>
          )}
        </>
      }
    >
      {blank && (
        <p className="border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
          Nothing yet. Saved like this the audience is a label, and not one
          post will come out differently because it exists.
        </p>
      )}

      <Field
        label="Reads on"
        hint="Where, on what, and at what hour. Half of what you would otherwise post is ruled out by this line alone."
      >
        <Input
          value={draft.readsOn}
          onChange={(e) => onChange('readsOn', e.target.value)}
          placeholder="Phone, after 8pm, one-handed"
        />
      </Field>
      <Field
        label="Scrolls past when"
        hint="The line that loses them — worth writing as the sentence they would actually see."
      >
        <Input
          value={draft.scrollsPastWhen}
          onChange={(e) => onChange('scrollsPastWhen', e.target.value)}
          placeholder='The first line contains a percentage or the word "opportunity"'
        />
      </Field>
      <Field
        label="Believes you when"
        hint="What has to sit next to a claim before they will accept it."
      >
        <Input
          value={draft.believesWhen}
          onChange={(e) => onChange('believesWhen', e.target.value)}
          placeholder="The number comes with the period it was measured over"
        />
      </Field>
    </EditorCard>
  )
}

/** See `EditorIntro`. The saved name, never the draft's. */
function AudienceIntro({ name }: { name?: string }) {
  return (
    <EditorIntro
      section="audiences"
      title={name ? `${name} Audience` : 'A new audience'}
      body="One relationship, described concretely enough to be wrong about. The three lines further down are what make it usable — where they read, what loses them, and what they need before they believe a number."
    />
  )
}

/* ---------------------------------------------------------------- the draft */

type Draft = Pick<
  BrandAudience,
  'name' | 'who' | 'readsOn' | 'scrollsPastWhen' | 'believesWhen'
>

function draftFrom(
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
  // A starter hands over its name and nothing else — see `AudienceStarter`.
  return {
    name: starter?.draft.name ?? '',
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
  return [entry.readsOn, entry.scrollsPastWhen, entry.believesWhen].join('\u0000')
}

/**
 * The draft as a whole audience, for the caller to store.
 *
 * `summary` is cleared whenever the three lines have moved, rather than carried
 * forward: it is our reading of them, and a reading of text that no longer
 * exists is worse than none.
 */
function assemble(
  draft: Draft,
  audience: BrandAudience | null,
  starter?: AudienceStarter | null,
): BrandAudience {
  const changed = linesOf(draft) !== linesOf(audience)
  return {
    id: audience?.id ?? crypto.randomUUID(),
    ...draft,
    summary: changed ? '' : (audience?.summary ?? ''),
    usage: audience?.usage ?? { drafts: 0, published: 0 },
    origin:
      audience?.origin ??
      (starter
        ? { kind: 'template', templateName: starter.title }
        : { kind: 'blank' }),
    updatedAt: new Date().toISOString(),
  }
}

/** What deleting this audience costs, in the numbers this audience has. */
function deletionCost(usage: BrandUsage): string {
  const { published, drafts } = usage
  if (published > 0) {
    return `${published} published ${published === 1 ? 'post was' : 'posts were'} written for this audience. Deleting it leaves them exactly as they are — their text was written and it stands — but nothing new can be written to it, and any campaign pointing here falls back to no audience at all.`
  }
  if (drafts > 0) {
    return `${drafts} ${drafts === 1 ? 'draft points' : 'drafts point'} at this audience and will fall back to no audience at all.`
  }
  return 'Nothing has been written for this audience, so nothing else changes.'
}
