import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib";
import type { FixTarget } from "@/lib/campaignReadiness.ts";

/** One module card on the Campaign Overview screen. */
export function OverviewCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  /** Right side of the header row — usually a `SectionLink`. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h2 className="font-display text-base font-medium">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A typed link to the campaign section (or workspace settings) that fixes or
 * drills into whatever a module is showing. Branching per target keeps the
 * router's route-id typing intact.
 */
export function SectionLink({
  target,
  campaignId,
  className,
  children,
}: {
  target: FixTarget;
  campaignId: string;
  className?: string;
  /** Optional: `LineItem asChild` injects the row's markup as children. */
  children?: ReactNode;
}) {
  const params = { campaignId };
  switch (target) {
    case "brief":
      return (
        <Link to="/campaigns/$campaignId/brief" params={params} className={className}>
          {children}
        </Link>
      );
    case "settings":
      return (
        <Link to="/campaigns/$campaignId/settings" params={params} className={className}>
          {children}
        </Link>
      );
    case "assets":
      return (
        <Link to="/campaigns/$campaignId/assets" params={params} className={className}>
          {children}
        </Link>
      );
    case "posts":
      return (
        <Link to="/campaigns/$campaignId/list" params={params} className={className}>
          {children}
        </Link>
      );
    case "workspace-settings":
      return (
        <Link to="/workspace-settings" className={className}>
          {children}
        </Link>
      );
  }
}

/** The standard drill-down affordance: a bare 16px chevron. */
export function CardHeaderLink({
  target,
  campaignId,
  label,
}: {
  target: FixTarget;
  campaignId: string;
  /** Accessible name for the chevron, e.g. "Edit brief". */
  label: string;
}) {
  return (
    <SectionLink
      target={target}
      campaignId={campaignId}
      className="text-tertiary-foreground hover:text-primary-foreground shrink-0"
    >
      <span className="sr-only">{label}</span>
      <CaretRightIcon className="size-4" />
    </SectionLink>
  );
}

/**
 * The one-line form of a module that's in good shape: title, inline status,
 * and the chevron to drill into its section.
 */
export function CollapsedCard({
  title,
  target,
  campaignId,
  label,
  children,
}: {
  title: string;
  target: FixTarget;
  campaignId: string;
  /** Accessible name for the chevron, e.g. "Edit brief". */
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md bg-primary px-5 py-4 flex items-center gap-4 min-w-0">
      <h2 className="font-display text-base font-medium shrink-0">{title}</h2>
      <div className="flex flex-1 items-center gap-3 min-w-0">{children}</div>
      <CardHeaderLink target={target} campaignId={campaignId} label={label} />
    </section>
  );
}
