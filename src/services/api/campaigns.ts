import type {
  Campaign,
  CampaignType,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from "@/types/campaigns";
import type { CampaignSummariesResponse, PostSummary } from "@/types/posts";
import { apiJson, apiVoid } from "./http";

const BASE = "/api/campaigns";
const TYPES_BASE = "/api/campaign_types";

export function listCampaigns(): Promise<Campaign[]> {
  return apiJson<Campaign[]>(BASE, "Unable to fetch campaigns");
}

export function getCampaign(id: string): Promise<Campaign> {
  return apiJson<Campaign>(`${BASE}/${id}`, "Unable to fetch campaign");
}

export function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  return apiJson<Campaign>(BASE, "Unable to create campaign", { method: "POST", body: payload });
}

export function updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
  return apiJson<Campaign>(`${BASE}/${id}`, "Unable to update campaign", { method: "PUT", body: payload });
}

export function deleteCampaign(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, "Unable to delete campaign", { method: "DELETE" });
}

/**
 * Every campaign's posts in one request, as slim projections (CON-152).
 *
 * Replaces the burst of `GET /campaigns/:id/posts` the Campaigns list used to
 * fire — one per card, each fully hydrated — with a single call. Returned as a
 * lookup rather than the wire's array because that is how every caller uses
 * it: a card asks for its own campaign and expects `[]` when it has no posts,
 * and the server omits empty campaigns entirely.
 */
export async function listCampaignSummaries(): Promise<Record<string, PostSummary[]>> {
  const res = await apiJson<CampaignSummariesResponse>(
    `${BASE}/summaries`,
    "Unable to fetch campaign summaries",
  );
  const byCampaign: Record<string, PostSummary[]> = {};
  for (const summary of res.summaries ?? []) {
    byCampaign[summary.campaign_id] = summary.posts ?? [];
  }
  return byCampaign;
}

export function listCampaignTypes(): Promise<CampaignType[]> {
  return apiJson<CampaignType[]>(TYPES_BASE, "Unable to fetch campaign types");
}
