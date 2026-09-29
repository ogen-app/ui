import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  dismissAnnouncement,
  listAnnouncements,
  recordAnnouncementClick,
} from '@/services/api/announcements'
import type { Announcement } from '@/types/announcements'

/**
 * Operator announcements (CON-230): what is showing, and the two things a user
 * can do about it.
 *
 * Unflagged — the endpoints shipped with ogen#162. There is no push channel for
 * these (the ticket settled on a poll), so the list refetches on focus and
 * every quarter of an hour, which is as live as a marketing banner needs to be.
 * No workspace in the key: switching workspace clears this tab's cache, and the
 * server answers for whichever workspace the request names.
 */
export const ANNOUNCEMENTS_KEY = ['announcements'] as const

const REFRESH_MS = 15 * 60 * 1000

export function useAnnouncements(): Announcement[] {
  const { data } = useQuery({
    queryKey: ANNOUNCEMENTS_KEY,
    queryFn: listAnnouncements,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  return data ?? []
}

/**
 * Hide one for good. Taken out of the cache before the request lands — a close
 * button that waits on a round trip reads as broken — and put back if the
 * server refuses, so the banner can't vanish here and return on the next load
 * with nobody told why.
 */
export function useDismissAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dismissAnnouncement,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ANNOUNCEMENTS_KEY })
      const previous =
        queryClient.getQueryData<Announcement[]>(ANNOUNCEMENTS_KEY)
      queryClient.setQueryData<Announcement[]>(ANNOUNCEMENTS_KEY, (rows) =>
        rows?.filter((row) => row.id !== id),
      )
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ANNOUNCEMENTS_KEY, context.previous)
      }
    },
  })
}

/**
 * Record a CTA click. Fire-and-forget: the link has already opened by the time
 * this runs, and a failed count is the operator's loss, not something to put in
 * front of the user who clicked.
 */
export function useRecordAnnouncementClick() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordAnnouncementClick,
    onMutate: (id: string) => {
      queryClient.setQueryData<Announcement[]>(ANNOUNCEMENTS_KEY, (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, clicked: true } : row)),
      )
    },
  })
}
