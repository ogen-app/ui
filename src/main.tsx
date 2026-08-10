import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/toaster";
import "./index.css";

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
    </QueryClientProvider>
  </StrictMode>
);
