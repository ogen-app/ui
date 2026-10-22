import { useState, type ReactNode } from 'react'
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  StarIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { brandSection, brandSectionCopy } from '@/lib/brandSections'
import {
  audienceDraft,
  isDropped,
  toggleDropped,
  voiceDraft,
  type AudienceDraft,
  type DistillReview,
  type VoiceDraft,
} from '@/lib/brandDistill'
import type {
  DistillAnswer,
  ProposedAudience,
  ProposedVoice,
} from '@/types/brandDistill'
import { Field } from '../editor'
import { rulesLine } from '../format'
import { SampleCard } from '../SampleCard'
import { MIN_VOICE_SAMPLES } from '../types'
import { KeepDrop, ReviewSection, SourceLabel } from './parts'

/**
 * The big items of a review — voices and audiences — each a card's worth, kept
 * or dropped with the ideas inbox's answer group, and folded to one line with
 * an UNDO when dropped (CON-400 boards 3 and 4B).
 *
 * They are drawn the way the library draws them, so what is proposed already
 * looks like where it will live: a voice is its samples as pages with the
 * corner turned, an audience is its three consequence lines against 144px
 * terms.
 */

type Update = (update: (review: DistillReview) => DistillReview) => void

/** Where the material came from, in the words the voice's count line uses. */
export type SourceNoun = 'site' | 'files' | 'answers'

export function VoicesReview({
  voices,
  review,
  update,
  answers,
  hasVoices,
  sourceNoun,
}: {
  voices: ProposedVoice[]
  review: DistillReview
  update: Update
  answers: DistillAnswer[]
  /** Whether the workspace has voices already — decides the default. */
  hasVoices: boolean
  sourceNoun: SourceNoun
}) {
  const { t } = useTranslation()
  const info = brandSection('voices')
  return (
    <ReviewSection
      icon={info.icon}
      tone={info.tone}
      title={brandSectionCopy(t, 'voices').label}
      qualifier={
        hasVoices
          ? t('brand.distill.review.proposed', { count: voices.length })
          : t('brand.distill.review.proposedNoneYet', { count: voices.length })
      }
    >
      <Stack>
        {voices.map((voice) =>
          isDropped(review, voice.proposalId) ? (
            <DroppedLine
              key={voice.proposalId}
              name={voiceDraft(voice, review).name}
              onUndo={() => update((r) => toggleDropped(r, voice.proposalId))}
            />
          ) : (
            <VoiceProposal
              key={voice.proposalId}
              voice={voice}
              review={review}
              update={update}
              answers={answers}
              // The commit makes a proposed default the workspace's only when
              // it has none; with voices already, the flag is ignored and the
              // star would promise something the save will not do.
              becomesDefault={voice.isDefault && !hasVoices}
              sourceNoun={sourceNoun}
            />
          ),
        )}
      </Stack>
    </ReviewSection>
  )
}

