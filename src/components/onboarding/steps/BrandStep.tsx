import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ReadingScreen } from '@/components/brand/distill/ReadingScreen'
import { ReviewScreen } from '@/components/brand/distill/ReviewScreen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { keptTally } from '@/lib/brandDistill'
import { useDistillReview } from '@/stores/brandDistillStore'
import type { DistillRun } from '@/types/brandDistill'
import { LABEL_TEXT, StepCard, StepFooter } from '../OnboardingFrame'

/**
 * The brand, read from what was given — the brand read's own screens, not a
 * second review written for onboarding. While the run works it is the
 * reading checklist; once it is ready it is the review, laid out like the
 * Foundation hub, with everything kept until it is dropped.
 *
 * Above the review, the name. It came from the first screen or, left empty
 * there, from the first source, and it says which; when the website calls
 * the business something else, that is offered beside it rather than
 * swapped in. Renaming here renames the workspace.
 */
export function BrandStep({
  run,
  name,
  nameFrom,
  siteName,
  onName,
  onBack,
  onSave,
}: {
  run: DistillRun
  name: string
  /** Where the name came from: null when the person typed it. */
  nameFrom: string | null
  /** What the website calls the business, when it reads a name. */
  siteName?: string
  onName: (name: string) => void
  onBack: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()

  if (run.status !== 'ready' || !run.proposal) {
    return (
      <>
        <StepCard
          title={t('onboarding.brand.readingTitle')}
          lead={t('onboarding.brand.readingLead')}
        />
        <ReadingScreen run={run} />
      </>
    )
  }

  return (
    <>
      <StepCard
        title={t('onboarding.brand.reviewTitle')}
        lead={t('onboarding.brand.reviewLead')}
      >
        <NameField
          name={name}
          nameFrom={nameFrom}
          siteName={siteName}
          onName={onName}
        />
      </StepCard>
      <ReviewScreen run={run} proposal={run.proposal} brand={undefined} />
      <section className="bg-primary px-5 pb-6 lg:px-8">
        <ReviewFooter run={run} onBack={onBack} onSave={onSave} />
      </section>
    </>
  )
}

function ReviewFooter({
  run,
  onBack,
  onSave,
}: {
  run: DistillRun
  onBack: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  const review = useDistillReview(run.id)
  const tally = run.proposal ? keptTally(run.proposal, review) : null

  return (
    <StepFooter
      onBack={onBack}
      next={
        <div className="flex items-center gap-3">
          {tally && (
            <span className="text-sm text-secondary-foreground tabular-nums">
              {t('onboarding.brand.kept', tally)}
            </span>
          )}
          <Button variant="accent" onClick={onSave}>
            {t('onboarding.brand.keep')}
          </Button>
        </div>
      }
    />
  )
}

function NameField({
  name,
  nameFrom,
  siteName,
  onName,
}: {
  name: string
  nameFrom: string | null
  siteName?: string
  onName: (name: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const differs = siteName && siteName.trim() !== name.trim()

  return (
    <div className="flex max-w-md flex-col gap-2">
      <Label htmlFor={id} className={LABEL_TEXT}>
        {t('onboarding.brand.nameLabel')}
      </Label>
      <Input id={id} value={name} onChange={(e) => onName(e.target.value)} />
      <p className="text-sm leading-5 text-secondary-foreground">
        {nameFrom
          ? t('onboarding.brand.namedFrom', { source: nameFrom })
          : t('onboarding.brand.namedByYou')}
        {differs && (
          <>
            {' · '}
            {t('onboarding.brand.siteSays', { name: siteName })}{' '}
            <button
              type="button"
              onClick={() => onName(siteName)}
              className="cursor-pointer font-medium text-accent hover:underline"
            >
              {t('onboarding.brand.useSite')}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
