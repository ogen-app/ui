import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConnectLink,
  disconnectZernioAccount,
  getZernioHealth,
  listZernioAccounts,
  triggerZernioSync,
} from "@/services/api/zernio";
import { PLATFORMS_KEY } from "@/hooks/usePlatforms";
import { ZernioError } from "@/types/integrations";
import { toast } from "@/stores/toastStore";

export const ZERNIO_HEALTH_KEY = ["zernio", "health"] as const;
export const ZERNIO_ACCOUNTS_KEY = ["zernio", "accounts"] as const;

export function useZernioHealth() {
  return useQuery({
    queryKey: ZERNIO_HEALTH_KEY,
    queryFn: getZernioHealth,
    staleTime: 60_000,
    // Only poll while the integration is reconnecting; otherwise rely on
    // explicit invalidation (after upserting the Zernio key, after Sync now).
    refetchInterval: (query) =>
      query.state.data?.state === "degraded" ? 60_000 : false,
  });
}

export function useZernioAccounts() {
  return useQuery({
    queryKey: ZERNIO_ACCOUNTS_KEY,
    queryFn: listZernioAccounts,
    staleTime: 30_000,
  });
}

export function useCreateConnectLink() {
  return useMutation({
    // The connect modal is already open and showing this mutation's state; it
    // renders the failure in place, through `connectErrorMessage`, which maps
    // the typed Zernio errors (rate limit, disabled, degraded) to copy a
    // generic toast couldn't.
    meta: { errorToast: false },
    mutationFn: (platform: string) => createConnectLink(platform),
  });
}

/**
 * Disconnects one social account (CON-133).
 *
 * Invalidates the platform list because that — not the Zernio account list —
 * is what the composer's account picker and the settings rows read. Post
 * queries are deliberately left alone: a soft-delete doesn't clear a post's
 * `social_account_id`, so nothing about a post changes. What changes is that
 * the account drops out of the platform's active set, which is exactly how
 * `resolvePublishingAccount` starts reporting the post as mismatched.
 */
export function useDisconnectZernioAccount() {
  const qc = useQueryClient();
  return useMutation({
    // Two of this endpoint's failures aren't failures to report, so the
    // triage below owns the toast rather than the default (see `onError`).
    meta: { errorToast: false },
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      disconnectZernioAccount(id, force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLATFORMS_KEY });
      qc.invalidateQueries({ queryKey: ZERNIO_ACCOUNTS_KEY });
      qc.invalidateQueries({ queryKey: ZERNIO_HEALTH_KEY });
    },
    onError: (err) => {
      // A 404 means the account is already gone — a concurrent disconnect, or
      // the reconciler seeing it vanish upstream. The request failed but our
      // view is the stale thing, so refresh it rather than leave a row the
      // user can only fail to click again. The user wanted the account gone
      // and it is gone, so there is nothing to tell them.
      if (err instanceof ZernioError && err.code === "account_not_found") {
        qc.invalidateQueries({ queryKey: PLATFORMS_KEY });
        qc.invalidateQueries({ queryKey: ZERNIO_ACCOUNTS_KEY });
        return;
      }
      // The scheduled-posts guard doing its job — `DisconnectAccountDialog`
      // catches this one and turns it into the next question ("disconnect
      // anyway?"), which a toast would only talk over.
      if (
        err instanceof ZernioError &&
        err.code === "account_has_scheduled_posts"
      ) {
        return;
      }
      toast.error(err instanceof Error ? err.message : "Unable to disconnect");
    },
  });
}

export function useTriggerZernioSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => triggerZernioSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZERNIO_ACCOUNTS_KEY });
      qc.invalidateQueries({ queryKey: ZERNIO_HEALTH_KEY });
      qc.invalidateQueries({ queryKey: PLATFORMS_KEY });
    },
  });
}