function VoiceProposal({
  voice,
  review,
  update,
  answers,
  becomesDefault,
  sourceNoun,
}: {
  voice: ProposedVoice
  review: DistillReview
  update: Update
  answers: DistillAnswer[]
  becomesDefault: boolean
  sourceNoun: SourceNoun
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const draft = voiceDraft(voice, review)
  const set = (patch: Partial<VoiceDraft>) =>
    update((r) => ({
      ...r,
      voices: {
        ...r.voices,
        [voice.proposalId]: { ...r.voices[voice.proposalId], ...patch },
      },
    }))

  // A sample is proposed with its evidence; one the user added has none and
  // is theirs. Matched by position, since the proposal's come first.
  const evidenceAt = (i: number) => voice.samples[i]?.evidence
  const thin = draft.samples.length < MIN_VOICE_SAMPLES

  return (
    <article className="flex flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-1">
        {editing ? (
          <div className="grid gap-3">
            <Field label={t('brand.distill.review.voiceName')}>
              <Input
                autoFocus
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label={t('brand.distill.review.whenToUse')}>
              <Input
                value={draft.whenToUse}
                onChange={(e) => set({ whenToUse: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
                {draft.name}
              </h3>
              {becomesDefault && (
                <span className="flex items-center gap-1.5 text-sm text-secondary-foreground">
                  <StarIcon
                    weight="fill"
                    aria-hidden
                    className="size-4 text-positive"
                  />
                  {t('brand.distill.review.becomesDefault')}
                </span>
              )}
            </div>
            {draft.whenToUse && (
              <p className="text-sm leading-5 text-secondary-foreground">
                {draft.whenToUse}
              </p>
            )}
          </>
        )}
      </header>

      <ul className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
        {draft.samples.map((sample, i) => {
          const evidence = evidenceAt(i)
          return (
            <li key={i} className="flex flex-col gap-1.5">
              {editing ? (
                <div className="flex items-start gap-1">
                  <Textarea
                    value={sample}
                    onChange={(e) =>
                      set({
                        samples: draft.samples.map((s, j) =>
                          j === i ? e.target.value : s,
                        ),
                      })
                    }
                    className="min-h-21 px-3 py-2 leading-5"
                  />
                  <Button
                    variant="ghost"
                    size="smIcon"
                    aria-label={t('brand.distill.review.removeSample')}
                    onClick={() =>
                      set({
                        samples: draft.samples.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : (
                <SampleCard>
                  <span className="text-sm leading-5 whitespace-pre-line">
                    {sample}
                  </span>
                </SampleCard>
              )}
              {evidence && (
                <SourceLabel
                  evidence={[evidence]}
                  answers={answers}
                  className="pl-4"
                />
              )}
            </li>
          )
        })}
        {thin && (
          <AddSample
            onAdd={(text) => set({ samples: [...draft.samples, text] })}
            note={t('brand.distill.review.thinVoice', {
              count: draft.samples.length,
            })}
          />
        )}
      </ul>

      <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
        <li>{rulesLine(t, voice.rules)}</li>
        {!thin && (
          <li>
            {t(`brand.distill.review.samplesFrom.${sourceNoun}` as const, {
              count: draft.samples.length,
            })}
          </li>
        )}
      </ul>

      <KeepDrop
        kept
        onKeep={() => {}}
        onDrop={() => {
          setEditing(false)
          update((r) => toggleDropped(r, voice.proposalId))
        }}
        trailing={
          <EditToggle editing={editing} onToggle={() => setEditing(!editing)} />
        }
      />
    </article>
  )
}

/**
 * The voice editor's add-a-sample cell, for a voice the source could only
 * half support (fewer than three samples — the editor's own floor). Kept by
 * default and never blocked: a thin voice is a voice with a gap in it, said
 * beside the cell that fills it.
 */
function AddSample({
  onAdd,
  note,
}: {
  onAdd: (text: string) => void
  note: string
}) {
  const { t } = useTranslation()
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState('')

  const cell = writing ? (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('brand.voices.editor.samplePlaceholder')}
        className="min-h-21 px-3 py-2 leading-5"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setWriting(false)
            setText('')
          }}
        >
          {t('brand.distill.cancel')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={text.trim() === ''}
          onClick={() => {
            onAdd(text.trim())
            setWriting(false)
            setText('')
          }}
        >
          {t('brand.voices.editor.addIt')}
        </Button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setWriting(true)}
      className="group flex min-h-[86px] w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-quaternary transition-colors hover:border-foreground"
    >
      <span className="flex items-center gap-1.5 font-grotesk text-xs font-medium uppercase text-tertiary-foreground transition-colors group-hover:text-primary-foreground">
        <PlusIcon className="size-4" weight="bold" />
        {t('brand.voices.editor.addSample')}
      </span>
    </button>
  )

  return (
    <>
      <li>{cell}</li>
      <li className="text-sm leading-5 text-secondary-foreground">{note}</li>
    </>
  )
}

export function AudiencesReview({
  audiences,
  review,
  update,
  answers,
}: {
  audiences: ProposedAudience[]
  review: DistillReview
  update: Update
  answers: DistillAnswer[]
}) {
  const { t } = useTranslation()
  const info = brandSection('audiences')
  return (
    <ReviewSection
      icon={info.icon}
      tone={info.tone}
      title={brandSectionCopy(t, 'audiences').label}
      qualifier={t('brand.distill.review.proposed', {
        count: audiences.length,
      })}
    >
      <Stack>
        {audiences.map((audience) =>
          isDropped(review, audience.proposalId) ? (
            <DroppedLine
              key={audience.proposalId}
              name={audienceDraft(audience, review).name}
              onUndo={() =>
                update((r) => toggleDropped(r, audience.proposalId))
              }
            />
          ) : (
            <AudienceProposal
              key={audience.proposalId}
              audience={audience}
              review={review}
              update={update}
              answers={answers}
            />
          ),
        )}
      </Stack>
    </ReviewSection>
  )
}

function AudienceProposal({
  audience,
  review,
  update,
  answers,
}: {
  audience: ProposedAudience
  review: DistillReview
  update: Update
  answers: DistillAnswer[]
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const draft = audienceDraft(audience, review)
  const set = (patch: Partial<AudienceDraft>) =>
    update((r) => ({
      ...r,
      audiences: {
        ...r.audiences,
        [audience.proposalId]: {
          ...r.audiences[audience.proposalId],
          ...patch,
        },
      },
    }))

  const lines: { key: keyof AudienceDraft; label: string }[] = [
    { key: 'readsOn', label: t('brand.audiences.readsOn') },
    { key: 'scrollsPastWhen', label: t('brand.audiences.scrollsPast') },
    { key: 'believesWhen', label: t('brand.audiences.believesWhen') },
  ]

  return (
    <article className="flex flex-col gap-4">
      {editing ? (
        <div className="grid gap-3">
          <Field label={t('brand.distill.review.audienceName')}>
            <Input
              autoFocus
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <Field label={t('brand.distill.review.who')}>
            <Input
              value={draft.who}
              onChange={(e) => set({ who: e.target.value })}
            />
          </Field>
          {lines.map((line) => (
            <Field key={line.key} label={line.label}>
              <Input
                value={draft[line.key]}
                onChange={(e) => set({ [line.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      ) : (
        <>
          <header className="flex min-w-0 flex-col gap-1">
            <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
              {draft.name}
            </h3>
            {draft.who && (
              <p className="text-sm leading-5 text-secondary-foreground">
                {draft.who}
              </p>
            )}
          </header>
          {/* AudiencesSection's definition list: 144px terms against a rule. */}
          <div className="flex flex-col gap-2">
            <dl className="flex flex-col gap-1.5 border-l-2 border-quaternary pl-3 text-sm leading-5">
              {lines.map((line) => (
                <div key={line.key} className="flex gap-3">
                  <dt className="w-36 shrink-0 text-tertiary-foreground">
                    {line.label}
                  </dt>
                  <dd className="min-w-0">
                    {draft[line.key] || (
                      <span className="text-tertiary-foreground">
                        {t('brand.audiences.notSaid')}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <SourceLabel evidence={audience.evidence} answers={answers} />
          </div>
        </>
      )}
      <KeepDrop
        kept
        onKeep={() => {}}
        onDrop={() => {
          setEditing(false)
          update((r) => toggleDropped(r, audience.proposalId))
        }}
        trailing={
          <EditToggle editing={editing} onToggle={() => setEditing(!editing)} />
        }
      />
    </article>
  )
}

/**
 * A dropped voice or audience, folded to its name. Still readable, because
 * changing your mind is reading it again; UNDO puts it back as it was, edits
 * and all.
 */
function DroppedLine({ name, onUndo }: { name: string; onUndo: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-display text-lg font-medium text-tertiary-foreground">
          {name}
        </span>
        <span className="shrink-0 text-sm text-tertiary-foreground">
          {t('brand.distill.review.dropped')}
        </span>
      </p>
      <Button variant="ghost" size="sm" onClick={onUndo}>
        <ArrowCounterClockwiseIcon />
        {t('brand.distill.review.undo')}
      </Button>
    </div>
  )
}

function EditToggle({
  editing,
  onToggle,
}: {
  editing: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <Button variant="ghost" size="sm" onClick={onToggle}>
      {editing ? <CheckIcon /> : <PencilSimpleIcon />}
      {editing
        ? t('brand.distill.review.done')
        : t('brand.distill.review.edit')}
    </Button>
  )
}

/** Entries ruled off from each other, the rule only between them. */
function Stack({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 [&>*+*]:border-t [&>*+*]:border-quaternary [&>*+*]:pt-5">
      {children}
    </div>
  )
}
