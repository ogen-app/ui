import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CaretRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { formatAnchor } from "@/components/campaigns/calendar/date.ts";
import { cn } from "@/lib";
import {
  campaignSection,
  type CampaignSectionId,
} from "@/lib/campaignSections.ts";
import type { FixTarget } from "@/lib/campaignReadiness.ts";

/**
 * Where a card sends the user. `calendar` is the one destination the fix rules
 * don't have a name for: an attention row about a post opens the list it can be
 * fixed in, while the Content card opens the week the posts live in.
 */
export type CardTarget = FixTarget | "calendar";

/** Where a card's "open" button goes. */
export type CardLink = {
  target: CardTarget;
  campaignId: string;
};

/**
 * One module card on the Campaign Overview screen. Capped at the shared
 * content-column width and centred, so the screen reads as one column like
 * the Brief and Settings pages rather than stretching to the viewport.
 *
 * A card that has somewhere to go says so with a button, not with a header that
 * lights up: a tinted header row is a hit area you have to discover by sweeping
 * the card, and it competes with the card-wide hover the good-news form uses
 * (`CollapsedCard`). One rule across the screen — a header is never a control.
 */
export function OverviewCard({
  section,
  title,
  icon,
  status,
  link,
  children,
  className,
}: {
  /** Sets the card's title, glyph and open-button label from one table. */
  section?: CampaignSectionId;
  /** For a card that isn't one of the campaign's sections. */
  title?: string;
  /** Ditto — the mark beside such a card's title. */
  icon?: ReactNode;
  /**
   * Sits in the header beside the title — normally a `StatusBadge`. A module's
   * verdict belongs here whether it's good news or not, so the body is free to
   * be about what to do next.
   */
  status?: ReactNode;
  /** Adds the open button. Needs `section`, which is where its label comes from. */
  link?: CardLink;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const meta = section ? campaignSection(section) : undefined;
  const Glyph = meta?.icon;
  const heading = title ?? (meta ? t(meta.labelKey) : undefined);

  return (
    <section
      className={cn(
        "w-full max-w-content mx-auto rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0",
        className,
      )}
    >
      {(heading || status || link) && (
        <div className="flex items-center gap-3 min-w-0">
          <CardGlyph>
            {Glyph ? (
              <Glyph className="size-5" style={{ color: meta?.tone }} aria-hidden />
            ) : (
              icon
            )}
          </CardGlyph>
          {heading && (
            <h2 className="font-display text-base font-medium shrink-0">
              {heading}
            </h2>
          )}
          {status}
          {link && meta && (
            <Button variant="ghost" size="sm" className="ml-auto shrink-0" asChild>
              <SectionLink target={link.target} campaignId={link.campaignId}>
                {t(meta.openKey)}
              </SectionLink>
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * The header's mark slot: 16px of layout, whatever is standing in it.
 *
 * The same 16px the rows below reserve (`LineItem`), so a card's title starts
 * on the column its list items start on and the screen has one left edge for
 * text rather than one per card type. The glyph itself keeps its own size and
 * is centred on the slot — a mark drawn to 16px reads smaller than the title
 * beside it, and shrinking it to make the arithmetic tidy would be optimising
 * the grid at the mark's expense. The 2px it spills each side is over the
 * card's padding on one side and the gap on the other, so nothing collides.
 */
function CardGlyph({ children }: { children?: ReactNode }) {
  return (
    <span className="flex w-4 shrink-0 items-center justify-center">
      {children}
    </span>
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
  label,
  children,
}: {
  target: CardTarget;
  campaignId: string;
  className?: string;
  /** Accessible name, for a link whose contents are a whole card. */
  label?: string;
  /** Optional: `LineItem asChild` injects the row's markup as children. */
  children?: ReactNode;
}) {
  const params = { campaignId };
  const named = { "aria-label": label };
  switch (target) {
    case "brief":
      return (
        <Link to="/campaigns/$campaignId/brief" params={params} className={className} {...named}>
          {children}
        </Link>
      );
    case "settings":
      return (
        <Link to="/campaigns/$campaignId/settings" params={params} className={className} {...named}>
          {children}
        </Link>
      );
    case "assets":
      return (
        <Link to="/campaigns/$campaignId/assets" params={params} className={className} {...named}>
          {children}
        </Link>
      );
    case "posts":
      return (
        <Link to="/campaigns/$campaignId/list" params={params} className={className} {...named}>
          {children}
        </Link>
      );
    case "calendar":
      // The current week, exactly as the sidebar's own Posts row opens it.
      return (
        <Link
          to="/campaigns/$campaignId/calendar/$anchor/$view"
          params={{ campaignId, anchor: formatAnchor(new Date()), view: "week" }}
          className={className}
          {...named}
        >
          {children}
        </Link>
      );
    case "analytics":
      return (
        <Link to="/campaigns/$campaignId/analytics" params={params} className={className} {...named}>
          {children}
        </Link>
      );
    case "workspace-settings":
      return (
        <Link to="/workspace-settings" className={className} {...named}>
          {children}
        </Link>
      );
  }
}

/**
 * The short form of a module that's in good shape: nothing to do, so nothing to
 * act on — the whole card is the link, exactly as a campaign on the Campaigns
 * list is. The lift on hover is the affordance; there is no tint, because a
 * card that fills with grey reads as selected rather than as clickable.
 *
 * `aria-label` names the link "OPEN BRIEF" instead of letting it read out as
 * its own contents — title, badge and summary line in one breath. The contents
 * are still there to browse; this is just the name.
 */
export function CollapsedCard({
  section,
  target,
  campaignId,
  status,
  children,
}: CardLink & {
  section: CampaignSectionId;
  /** Sits in the header beside the title — normally a `StatusBadge`. */
  status?: ReactNode;
  /** The summary line: what this module currently holds. */
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { icon: Glyph, tone, labelKey, openKey } = campaignSection(section);

  return (
    <SectionLink
      target={target}
      campaignId={campaignId}
      className="group w-full max-w-content mx-auto rounded-md bg-primary px-5 py-4 flex flex-col gap-2 min-w-0 cursor-pointer transition-shadow duration-150 hover:shadow-lg"
      label={t(openKey)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <CardGlyph>
          <Glyph className="size-5" style={{ color: tone }} aria-hidden />
        </CardGlyph>
        <h2 className="font-display text-base font-medium shrink-0">
          {t(labelKey)}
        </h2>
        {status}
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
