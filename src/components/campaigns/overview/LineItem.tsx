import { cloneElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  CaretRightIcon,
  CheckCircleIcon,
  CircleIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib";

/**
 * The one row shape every list on the Campaign Overview uses: attention
 * notifications, setup tasks, post rows.
 *
 * Anatomy — a fixed 40px band, whatever the row says:
 *
 *   [16px indicator] · label ······································ [16px chevron]
 *                      details (optional; wraps, the row grows, the band doesn't)
 *
 * Both 16px slots are always reserved even when empty, so labels line up
 * down a list of mixed rows. Everything else is optional: a row can be a
 * notification or a task, with a status or without, one line or two.
 */

/** Colour of a notification's dot. Severity is carried by the dot alone. */
export type LineItemTone = "alert" | "warning" | "neutral";

const DOT: Record<LineItemTone, string> = {
  alert: "bg-destructive",
  warning: "bg-warning",
  neutral: "bg-senary-foreground",
};

/**
 * What sits in the left slot. Omitted entirely = a statusless row: the slot
 * stays reserved and draws nothing.
 */
export type LineItemIndicator =
  /** Something is true and worth knowing — a dot, coloured by tone. */
  | { kind: "notification"; tone: LineItemTone }
  /** Something to do — a checkbox that is either ticked or empty. */
  | { kind: "task"; done: boolean }
  /** Anything else that fits 16px, e.g. a channel icon on a post row. */
  | { kind: "custom"; node: ReactNode };

/** The band a one-line row occupies; the indicator and chevron pin to it. */
const BAND = "h-10";

export function LineItem({
  indicator,
  label,
  details,
  trailing,
  chevron,
  asChild = false,
  className,
  children,
}: {
  indicator?: LineItemIndicator;
  label: ReactNode;
  /** Second line: the row grows past 40px, the slots stay on the first band. */
  details?: ReactNode;
  /** Before the chevron: an action hint, a status badge, a timestamp. */
  trailing?: ReactNode;
  /** Defaults to "whenever the row is interactive" — a chevron implies a destination. */
  chevron?: boolean;
  /** Render as `children` (a `Link`, a `button`) instead of a plain `div`. */
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const interactive = asChild && isValidElement(children);
  const showChevron = chevron ?? interactive;

  const content = (
    <>
      <span
        className={cn("flex w-4 shrink-0 items-center justify-center", BAND)}
      >
        <Indicator indicator={indicator} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2.5">
        <span className="truncate text-sm leading-5">{label}</span>
        {details && (
          <span className="text-xs leading-4 text-tertiary-foreground">
            {details}
          </span>
        )}
      </span>

      {/* Not `trailing &&`: a trailing `0` is falsy, and React would print the
          bare number outside the styled span instead of skipping it. */}
      {trailing != null && trailing !== false && (
        <span
          className={cn(
            "flex shrink-0 items-center gap-2 text-xs text-tertiary-foreground",
            BAND,
          )}
        >
          {trailing}
        </span>
      )}

      <span
        className={cn(
          "flex w-4 shrink-0 items-center justify-center",
          BAND,
          interactive && "text-tertiary-foreground group-hover:text-primary-foreground",
        )}
      >
        {showChevron && (
          <CaretRightIcon className="size-4" weight="bold" aria-hidden />
        )}
      </span>
    </>
  );

  const rowClassName = cn(
    "group -mx-2 flex min-h-10 items-start gap-3 rounded-md px-2",
    interactive && "hover:bg-secondary",
    className,
  );

  // `asChild` hands the row's markup to the caller's element (a Link, a
  // button) so the whole 40px band is the hit target, not just the label.
  if (interactive) {
    return (
      <Slot className={rowClassName}>
        {cloneElement(children as ReactElement, undefined, content)}
      </Slot>
    );
  }

  return <div className={rowClassName}>{content}</div>;
}

function Indicator({ indicator }: { indicator?: LineItemIndicator }) {
  if (!indicator) return null;
  switch (indicator.kind) {
    case "notification":
      return (
        <span
          className={cn("size-1.5 rounded-full", DOT[indicator.tone])}
          aria-hidden
        />
      );
    case "task":
      return indicator.done ? (
        <CheckCircleIcon weight="fill" className="size-4 text-positive" />
      ) : (
        <CircleIcon className="size-4 text-senary-foreground" />
      );
    case "custom":
      return <>{indicator.node}</>;
  }
}
