import { RailPanel } from '@/components/page-primitives/RailPanel'
import { AssistantChat } from '@/components/assistant/AssistantChat'
import { ThreadTabs } from '@/components/assistant/ThreadTabs'
import { Composer } from '@/components/assistant/Composer'
import { useActiveThread, useAssistantStore } from '@/stores/assistantStore'

/**
 * The single, persistent home for all AI assistant threads. Mounted via the
 * global "ai" rail button; pages open/focus their thread through the store
 * (`openThread`). Each open thread is a tab; the active one's transcript and
 * composer fill the panel.
 */
export function AssistantPanel({ onClose }: { onClose?: () => void }) {
  const active = useActiveThread()
  const submitInstruction = useAssistantStore((s) => s.submitInstruction)
  const cancelTurn = useAssistantStore((s) => s.cancelTurn)

  if (!active) {
    return (
      <RailPanel
        title="Assistant"
        onClose={onClose}
        bodyClassName="flex-1 items-center justify-center text-center"
      >
        <p className="text-sm text-secondary-foreground">No thread open.</p>
        <p className="text-xs text-tertiary-foreground">
          Open a post and choose Assistant to start.
        </p>
      </RailPanel>
    )
  }

  const streaming = active.status === 'streaming'

  return (
    <RailPanel
      title={active.ref.title}
      onClose={onClose}
      footer={
        <Composer
          streaming={streaming}
          onSubmit={(text) => submitInstruction(active.key, text)}
          onCancel={() => cancelTurn(active.key)}
        />
      }
    >
      <ThreadTabs />
      <AssistantChat thread={active} />
    </RailPanel>
  )
}
