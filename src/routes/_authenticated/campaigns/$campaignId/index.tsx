import { createFileRoute, redirect } from "@tanstack/react-router";

// /campaigns/:id → the Overview control panel (CON-120). The calendar stays
// one click away via the sidebar's Posts item.
export const Route = createFileRoute("/_authenticated/campaigns/$campaignId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/campaigns/$campaignId/overview",
      params: { campaignId: params.campaignId },
    });
  },
});
