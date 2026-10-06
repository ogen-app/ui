import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveFigmaPairing,
  denyFigmaPairing,
  listFigmaConnections,
  previewFigmaPairing,
  revokeFigmaConnection,
} from '@/services/api/figmaIntegration'

export const FIGMA_CONNECTIONS_KEY = [
  'integrations',
  'figma',
  'connections',
] as const

const pairingKey = (key: string) =>
  ['integrations', 'figma', 'pairing', key] as const

/**
 * What a plugin's pairing request says about itself (CON-339).
 *
 * `retry: false` because the failure that matters is a 410, which is a fact
 * about the key — retrying it three times only makes the expired screen slower
 * to appear. Never refetched behind the user's back either: the page reads it
 * once, and an approve or deny is what moves it on.
 */
export function useFigmaPairing(key: string | undefined) {
  return useQuery({
    queryKey: pairingKey(key ?? ''),
    queryFn: () => previewFigmaPairing(key as string),
    enabled: Boolean(key),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

type PairingAnswer = {
  key: string
  workspaceId: string
  /** Carried for the screen that follows, which names where the plugin now sends. */
  workspaceName: string
}

/**
 * Allow or deny a pairing in the chosen workspace. Both render their failure
 * on the page — a 409 there is a state to show, not an error to toast.
 */
export function useAnswerFigmaPairing() {
  const qc = useQueryClient()
  const approve = useMutation({
    meta: { errorToast: false },
    mutationFn: ({ key, workspaceId }: PairingAnswer) =>
      approveFigmaPairing(key, workspaceId),
    // The list is per workspace and the approval may have landed in another
    // one, so drop it wherever it is rather than guess which.
    onSuccess: () => qc.invalidateQueries({ queryKey: FIGMA_CONNECTIONS_KEY }),
  })
  const deny = useMutation({
    meta: { errorToast: false },
    mutationFn: ({ key, workspaceId }: PairingAnswer) =>
      denyFigmaPairing(key, workspaceId),
  })
  return { approve, deny }
}

/** The plugin connections in this workspace — the caller's, or all for an owner. */
export function useFigmaConnections() {
  return useQuery({
    queryKey: FIGMA_CONNECTIONS_KEY,
    queryFn: listFigmaConnections,
    staleTime: 30_000,
  })
}

/** Revoke one connection. The dialog words its own failure. */
export function useRevokeFigmaConnection() {
  const qc = useQueryClient()
  return useMutation({
    meta: { errorToast: false },
    mutationFn: (id: string) => revokeFigmaConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: FIGMA_CONNECTIONS_KEY }),
  })
}
