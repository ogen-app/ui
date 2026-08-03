import type { ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib";
import { useSettingsStore } from "@/stores/settingsStore";

type Props = {
  /**
   * Stable id this note is remembered under. Name it for the thing being
   * explained (`campaign-content-sources`), not for the page — renaming it
   * un-dismisses the note for everyone who already closed it.
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
 * both. So the text is written for the first read and the user gets to end it.
 *
 * Because of that, an Explainer may only ever hold *teaching*. Anything the
 * user needs to see while working — a count, a warning, a validation message —
 * must live outside it, or it disappears with the note.
 *
 * Dismissals live in the persisted settings store, so they are per browser and
 * cost nothing to read — the note is gone on the first frame, with no request
 * to wait for and no row in the workspace-wide settings table.
 */
export function Explainer({ id, children, className }: Props) {
  const dismissed = useSettingsStore((s) => s.dismissedNotes.includes(id));
  const dismissNote = useSettingsStore((s) => s.dismissNote);

  if (dismissed) return null;

  return (
    <aside
      className={cn(
        "flex items-start gap-3 rounded-md bg-secondary px-4 py-3",
        className,
      )}
    >
      {/* The panel fills its column so it reads as part of the page, but the
          line length inside it doesn't — past ~75 characters the eye loses the
          start of the next line, and this is the one block on a page that is
          actually meant to be read. */}
      <div className="min-w-0 flex-1">
        <div className="max-w-150 text-base text-primary-foreground">
          {children}
        </div>
      </div>
      <Button
        variant="ghost"
        size="smIcon"
        className="-mr-1 shrink-0"
        aria-label="Hide this explanation"
        onClick={() => dismissNote(id)}
      >
        <XIcon />
      </Button>
    </aside>
  );
}
