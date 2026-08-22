import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/toaster";
import { LocaleSwitchOverlay } from "./components/layout/LocaleSwitchOverlay";
import { FLAG_IDS } from "./config/featureFlags";
import { DEV_TOOLS, bootstrapFlagOverrides } from "./config/flagOverrides";
import { bootstrapLocale } from "./stores/localeStore";
import "./i18n";
import "./index.css";

// Before `createRouter`, deliberately: this strips `?lang=` from the address
// bar, and the router reads `window.location` as it is constructed. It also
// puts the switching screen up synchronously when the resolved language isn't
// the bundled one, so the first paint is the loader rather than a flash of
// English. See `stores/localeStore.ts`.
bootstrapLocale();

// Also before `createRouter`, and for the same two reasons: `?ff=` is stripped
// from the address bar the router is about to read, and a flag forced by the
// link has to be in force before the first `beforeLoad` guard consults one.
// Folds away entirely in a production build. See `config/flagOverrides.ts`.
bootstrapFlagOverrides(FLAG_IDS);

// Only ever mounted on staging and in dev: with `DEV_TOOLS` a build-time
// `false` the ternary collapses and the marker's chunk is never emitted.
const OverrideMarker = DEV_TOOLS
  ? lazy(() => import("./devtools/OverrideMarker"))
  : () => null;

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <LocaleSwitchOverlay />
      <Suspense fallback={null}>
        <OverrideMarker />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>
);
