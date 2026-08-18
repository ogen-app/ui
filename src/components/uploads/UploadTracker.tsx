import { useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ZIndex } from "@/config/zIndex";
import { useUploadStore } from "@/stores/uploadStore";
import { UploadRow } from "./UploadRow";

/**
 * App-level, non-blocking upload panel docked bottom-right. Renders nothing when
 * idle. Mounted once in the authenticated layout so it persists across
 * navigation while PDFs finish processing in the background.
 *
 * It stays out of the way of the page the file was dropped on: a campaign's
 * Content page — and the workspace bank behind it — shows its own uploads in
 * the list they are joining, so this panel would be the same three files
 * reported twice, in two places, in two shapes. What it is left with is exactly
 * what those pages cannot show — the uploads still running somewhere you are no
 * longer looking.
 */
export function UploadTracker() {
  const all = useUploadStore((s) => s.items);
  const clearFinished = useUploadStore((s) => s.clearFinished);
  const pathname = useLocation({ select: (l) => l.pathname });

  // Which list is on screen, and therefore already reporting its own uploads:
  // a campaign's Content page, or the workspace bank (whose uploads carry no
  // campaign at all).
  const openCampaign = pathname.match(/^\/campaigns\/([^/]+)\/content$/)?.[1] ?? null;
  const bankOpen = pathname === "/content-bank";
  const items =
    openCampaign !== null || bankOpen
      ? all.filter((it) => it.campaignId !== openCampaign)
      : all;

  if (items.length === 0) return null;

  const active = items.filter(
    (it) => it.phase === "uploading" || it.phase === "processing",
  ).length;

  return (
    <div
      className="fixed bottom-4 right-4 flex w-80 max-h-[60vh] flex-col bg-popover shadow-lg"
      style={{ zIndex: ZIndex.uploadTracker }}
    >
      <div className="flex items-center justify-between bg-quaternary px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {active > 0 ? `Uploading ${active}…` : "Uploads"}
        </span>
        <Button variant="ghost" size="sm" onClick={clearFinished}>
          Clear
        </Button>
      </div>
      <div className="flex flex-col overflow-y-auto px-4 py-1">
        {items.map((item) => (
          <UploadRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
