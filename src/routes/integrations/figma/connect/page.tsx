import { useState, type ReactNode } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  FigmaLogoIcon,
  WarningIcon,
} from '@phosphor-icons/react'

import { Logo } from '@/components/Logo'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark'
import { Button } from '@/components/ui/button'
import {
  useAnswerFigmaPairing,
  useFigmaPairing,
} from '@/hooks/useFigmaIntegration'
import { useLocale } from '@/hooks/useLocale'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useActiveWorkspaceId } from '@/lib/activeWorkspace'
import { formatDate } from '@/lib/intl'
import { cn } from '@/lib'
import { ApiError } from '@/services/api/errors'
import { useAuthStore } from '@/stores/authStore'
import type { WorkspaceChoice } from '@/types/workspace'

/**
 * Where the Figma plugin sends the user to approve a connection (CON-339).
 *
 * The plugin opened this tab with a write key and is polling the API with the
 * read key it kept; nothing here talks back to it. Allowing mints a token in
 * the workspace chosen below — sent as `X-Workspace-Id` on the approve — and
 * the plugin collects it on its next poll. The tab itself stays where it was.
 *
 * Every screen this page can end on tells the user what to do next in Figma,
 * because that is where they came from and where they are going back to.
 */
export default function FigmaConnectPage() {
  const { t } = useTranslation()
  const { key } = useSearch({ from: '/integrations/figma/connect/' })
  const pairing = useFigmaPairing(key)
  const { approve, deny } = useAnswerFigmaPairing()

  // A 410 is the one answer the server gives for every unusable key —
  // expired, unknown or already collected — so it gets the one screen.
  const expired =
    !key ||
    isStatus(pairing.error, 410) ||
    isStatus(approve.error, 410) ||
    isStatus(deny.error, 410)
  // Answered before this page loaded (the preview's own status), or in the
  // moment between loading it and clicking (409 on the answer).
  const answered =
    (pairing.data && pairing.data.status !== 'pending') ||
    isCode(approve.error, 'pairing_not_pending') ||
    isCode(deny.error, 'pairing_not_pending')

  if (expired) {
    return (
      <Shell title={t('integrations.figma.connect.expired.title')}>
        <Card>
          <p className="text-sm text-secondary-foreground">
            {t('integrations.figma.connect.expired.body')}
          </p>
        </Card>
      </Shell>
    )
  }

  if (approve.isSuccess) {
    return (
      <Shell title={t('integrations.figma.connect.success.title')}>
        <Card className="flex items-start gap-3">
          <CheckCircleIcon
            weight="fill"
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-positive"
          />
          <p className="text-sm text-secondary-foreground">
            <Trans
              i18nKey="integrations.figma.connect.success.body"
              values={{ workspace: approve.variables.workspaceName }}
              components={{
                strong: (
                  <strong className="font-medium text-primary-foreground" />
                ),
              }}
            />
          </p>
        </Card>
      </Shell>
    )
  }

  if (deny.isSuccess) {
    return (
      <Shell title={t('integrations.figma.connect.denied.title')}>
        <Card>
          <p className="text-sm text-secondary-foreground">
            {t('integrations.figma.connect.denied.body')}
          </p>
        </Card>
      </Shell>
    )
  }

  if (answered) {
    return (
      <Shell title={t('integrations.figma.connect.answered.title')}>
        <Card>
          <p className="text-sm text-secondary-foreground">
            {t('integrations.figma.connect.answered.body')}
          </p>
        </Card>
      </Shell>
    )
  }

  if (pairing.isError) {
    return (
      <Shell title={t('integrations.figma.connect.loadFailed.title')}>
        <Card className="flex flex-col gap-4">
          <p className="text-sm text-secondary-foreground">
            {t('integrations.figma.connect.loadFailed.body')}
          </p>
          <Button
            type="button"
            variant="neutral"
            className="self-start"
            onClick={() => void pairing.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        </Card>
      </Shell>
    )
  }

  if (!pairing.data) {
    return (
      <Shell title={t('integrations.figma.connect.title')}>
        <Card className="text-sm text-tertiary-foreground">
          {t('common.loading')}
        </Card>
      </Shell>
    )
  }

  return (
    <Consent
      label={pairing.data.client_label}
      createdAt={pairing.data.created_at}
      createdIp={pairing.data.created_ip}
      onApprove={(workspace) => approve.mutate(answer(key, workspace))}
      onDeny={(workspace) => deny.mutate(answer(key, workspace))}
      busy={approve.isPending || deny.isPending}
      // Anything not already turned into a screen above: a dropped connection,
      // a 5xx. The choice is still open, so it is a line under the buttons.
      failed={approve.isError || deny.isError}
    />
  )
}

/** The question itself: what is asking, from where, and into which workspace. */
function Consent({
  label,
  createdAt,
  createdIp,
  onApprove,
  onDeny,
  busy,
  failed,
}: {
  label: string
  createdAt: string
  createdIp: string
  onApprove: (workspace: WorkspaceChoice) => void
  onDeny: (workspace: WorkspaceChoice) => void
  busy: boolean
  failed: boolean
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const workspaces = useWorkspaces()
  const activeId = useActiveWorkspaceId()
  const { user } = useAuthStore()
  // Null until the user picks: the default is the tab's workspace, read at
  // render so it is right however late the list arrives.
  const [picked, setPicked] = useState<string | null>(null)

  const list = workspaces.data ?? []
  const chosen =
    list.find((w) => w.id === picked) ??
    list.find((w) => w.id === activeId) ??
    list.find((w) => w.is_default) ??
    list[0]

  const requestedAt = formatDate(
    createdAt,
    { dateStyle: 'medium', timeStyle: 'short' },
    locale,
  )

  return (
    <Shell
      title={t('integrations.figma.connect.title')}
      footer={
        user?.email ? (
          <p>
            {t('integrations.figma.connect.signedInAs', { email: user.email })}
          </p>
        ) : null
      }
    >
      <Card className="flex flex-col gap-6">
        {/* What is asking. The label is the plugin's own word for itself —
            usually the Figma user's name — which is exactly why it is shown
            with where and when it asked, rather than on its own. */}
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center bg-secondary">
            <FigmaLogoIcon aria-hidden className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-medium">{label}</span>
            <span className="text-xs text-tertiary-foreground">
              {createdIp
                ? t('integrations.figma.connect.requestedFrom', {
                    time: requestedAt ?? '',
                    ip: createdIp,
                  })
                : t('integrations.figma.connect.requestedAt', {
                    time: requestedAt ?? '',
                  })}
            </span>
          </div>
        </div>

        <WorkspacePicker
          workspaces={list}
          loading={workspaces.data === undefined && !workspaces.isError}
          failed={workspaces.isError}
          chosen={chosen}
          onChoose={setPicked}
          disabled={busy}
        />

        {/* Required, and deliberately not an Explainer: this is the warning
            the whole flow's phishing defence rests on, so nobody gets to close
            it for good. */}
        {chosen && (
          <div className="flex items-start gap-3 bg-warning/10 px-4 py-3 text-sm text-primary-foreground">
            <WarningIcon
              weight="fill"
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
            <p>
              <Trans
                i18nKey="integrations.figma.connect.warning"
                values={{ workspace: chosen.name }}
                components={{
                  strong: <strong className="font-medium" />,
                  em: <em />,
                }}
              />
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="neutral"
              disabled={busy || !chosen}
              onClick={() => chosen && onDeny(chosen)}
            >
              {t('integrations.figma.connect.deny')}
            </Button>
            <Button
              type="button"
              variant="defaultInverted"
              loading={busy}
              disabled={!chosen}
              onClick={() => chosen && onApprove(chosen)}
            >
              {t('integrations.figma.connect.allow')}
            </Button>
          </div>
          {failed && (
            <p role="alert" className="text-right text-sm text-destructive">
              {t('integrations.figma.connect.answerFailed')}
            </p>
          )}
        </div>
      </Card>
    </Shell>
  )
}

/**
 * Which workspace the plugin will send into. With one workspace there is
 * nothing to choose, but the name still shows — it is what the warning above
 * the buttons is about.
 */
function WorkspacePicker({
  workspaces,
  loading,
  failed,
  chosen,
  onChoose,
  disabled,
}: {
  workspaces: WorkspaceChoice[]
  loading: boolean
  failed: boolean
  chosen: WorkspaceChoice | undefined
  onChoose: (id: string) => void
  disabled: boolean
}) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <p className="text-sm text-tertiary-foreground">{t('common.loading')}</p>
    )
  }
  if (failed || !chosen) {
    return (
      <p className="text-sm text-destructive">
        {t('integrations.figma.connect.workspacesFailed')}
      </p>
    )
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-[13px] text-input-label">
        {t('integrations.figma.connect.workspaceLabel')}
      </legend>
      <div role="radiogroup" className="flex flex-col gap-1">
        {workspaces.map((w) => {
          const selected = w.id === chosen.id
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChoose(w.id)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors',
                'hover:bg-secondary disabled:pointer-events-none disabled:opacity-50',
                selected && 'bg-secondary',
              )}
            >
              <WorkspaceMark
                id={w.id}
                name={w.name}
                className="size-8 rounded-none text-xs"
              />
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm',
                  selected && 'font-medium',
                )}
              >
                {w.name}
              </span>
              {selected && (
                <CheckCircleIcon
                  weight="fill"
                  aria-hidden
                  className="size-4 shrink-0 text-positive"
                />
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** The page around every state: logo, one heading, a 480px column. */
function Shell({
  title,
  children,
  footer,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <PageContainer variant="fullscreen">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-[480px] flex-col gap-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <Logo className="size-12" />
            <h1 className="font-display text-[2rem] leading-12 font-medium tracking-tight">
              {title}
            </h1>
          </div>
          {children}
        </div>
      </div>
      {footer && (
        <div className="flex flex-col items-center px-4 pb-4 text-center text-sm text-tertiary-foreground">
          {footer}
        </div>
      )}
    </PageContainer>
  )
}

function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('w-full bg-primary px-8 py-6', className)}>
      {children}
    </section>
  )
}

function answer(key: string | undefined, workspace: WorkspaceChoice) {
  // `key` is present by now — the expired screen above catches its absence —
  // but the narrowing does not survive being folded into that flag.
  return {
    key: key ?? '',
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  }
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status
}

function isCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code
}
