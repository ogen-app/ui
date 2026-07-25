import { useRef, useState } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  CaretDownIcon,
  FileTextIcon,
  LinkSimpleIcon,
  PlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { PageContainer } from "@/components/page-primitives/PageContainer.tsx";
import { PageHeader } from "@/components/page-primitives/PageHeader.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { CampaignTabBar } from "@/components/campaigns/CampaignTabBar.tsx";
import { useCreateAsset } from "@/hooks/useContent.ts";
import { UploadModal } from "@/components/uploads/UploadModal";
import { useUploadStore } from "@/stores/uploadStore";
import { UPLOAD_LIMITS_LABEL } from "@/lib/assetStatus";
import { CONTENT_BANK_TABS, type ContentBankTab } from "@/lib/assetCategory";

export const Route = createFileRoute("/_authenticated/content-bank")({
  component: ContentBankLayout,
});

function activeTabFromPath(pathname: string): ContentBankTab {
  if (pathname.includes("/text")) return "text";
  if (pathname.includes("/imagery")) return "imagery";
  if (pathname.includes("/files")) return "files";
  return "all";
}

function ContentBankLayout() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();

  // The active tab is derived from the URL rather than local state.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeTab = activeTabFromPath(pathname);

  const enqueueUploads = useUploadStore((s) => s.enqueue);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  };

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) enqueueUploads(files);
  };

  const handleCreate = () => {
    createAsset.mutate(
      { title: " ", content: " " },
      {
        onSuccess: (asset) => {
          navigate({
            to: "/content-bank/$assetId",
            params: { assetId: asset.id },
          });
        },
      },
    );
  };

  const handleTabSelect = (id: string) => {
    if (id === activeTab) return;
    navigate({ to: `/content-bank/${id}` });
  };

  return (
    <PageContainer variant="fullFlex">
      <div
        className="relative flex flex-col h-full min-h-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <PageHeader
          title={"Content Bank"}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" loading={createAsset.isPending}>
                  <PlusIcon className={"size-4"} />
                  <span>ADD ASSET</span>
                  <CaretDownIcon className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                <DropdownMenuItem size="lg" onClick={handleCreate}>
                  <FileTextIcon />
                  <span>Create text file</span>
                </DropdownMenuItem>
                <DropdownMenuItem size="lg" onClick={() => setUploadModalOpen(true)}>
                  <UploadSimpleIcon />
                  <span>Upload file</span>
                </DropdownMenuItem>
                <DropdownMenuItem size="lg" disabled>
                  <LinkSimpleIcon />
                  <span>Extract from link</span>
                  <span className="text-xs text-tertiary-foreground">coming soon</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <CampaignTabBar
          activeTab={activeTab}
          tabs={CONTENT_BANK_TABS}
          onTabSelect={handleTabSelect}
        />
        <div className={"grid overflow-hidden h-full mt-1 px-3 lg:mt-2 lg:px-6"}>
          <Outlet />
        </div>

        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-popover/90 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <UploadSimpleIcon className="size-8 text-foreground" />
              <p className="text-sm text-foreground">Drop .md or .pdf files to upload</p>
              <p className="text-xs text-tertiary-foreground">{UPLOAD_LIMITS_LABEL}</p>
            </div>
          </div>
        )}
      </div>

      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </PageContainer>
  );
}
