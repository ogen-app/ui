import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TextSelect } from '@/components/ui/text-select'
import {
  BrandEditorFrame,
  DangerCard,
  EditorCard,
  EditorIntro,
  Field,
} from '@/components/brand/editor'
import { FormatPicker } from '@/components/formats/FormatPicker'
import { useFeatureFlag } from '@/config/featureFlags'
import { RhythmPicker } from './RhythmPicker'
import type { ContentSeries, SeriesSupply } from './types'

/**
 * One series, being written (CON-264).
 *
 * ## The recipe gets the big card
 *
 * Same position the voice editor gives samples and the audience editor gives
 * its three consequence lines, and for the same reason: **the substance gets
 * the largest card, and the description gets the small one above it.** A series
 * is its recipe. Without one it is a name that groups posts — still worth
 * having, which is why nothing here refuses to save it, but it is not yet a
 * standing instruction and the screen should not let that pass unnoticed.
 *
 * The recipe is prose rather than structured steps, deliberately. Every attempt
 * to structure it — an opening field, a middle field, a close field — is a
 * guess about a shape that differs per series, and the guess would be wrong for
 * the digest and the profile at once. What goes in here eventually goes to a
 * generator, and a generator reads prose.
 *
 * ## What is not on this screen
 *
 * **Tone.** How a series sounds is the voice's job. A tone field here would be
 * a second place to say the same thing, which is a conflict the generator has
 * to resolve and the user has to predict — and the resolution order would have
 * to be explained on both screens. If a series genuinely needs to sound
 * different, that is a voice, and the binding for it already exists.
 *
 * **A post type.** Carousel, reel and thread are the container, they are
 * already modelled and already derived. The format field here is the
 * *rhetorical* shape, which is a different question with a different answer.
 *
 * ## What the supply question is really asking
 *
 * Whether this can run unattended. "This day in history" needs nothing from
 * anybody; "People who made an impact" cannot run until somebody names a
 * person. It is two radio-ish options rather than a checkbox because both
 * answers are positive statements — *it feeds itself* / *it waits for an idea*
 * — and a cleared checkbox would read as the question being unanswered.
 */
export function SeriesEditor({
  header,
  series,
  onSave,
  onCancel,
  onDelete,
}: {
  header?: ReactNode
  /** What the editor opens with — a blank, a fork of a starter, or a stored one. */
  series: ContentSeries
  onSave?: (series: ContentSeries) => void
  onCancel?: () => void
  /** Absent for a series that has never been stored. */
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const formats = useFeatureFlag('content-formats')

  const [name, setName] = useState(series.name)
  const [promise, setPromise] = useState(series.promise)
  const [recipe, setRecipe] = useState(series.recipe)
  const [supply, setSupply] = useState<SeriesSupply>(series.supply)
  const [formatId, setFormatId] = useState(series.formatId)
  const [rhythm, setRhythm] = useState(series.defaultRhythm)

  const existing = Boolean(series.id)
  const trimmed = name.trim()

  return (
    <BrandEditorFrame
      header={header}
      contentKey={existing ? 'edit' : 'new'}
      // The only thing that blocks a save. A series with no recipe is
      // incomplete and saves anyway; a series with no name cannot be referred
      // to at all, by a person or by a row in a list.
      blocker={trimmed ? undefined : t('series.editor.needsName')}
      commitLabel={
        existing ? t('series.editor.save') : t('series.editor.create')
      }
      onCancel={onCancel}
      onSave={
        onSave
          ? () =>
              onSave({
                ...series,
                name: trimmed,
                promise: promise.trim(),
                recipe: recipe.trim(),
                supply,
                // With the formats flag off this editor never showed the
                // control, so it hands back whatever the series already
                // carried rather than clearing a value the user could not see.
                formatId: formats ? formatId : series.formatId,
                defaultRhythm: rhythm,
              })
          : undefined
      }
    >
      <EditorIntro
        section="series"
        title={
          existing ? t('series.editor.titleEdit') : t('series.editor.titleNew')
        }
        body={t('series.editor.intro')}
      />

      <EditorCard title={t('series.editor.identityCard')}>
        <Field
          label={t('series.editor.nameLabel')}
          hint={t('series.editor.nameHint')}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('series.editor.namePlaceholder')}
          />
        </Field>
        <Field
          label={t('series.editor.promiseLabel')}
          hint={t('series.editor.promiseHint')}
        >
          <Input
            value={promise}
            onChange={(event) => setPromise(event.target.value)}
            placeholder={t('series.editor.promisePlaceholder')}
          />
        </Field>
      </EditorCard>

      {/* The screen's subject, and the card it is built around. */}
      <EditorCard
        title={t('series.editor.recipeCard')}
        hint={t('series.editor.recipeHint')}
      >
        <Textarea
          value={recipe}
          onChange={(event) => setRecipe(event.target.value)}
          placeholder={t('series.editor.recipePlaceholder')}
          // Sized through `className`, as the voice editor sizes its sample
          // box: the component's `rows` prop collides with the native one and
          // resolves to `never`. Tall, because this is the screen's subject.
          className="min-h-40"
          aria-label={t('series.editor.recipeCard')}
        />
      </EditorCard>

      <EditorCard title={t('series.editor.runningCard')}>
        <Field
          label={t('series.editor.supplyLabel')}
          hint={t('series.editor.supplyHint')}
        >
          <TextSelect
            value={supply}
            elements={[
              { id: 'self', displayValue: t('series.supply.selfOption') },
              { id: 'idea', displayValue: t('series.supply.ideaOption') },
            ]}
            onValueChange={(next) =>
              setSupply(next === 'self' ? 'self' : 'idea')
            }
          />
        </Field>

        {formats ? (
          <Field
            label={t('series.editor.formatLabel')}
            hint={t('series.editor.formatHint')}
          >
            <FormatPicker value={formatId} onChange={setFormatId} />
          </Field>
        ) : null}

        <Field
          label={t('series.editor.rhythmLabel')}
          // Says out loud that this is a suggestion and not the plan: the
          // number the campaign counts is the campaign's, which is what lets
          // two campaigns run the same series at different rates.
          hint={t('series.editor.rhythmHint')}
        >
          <RhythmPicker value={rhythm} onChange={setRhythm} />
        </Field>
      </EditorCard>

      {existing && onDelete ? (
        <DangerCard
          noun={t('series.editor.dangerNoun')}
          name={series.name}
          cost={t('series.editor.deleteCost')}
          onDelete={onDelete}
        />
      ) : null}
    </BrandEditorFrame>
  )
}
