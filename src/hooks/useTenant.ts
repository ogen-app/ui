import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentTenant, renameTenant } from "@/services/api/tenants";
import { useAuthStore } from "@/stores/authStore";
import type { Tenant } from "@/types/tenant";

export const TENANT_KEY = ["tenant", "current"] as const;

/** The caller's own tenant (CON-97: exactly one per user). */
export function useCurrentTenant() {
  return useQuery({
    queryKey: TENANT_KEY,
    queryFn: getCurrentTenant,
    staleTime: 30_000,
  });
}

export function useRenameTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameTenant(id, name),
    onSuccess: (tenant: Tenant) => {
      qc.setQueryData(TENANT_KEY, tenant);
      // Keep the sidebar's workspace label (hydrated via the auth store) in
      // sync without waiting for the next session probe.
      const { user, setUser } = useAuthStore.getState();
      if (user) setUser({ ...user, tenant });
    },
  });
}
