import { retrievability } from "@/lib/campaignSources";
import type { Asset } from "@/types/content";

/**
 * How much of a document there actually is.
 *
 * The row's second line wants the size of the file, and the API does not send
 * one — `Asset` has no size field. What it does send is the whole extracted
 * text of every asset (`GET /api/content-bank/assets`), which the front end
 * has always thrown away. So the row states what the campaign can *read*
 * instead of what the file weighs, which is the more useful of the two here
 * and costs one pass over something already in memory.
 *
 * It also catches the case a size never would: a PDF that uploaded perfectly
 * and extracted to nothing.
 */
export function wordCount(asset: Pick<Asset, "content">): number {
  const text = asset.content.trim();
  return text === "" ? 0 : text.split(/\s+/).length;
}

/** "1,240 words" — or why there aren't any. */
export function extentLabel(asset: Pick<Asset, "content" | "status">): string {
  const count = wordCount(asset);
  if (count > 0) return `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;
  // Empty while the server is still working on it is a wait, not a verdict.
  return retrievability(asset.status) === "waiting"
    ? "Not read yet"
    : "Nothing extracted";
}
