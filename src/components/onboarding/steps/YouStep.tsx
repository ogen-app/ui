import { useId } from 'react'
import { BriefcaseIcon, StorefrontIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { StarterCard } from '@/components/brand/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OnboardingRole } from '../flow'
import { DISABLED_ACCENT, StepCard, StepFooter } from '../OnboardingFrame'

/**
 * Who the workspace is for. One question, and each answer says what it
 * changes; once it is answered, the name — typed here it lands on the sheet
 * as it is typed. Optional: left empty, the read takes it from the website.
 */
export function YouStep({
  role,
  name,
  onRole,
  onName,
  onNext,
}: {
  role: OnboardingRole | null
  name: string
  onRole: (role: OnboardingRole) => void
  onName: (name: string) => void
  onNext: () => void
}) {
  const { t } = useTranslation()
  const nameId = useId()

  return (
    <StepCard
      title={t('onboarding.you.title')}
      lead={t('onboarding.you.lead')}
      footer={
        <StepFooter
          next={
            <Button
              variant="accent"
              className={DISABLED_ACCENT}
              disabled={!role}
              onClick={onNext}
            >
              {t('onboarding.continue')}
            </Button>
          }
        />
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <StarterCard
          icon={BriefcaseIcon}
          title={t('onboarding.you.client.title')}
          body={t('onboarding.you.client.body')}
          pressed={role === 'client'}
          onClick={() => onRole('client')}
        />
        <StarterCard
          icon={StorefrontIcon}
          title={t('onboarding.you.own.title')}
          body={t('onboarding.you.own.body')}
          pressed={role === 'own'}
          onClick={() => onRole('own')}
        />
      </div>

      {role && (
        <div className="flex max-w-md flex-col gap-2">
          <Label htmlFor={nameId}>
            {t(
              role === 'own'
                ? 'onboarding.you.nameOwn'
                : 'onboarding.you.nameClient',
            )}
          </Label>
          <Input
            id={nameId}
            value={name}
            autoFocus
            onChange={(e) => onName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNext()
            }}
          />
          <p className="text-xs leading-4 text-tertiary-foreground">
            {t('onboarding.you.nameHint')}
          </p>
        </div>
      )}
    </StepCard>
  )
}
