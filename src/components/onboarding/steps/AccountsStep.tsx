import { CheckCircleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PlatformInfo } from '@/lib/platformDictionary'
import type { OnboardingRole } from '../flow'
import { LABEL_TEXT, StepCard, StepFooter } from '../OnboardingFrame'

export type ConnectedAccount = { platform: string; handle: string }

/**
 * Where the brand posts. Accounts are connected here rather than after,
 * because a marketer knows exactly which ones they run and a campaign brief
 * that cannot name its channels isn't one. Connecting is the same Zernio
 * round trip Workspace Settings starts, and it leaves the app, so each row's
 * button is the person's to press.
 *
 * Nothing here is required: a freelancer often doesn't hold the client's
 * logins yet, and the step says where to connect them later.
 */
export function AccountsStep({
  name,
  role,
  platforms,
  connected,
  connecting,
  onConnect,
  onBack,
  onNext,
}: {
  name: string
  role: OnboardingRole | null
  /** The platforms this workspace can publish to. */
  platforms: PlatformInfo[]
  connected: ConnectedAccount[]
  /** The platform whose connect is under way. */
  connecting?: string | null
  onConnect: (platform: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const { t } = useTranslation()

  return (
    <StepCard
      title={t('onboarding.accounts.title', { name })}
      lead={t(
        role === 'own'
          ? 'onboarding.accounts.leadOwn'
          : 'onboarding.accounts.leadClient',
      )}
      footer={
        <StepFooter
          onBack={onBack}
          note={t('onboarding.accounts.later')}
          next={
            <Button
              variant={connected.length > 0 ? 'accent' : 'outline'}
              onClick={onNext}
            >
              {connected.length > 0
                ? t('onboarding.continue')
                : t('onboarding.accounts.none')}
            </Button>
          }
        />
      }
    >
      <ul className="flex flex-col border-t border-quaternary">
        {platforms.map((p) => {
          const account = connected.find((a) => a.platform === p.zernioId)
          const Icon = p.icon
          return (
            <li
              key={p.zernioId}
              className="flex items-center gap-3 border-b border-quaternary py-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Icon
                  aria-hidden
                  weight="fill"
                  className="size-5"
                  style={{ color: p.color }}
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={LABEL_TEXT}>{p.name}</span>
                {account && (
                  <span className="truncate text-sm leading-5 text-secondary-foreground">
                    {account.handle}
                  </span>
                )}
              </div>
              {account ? (
                <span className="flex items-center gap-1.5 text-sm text-accent">
                  <CheckCircleIcon
                    aria-hidden
                    weight="fill"
                    className="size-4"
                  />
                  {t('onboarding.accounts.connected')}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  loading={connecting === p.zernioId}
                  onClick={() => onConnect(p.zernioId)}
                >
                  {t('onboarding.accounts.connect')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </StepCard>
  )
}
