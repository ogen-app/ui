/**
 * Reference data every authenticated screen ends up needing — campaign types,
 * tags, platforms — warmed once per page load.
 *
 * This used to run at module scope in `main.tsx`, which meant three requests
 * fired before anything knew whether there was a session. On the login screen
 * all three 401'd: wasted round-trips, a console full of errors on the one
 * page a new user sees first, and — since the API layer learned to recover
 * from a 401 — three calls into the session-expiry path before the user has
 * even tried to log in.
 *
 * Calling it from the authenticated layout instead ties it to the fact it
 * depends on: someone is logged in.
 */

import { queryClient, QUERY_FIVE_MINUTES } from "@/lib/queryClient";
import { CAMPAIGN_TYPES_KEY } from "@/hooks/useCampaigns";
import { TAGS_KEY } from "@/hooks/useTags";
import { PLATFORMS_KEY } from "@/hooks/usePlatforms";
import { listCampaignTypes } from "@/services/api/campaigns";
import { listTags } from "@/services/api/tags";
import { listPlatforms } from "@/services/api/platforms";

let started = false;

/**
 * Re-arms the prefetch. Called from `clearAllApplicationData` on logout:
 * `started` is module state, so it survives an in-SPA logout, and without
 * this the next session's `/_authenticated` load would skip the prefetch and
 * read the previous session's campaign types, tags and platforms out of the
 * still-warm cache.
 */
export function resetPrefetchLatch(): void {
  started = false;
}

/** Idempotent: the layout remounts on every navigation, the fetches don't. */
export function prefetchReferenceData(): void {
  if (started) return;
  started = true;

  void queryClient.prefetchQuery({
    queryKey: CAMPAIGN_TYPES_KEY,
    queryFn: listCampaignTypes,
    staleTime: Infinity,
  });
  void queryClient.prefetchQuery({
    queryKey: TAGS_KEY,
    queryFn: listTags,
    staleTime: QUERY_FIVE_MINUTES,
  });
  void queryClient.prefetchQuery({
    queryKey: PLATFORMS_KEY,
    queryFn: listPlatforms,
    staleTime: Infinity,
  });
}
