import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib";
import type { FixTarget } from "@/lib/campaignReadiness.ts";

/** Where a card's header sends the user when it is clicked. */
export type CardLink = {
  target: FixTarget;
  campaignId: string;
  /** Accessible name for the header link, e.g. "Edit brief". */
  label: string;
};

/**
 * One module card on the Campaign Overview screen. Capped at the shared
 * content-column width and centred, so the screen reads as one column like
 * the Brief and Settings pages rather than stretching to the viewport.
 *
 * With a `link`, the whole header row is the hit target — title included, not
 * just the chevron.
 */
export function OverviewCard({
  title,
  status,
  link,
  action,
  children,
  className,
}: {
  title?: string;
  /**
   * Sits in the header beside the title — normally a `StatusBadge`. A module's
   * verdict belongs here whether it's good news or not, so the body is free to
   * be about what to do next.
   */
  status?: ReactNode;
  /** Makes the header row a link to the section this card summarizes. */
  link?: CardLink;
  /** Right side of the header row, for cards that act instead of navigate. */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const heading = (
    <>
      {title && (
        <h2 className="font-display text-base font-medium shrink-0">{title}</h2>
      )}
      {status}
    </>
  );

  return (
    <section
      className={cn(
        "w-full max-w-content mx-auto rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0",
        className,
      )}
    >
      {link ? (
        <SectionLink
          target={link.target}
          campaignId={link.campaignId}
          className="group -mx-2 -my-1 flex items-center gap-3 rounded-md px-2 py-1 hover:bg-secondary min-w-0"
        >
          {heading}
          <span className="sr-only">{link.label}</span>
          <CaretRightIcon
            className="ml-auto size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
            weight="bold"
            aria-hidden
          />
        </SectionLink>
      ) : (
        (title || status || action) && (
          <div className="flex items-center gap-3 min-w-0">
            {heading}
            {action && <span className="ml-auto">{action}</span>}
          </div>
        )
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
    case "analytics":
      return (
        <Link to="/campaigns/$campaignId/analytics" params={params} className={className}>
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

/**
 * The short form of a module that's in good shape. It keeps the card's header
 * — title, status, chevron — and puts the summary on its own line underneath,
 * rather than squeezing both into one row. The whole card is the link; there
 * is nothing else on it to click.
 */
export function CollapsedCard({
  title,
  target,
  campaignId,
  label,
  status,
  children,
}: CardLink & {
  title: string;
  /** Sits in the header beside the title — normally a `StatusBadge`. */
  status?: ReactNode;
  /** The summary line: what this module currently holds. */
  children: ReactNode;
}) {
  return (
    <SectionLink
      target={target}
      campaignId={campaignId}
      className="group w-full max-w-content mx-auto rounded-md bg-primary hover:bg-secondary px-5 py-4 flex flex-col gap-2 min-w-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="font-display text-base font-medium shrink-0">{title}</h2>
        {status}
        <span className="sr-only">{label}</span>
        <CaretRightIcon
          className="ml-auto size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
          weight="bold"
          aria-hidden
        />
      </div>
      <div className="flex items-center gap-3 min-w-0 text-sm text-secondary-foreground">
        {children}
      </div>
    </SectionLink>
  );
}
