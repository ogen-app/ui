import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/toaster";
import { LocaleSwitchOverlay } from "./components/layout/LocaleSwitchOverlay";
import { bootstrapLocale } from "./stores/localeStore";
import { isFeatureEnabled } from "./config/featureFlags";
import "./i18n";
import "./index.css";

// Before `createRouter`, deliberately: this strips `?lang=` from the address
// bar, and the router reads `window.location` as it is constructed. It also
// puts the switching screen up synchronously when the resolved language isn't
// the bundled one, so the first paint is the loader rather than a flash of
// English. See `stores/localeStore.ts`.
bootstrapLocale();

// Reference-data prefetching moved to the authenticated layout's loader — at
// module scope it fired before the session probe and 401'd on the login page.
// See `lib/prefetch.ts`.

const router = createRouter({
  routeTree,
  context: {
    auth: { isAuthenticated: false },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}


/**
 * The multi-workspace endpoints are stubbed in development (`src/mocks/`)
 * until the Go API grows them. The worker has to be listening before the first
 * request leaves — including the root guard's session probe — so boot is
 * async. The import is inside the branch: a production build drops both it and
 * MSW entirely.
 *
 * Gated on the feature flag as well as on DEV, because the stubs overlay
 * `GET /api/tenants/current`: with the feature off that would answer a real
 * request with invented data, which is exactly what the flag rule forbids.
 */
async function startStubs(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_STUB_WORKSPACES === "false") return;
  if (!isFeatureEnabled("multi-workspace")) return;
  const { startWorkspaceStubs } = await import("./mocks/browser");
  await startWorkspaceStubs();
}

startStubs().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
        <LocaleSwitchOverlay />
      </QueryClientProvider>
    </StrictMode>
  );
});
