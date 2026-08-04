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
import { retrievability } from "@/lib/campaignSources";
import { cn, formatTitle } from "@/lib";
import type { Asset } from "@/types/content";

type AssetRow = Asset & Record<string, unknown>;

type Props = {
  assets: Asset[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Off when the pool is read-only context rather than a shortlist. */
  selectable?: boolean;
  emptyStateMessage?: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The Content Bank's cell shell: same height, same hairline, same padding. */
const CELL = "h-[34px] border-b-2 border-background px-3 leading-8";

/**
 * The Content Bank table, with assignment.
 *
 * Deliberately the same table: same columns, metrics, and colours as
 * `tables/docsTable`, so an asset looks the same wherever you meet it. Two
 * things are added and one is swapped — a checkbox column in front, a title
 * that toggles instead of navigating, and an open-in-a-new-tab control where
 * the Content Bank puts delete.
 *
 * Both of those are for the same reason: leaving the page mid-edit would strand
 * a queued save, so nothing here navigates in this tab.
 *
 * `selectable` off is whole-bank mode, where every row comes in checked and
 * frozen — the table is showing what "all assets" resolves to, not asking.
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
          <div className={cn(CELL, "flex items-center justify-center")}>
            <Checkbox
              checked={selected.has(row.id)}
              disabled={!selectable}
              onCheckedChange={() => onToggle(row.id)}
              aria-label={`Assign ${formatTitle(row.title)}`}
            />
          </div>
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        isAutoSize: true,
        cell: (_value, row) => {
          // An asset retrieval will never reach reads as inactive, whether or
          // not it happens to be attached.
          const inert = retrievability(row.status) === "never";
          return (
            <button
              type="button"
              onClick={() => onToggle(row.id)}
              disabled={!selectable}
              className={cn(
                CELL,
                "block w-full text-left",
                selectable ? "cursor-pointer hover:underline" : "cursor-default",
                inert && "text-tertiary-foreground",
              )}
            >
              <TextCell value={formatTitle(row.title)} />
            </button>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: 130,
        minSize: 110,
        cell: (_value, row) => {
          const badge = statusToBadge(row.status);
          return (
            <div className={CELL}>
              <StatusBadge tone={badge.tone} label={badge.label} />
            </div>
          );
        },
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        size: 120,
        minSize: 100,
        cell: (_value, row) => (
          <div className={CELL}>
            <TextCell value={categoryLabel(assetCategory(row))} />
          </div>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: "Created",
        size: 140,
        minSize: 120,
        cell: (_value, row) => (
          <div className={CELL}>
            <TextCell value={formatDate(row.created_at)} />
          </div>
        ),
      },
      {
        id: "updated_at",
        accessorKey: "updated_at",
        header: "Last Modified",
        size: 140,
        minSize: 120,
        cell: (_value, row) => (
          <div className={CELL}>
            <TextCell value={formatDate(row.updated_at)} />
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 60,
        minSize: 60,
        sortable: false,
        cell: (_value, row) => (
          <div className={cn(CELL, "flex items-center justify-center px-3")}>
            <Link
              to="/content-bank/$assetId"
              params={{ assetId: row.id }}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${formatTitle(row.title)} in a new tab`}
              className="flex size-6 items-center justify-center"
            >
              <ArrowSquareOutIcon
                weight="bold"
                className="size-4 text-tertiary-foreground hover:text-primary-foreground"
              />
            </Link>
          </div>
        ),
      },
    ],
    [onToggle, selectable, selected],
  );

  const activeColumns = useMemo(
    () => [
      "select",
      "title",
      "status",
      "type",
      "created_at",
      "updated_at",
      "actions",
    ],
    [],
  );

  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      initialSorting={[{ id: "title", desc: false }]}
      estimatedRowHeight={34}
      overscan={8}
      showFooter={false}
      fillHeight={false}
      emptyStateMessage={emptyStateMessage}
    />
  );
}

export const AssetPoolTable = memo(AssetPoolTableComponent);
