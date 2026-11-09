import { useEffect } from 'react'
import { useParams } from '@tanstack/react-router'
import { useAssistantStore } from '@/stores/assistantStore'

/**
 * Binds the assistant to the workspace thread on workspace-level screens —
 * Ideas, Assets, Analytics, Foundation, Activity, Settings (CON-450). Inside a
 * campaign the campaign layout and the post editor bind their own threads, so
 * this only acts on the way *out* of a campaign, and on a first load outside
 * one: moving between two workspace screens is the same thread, and re-opening
 * it on every navigation would pull the panel off the thread list mid-browse.
 */
export function useWorkspaceThread() {
  const { campaignId } = useParams({ strict: false })
  const inCampaign = Boolean(campaignId)
  const openThread = useAssistantStore((s) => s.openThread)

  useEffect(() => {
    if (!inCampaign) openThread({ kind: 'workspace' }, '', '')
  }, [inCampaign, openThread])
}
