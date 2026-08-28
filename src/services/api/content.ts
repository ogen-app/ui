import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/types/content";
import { apiJson, apiVoid } from "./http";

const BASE = "/api/content-bank/assets";

export function listAssets(): Promise<Asset[]> {
  return apiJson<Asset[]>(BASE, "Unable to fetch assets");
}

export function getAsset(id: string): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/${id}`, "Unable to fetch asset");
}

export function createAsset(payload: CreateAssetPayload): Promise<Asset> {
  return apiJson<Asset>(BASE, "Unable to create asset", { method: "POST", body: payload });
}

/**
 * Submits a web page to be scraped into an asset (CON-222).
 *
 * Ingestion is asynchronous: what comes back is an asset with no content yet,
 * whose `status` walks `pending → processing → ready | partial | failed` while
 * a worker reads the page. The reply is 201 for a URL this workspace hasn't
 * saved and 200 for one it has — in which case that asset is re-scraped in
 * place rather than duplicated. Both answers are the asset to follow, so the
 * distinction stops here.
 *
 * A 409 means this deployment has no scraping key configured, which is a state
 * to explain rather than an error the user caused.
 */
export function createUrlAsset(url: string): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/url`, "Unable to read that page", {
    method: "POST",
    body: { url },
  });
}

export function updateAsset(id: string, payload: UpdateAssetPayload): Promise<Asset> {
  return apiJson<Asset>(`${BASE}/${id}`, "Unable to update asset", { method: "PUT", body: payload });
}

export function deleteAsset(id: string): Promise<void> {
  return apiVoid(`${BASE}/${id}`, "Unable to delete asset", { method: "DELETE" });
}
