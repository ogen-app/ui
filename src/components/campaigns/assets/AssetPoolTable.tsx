import { memo, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { VirtualTable } from "@/components/tables/VirtualTable";
import { TextCell } from "@/components/tables/TableCells";
import type { ColumnConfig } from "@/components/tables/types";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetCategory, categoryLabel } from "@/lib/assetCategory";
import { statusToBadge } from "@/lib/assetStatus";
import { retrievability } from "@/lib/campaignGrounding";
import { cn, formatTitle } from "@/lib";
import type { Asset } from "@/types/content";

type AssetRow = Asset & Record<string, unknown>;

type Props = {
  assets: Asset[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Off in the two non-shortlist modes: the pool is read-only context then. */
  selectable?: boolean;
  emptyStateMessage?: string;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Cell shell matching the table's row metrics (see `docsTable`). */
function Cell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-[34px] border-b-2 border-background px-3 leading-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The campaign's asset pool: one virtualized row per asset in the bank, with a
 * checkbox for attaching it.
 *
 * Clicking the title toggles attachment rather than opening the asset — this
 * page exists to pick, and its edits are unsaved until the header's Save. The
 * arrow at the end of the row opens the asset in a new tab for that reason: a
 * same-tab navigation would throw away an in-progress selection.
 */
function AssetPoolTableComponent({
  assets,
  selectedIds,
  onToggle,
  selectable = true,
  emptyStateMessage = "No assets match these filters",
}: Props) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const data = assets as AssetRow[];

  const columnConfigs = useMemo<ColumnConfig<AssetRow>[]>(
    () => [
      {
        id: "select",
        header: "",
        size: 44,
        minSize: 44,
        sortable: false,
        cell: (_value, row) => (
          <Cell className="flex items-center justify-center">
            <Checkbox
              checked={selected.has(row.id)}
              disabled={!selectable}
              onCheckedChange={() => onToggle(row.id)}
              aria-label={`Attach ${formatTitle(row.title)}`}
            />
          </Cell>
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        isAutoSize: true,
        sortable: false,
        cell: (_value, row) => {
          // An asset retrieval will never reach reads as inactive, whether or
          // not it happens to be attached.
          const inert = retrievability(row.status) === "never";
          return (
            <Cell className="p-0">
              <button
                type="button"
                onClick={() => onToggle(row.id)}
                disabled={!selectable}
                className={cn(
                  "block h-[34px] w-full px-3 text-left leading-8",
                  selectable ? "cursor-pointer" : "cursor-default",
                  inert && "text-tertiary-foreground",
                )}
              >
                <TextCell value={formatTitle(row.title)} />
              </button>
            </Cell>
          );
        },
      },
      {
        id: "tags",
        header: "Tags",
        size: 180,
        minSize: 120,
        sortable: false,
        cell: (_value, row) => (
          <Cell>
            <TextCell
              value={
                row.tags.length === 0
                  ? "—"
                  : row.tags.map((tag) => tag.name).join(", ")
              }
            />
          </Cell>
        ),
      },
      {
        id: "type",
        header: "Type",
        size: 90,
        minSize: 80,
        sortable: false,
        cell: (_value, row) => (
          <Cell>
            <TextCell value={categoryLabel(assetCategory(row))} />
          </Cell>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: 120,
        minSize: 100,
        sortable: false,
        cell: (_value, row) => {
          const badge = statusToBadge(row.status);
          return (
            <Cell>
              <StatusBadge tone={badge.tone} label={badge.label} />
            </Cell>
          );
        },
      },
      {
        id: "updated_at",
        accessorKey: "updated_at",
        header: "Last modified",
        size: 130,
        minSize: 120,
        sortable: false,
        cell: (_value, row) => (
          <Cell>
            <TextCell value={formatDate(row.updated_at)} />
          </Cell>
        ),
      },
      {
        id: "open",
        header: "",
        size: 48,
        minSize: 48,
        sortable: false,
        cell: (_value, row) => (
          <Cell className="flex items-center justify-center">
            <Link
              to="/content-bank/$assetId"
              params={{ assetId: row.id }}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${formatTitle(row.title)} in a new tab`}
              className="flex size-6 items-center justify-center text-tertiary-foreground hover:text-primary-foreground"
            >
              <ArrowSquareOutIcon className="size-4" />
            </Link>
          </Cell>
        ),
      },
    ],
    [onToggle, selectable, selected],
  );

  const activeColumns = useMemo(
    () => ["select", "title", "tags", "type", "status", "updated_at", "open"],
    [],
  );

  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      estimatedRowHeight={34}
      overscan={8}
      showFooter={false}
      fillHeight
      emptyStateMessage={emptyStateMessage}
    />
  );
}

export const AssetPoolTable = memo(AssetPoolTableComponent);
