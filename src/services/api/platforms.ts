import type { Platform } from "@/types/campaigns";
import type { PostTypeRuleView } from "@/types/validation";
import { apiJson } from "./http";

const BASE = "/api/platforms";

export function listPlatforms(): Promise<Platform[]> {
  return apiJson<Platform[]>(BASE, "Unable to fetch platforms");
}

export function getPostTypeRules(
  platformId: string
): Promise<PostTypeRuleView[]> {
  return apiJson<PostTypeRuleView[]>(
    `${BASE}/${platformId}/post-type-rules`,
    "Unable to fetch post-type rules"
  );
}
