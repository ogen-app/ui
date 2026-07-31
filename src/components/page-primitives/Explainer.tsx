import type { ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useDismissedNote } from "@/hooks/useDismissedNote";
import { cn } from "@/lib";

type Props = {
  /**
   * Stable id this note is remembered under, account-wide. Name it for the
   * thing being explained (`campaign-content-sources`), not for the page —
   * renaming it un-dismisses the note for everyone who already closed it.
   */
  id: string;
  children: ReactNode;
  className?: string;
};

/**
 * A paragraph that explains how something works, with a close button that
 * means it.
 *
 * The problem this solves: copy that is exactly right the first time a user
 * meets a screen is furniture by the tenth, and there is no wording that is
 * both. So the text is written for the first read and the user gets to end it
 * — the dismissal is stored per user (`useDismissedNote`) and the note never
 * comes back, on any machine.
 *
 * Because of that, an Explainer may only ever hold *teaching*. Anything the
 * user needs to see while working — a count, a warning, a validation message —
 * must live outside it, or it disappears with the note.
 *
 * Renders nothing at all until the stored set has loaded, so a closed note
 * doesn't flash on every page load.
 */
export function Explainer({ id, children, className }: Props) {
  const { dismissed, ready, dismiss } = useDismissedNote(id);

  if (!ready || dismissed) return null;

  return (
    <aside
      className={cn(
        "flex items-start gap-3 rounded-md bg-secondary px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1 text-base text-primary-foreground">
        {children}
      </div>
      <Button
        variant="ghost"
        size="smIcon"
        className="-mr-1 shrink-0"
        aria-label="Hide this explanation"
        onClick={dismiss}
      >
        <XIcon />
      </Button>
    </aside>
  );
}
