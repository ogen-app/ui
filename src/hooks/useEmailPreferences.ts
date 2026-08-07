import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getEmailPreferences,
  setMarketingEmails,
} from '@/services/api/emailPreferences'

/**
 * Keyed by user id even though the endpoint only ever serves the caller's own
 * row: the id is in the path, and a key that ignored it would hand the next
 * person to sign in on this device the previous one's answer.
 */
export const emailPreferencesKey = (userId: string) =>
  ['email-preferences', userId] as const

export function useEmailPreferences(userId: string) {
  return useQuery({
    queryKey: emailPreferencesKey(userId),
    queryFn: () => getEmailPreferences(userId),
    staleTime: Infinity,
  })
}

/**
 * Subscribes or unsubscribes the signed-in user from marketing mail.
 *
 * Not optimistic, on purpose. The switch is disabled for the round-trip
 * instead, so it never shows a state the server hasn't agreed to — an
 * unsubscribe that silently failed but looked applied is the one outcome
 * this screen must not produce. A rejected write leaves the cache holding
 * the server's last known answer and re-reads it.
 */
export function useSetMarketingEmails(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (marketing: boolean) => setMarketingEmails(userId, marketing),
    onSuccess: (preferences) =>
      queryClient.setQueryData(emailPreferencesKey(userId), preferences),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: emailPreferencesKey(userId) }),
  })
}
