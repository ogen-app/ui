import type { ReactNode } from "react";

/**
 * The one call-to-action shape on the Campaign Overview: a filled block that
 * says why the step matters, then what is missing, then the actions.
 *
 * Inverted on purpose. A module the user still has to act on has to read
 * differently from one that is only reporting, and the modules all share the
 * same white card — so the emphasis has to come from inside the card.
 */
export function CallToAction({
  headline,
  support,
  children,
}: {
  /** Line one: why this matters. */
  headline: ReactNode;
  /** Line two: what is missing right now. */
  support?: ReactNode;
  /** The buttons — style them with `CTA_PRIMARY` / `CTA_SECONDARY`. */
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md bg-primary-foreground px-5 py-5 text-primary">
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-5">{headline}</p>
        {support && <p className="text-sm leading-5 text-primary/60">{support}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * Button overrides for the inverted block: the shared variants assume a light
 * surface, so both of them need their hover state re-pointed.
 */
export const CTA_PRIMARY =
  "hover:bg-secondary hover:text-primary-foreground";
export const CTA_SECONDARY =
  "border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/30 hover:text-primary";
