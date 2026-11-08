import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAssistantStore } from '@/stores/assistantStore'
import { PendingBox, ResolvedLine, StatusWord, TextAction } from './blocks'
import type { AssistantProposal } from '@/types/assistant'

/**
 * An offer the assistant is holding for a yes (CON-446). While it waits it is
 * the one boxed thing in the thread, and its confirm is the one dark button;
 * once answered it collapses to a grey line. A typed "yes" in the composer
 * runs the same stored offer, which is why the composer says so meanwhile.
 *
 * An offer with options is a choice: each option a row with its consequence
 * underneath. The option the assistant would pick gets the dark button when
 * the server says which; until then they are equal.
 */
const RESOLVED = {
  confirming: 'working',
  confirmed: 'confirmed',
  dismissed: 'dismissed',
  expired: 'expired',
  superseded: 'superseded',
  closed: 'closed',
} as const satisfies Record<
  Exclude<AssistantProposal['status'], 'pending'>,
  string
>

export function ProposalCard({
  threadId,
  proposal,
  disabled,
}: {
  threadId: string
  proposal: AssistantProposal
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const dismiss = useAssistantStore((s) => s.dismissProposal)
  const { summary } = proposal

  if (proposal.status !== 'pending') {
    return (
      <div className="flex flex-col gap-1">
        <ResolvedLine>
          {t(`assistant.proposal.${RESOLVED[proposal.status]}`, { summary })}
        </ResolvedLine>
        {proposal.error && (
          <p className="text-[12.5px] text-warning">{proposal.error}</p>
        )}
      </div>
    )
  }

  const choice = proposal.options.length > 0
  return (
    <PendingBox>
      <StatusWord>
        {choice ? t('assistant.word.choose') : t('assistant.word.proposal')}
      </StatusWord>
      <h3 className="text-base/6 font-medium text-foreground">{summary}</h3>

      {choice ? (
        <ul className="mt-2 flex flex-col">
          {proposal.options.map((option) => {
            const recommended = proposal.recommended === option.id
            return (
              <li
                key={option.id}
                className="flex items-start gap-3 border-t border-border py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {option.title}
                  </span>
                  {option.description && (
                    <span className="text-[12.5px] text-secondary-foreground">
                      {option.description}
                    </span>
                  )}
                </div>
                {recommended ? (
                  <Button
                    variant="defaultInverted"
                    size="sm"
                    disabled={disabled}
                    onClick={() =>
                      void confirm(threadId, proposal.id, option.id)
                    }
                  >
                    {t('assistant.proposal.choose')}
                  </Button>
                ) : (
                  <TextAction
                    disabled={disabled}
                    onClick={() =>
                      void confirm(threadId, proposal.id, option.id)
                    }
                  >
                    {t('assistant.proposal.choose')}
                  </TextAction>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <Button
            variant="defaultInverted"
            size="sm"
            disabled={disabled}
            onClick={() => void confirm(threadId, proposal.id)}
          >
            {t('assistant.proposal.confirm')}
          </Button>
          <TextAction
            disabled={disabled}
            onClick={() => void dismiss(threadId, proposal.id)}
          >
            {t('assistant.proposal.dismiss')}
          </TextAction>
        </div>
      )}

      {choice && (
        <div className="border-t border-border pt-3">
          <TextAction
            disabled={disabled}
            onClick={() => void dismiss(threadId, proposal.id)}
          >
            {t('assistant.proposal.dismiss')}
          </TextAction>
        </div>
      )}
    </PendingBox>
  )
}
