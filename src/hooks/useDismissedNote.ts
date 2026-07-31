import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSetting, putSetting, userScopedKey } from "@/services/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";

/**
 * Which explainers this user has closed for good.
 *
 * Account-wide rather than per-campaign: an explainer teaches how something
 * works, and learning it once is enough. The whole set lives under one key
 * (`dismissed.<userId>`) so the tenant's settings table doesn't grow a row per
 * note — see `services/api/settings.ts` for why identity is in the key.
 *
 * Server-side, not `localStorage`, so a note stays shut on the user's other
 * machine. That is the whole promise of the close button.
 */
const NAMESPACE = "dismissed";

export const dismissedNotesKey = (userId: string) =>
  ["settings", NAMESPACE, userId] as const;

/** Anything malformed reads as "nothing dismissed" — worst case a note reappears. */
function parse(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export type DismissedNote = {
  /** True once the user has closed this note. */
  dismissed: boolean;
  /**
   * False until the stored set is known. Callers render nothing while it is
   * false: showing a note the user closed last week, even for one frame, is
   * exactly the annoyance the close button exists to end.
   */
  ready: boolean;
  dismiss: () => void;
};

export function useDismissedNote(id: string): DismissedNote {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const qc = useQueryClient();
  const queryKey = dismissedNotesKey(userId);
  const storageKey = userScopedKey(NAMESPACE, userId);

  const { data, isSuccess } = useQuery({
    queryKey,
    queryFn: async () => parse(await getSetting(storageKey)),
    enabled: !!userId,
    // One key, read once per session; nothing else writes it.
    staleTime: Infinity,
  });

  const ids = data ?? [];
  const dismissed = ids.includes(id);

  const dismiss = useCallback(() => {
    if (!userId || ids.includes(id)) return;
    const next = [...ids, id];
    // Paint the close immediately; put the note back if the write fails, so the
    // interface never claims to have remembered something it didn't.
    qc.setQueryData(queryKey, next);
    void putSetting(storageKey, JSON.stringify(next)).catch(() => {
      qc.setQueryData(queryKey, ids);
      toast.error("Couldn't save that — this note will be back next time");
    });
  }, [userId, ids, id, qc, queryKey, storageKey]);

  return { dismissed, ready: isSuccess, dismiss };
}
