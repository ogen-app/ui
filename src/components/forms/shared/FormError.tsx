import { cn } from '@/lib'

/**
 * The one place an auth form reports what the server said — a wrong password,
 * a taken email, a spent reset link.
 *
 * Two things it must get right, which the four hand-rolled copies of it did
 * not all get right:
 *
 * - **It grows.** The slot reserves a line so the submit button doesn't jump
 *   when a message appears, but it is a *minimum*: the old fixed `h-4` was
 *   shorter than the 20px line it held, so descenders were clipped and a
 *   two-line message ran out of its box.
 * - **It announces.** A failed login is otherwise silent to a screen reader —
 *   focus stays on the button, and the only evidence is text that appeared
 *   somewhere below it. `role="alert"` is deliberate over `aria-live="polite"`:
 *   this interrupts, because the user is waiting on this answer.
 *
 * The region stays mounted while empty so assistive tech is already watching
 * it when the message arrives, and so the fade has something to fade.
 */
export function FormError({
  id,
  message,
  className,
  children,
}: {
  id?: string
  message?: string
  className?: string
  /** A way out of the failure, where one exists — e.g. "Request a new link". */
  children?: React.ReactNode
}) {
  return (
    <div
      id={id}
      role="alert"
      className={cn('my-4 flex min-h-4 flex-col gap-2', className)}
    >
      <span
        className={cn(
          'text-sm text-destructive transition-opacity duration-300',
          message ? 'opacity-100' : 'opacity-0',
        )}
      >
        {message}
      </span>
      {message && children}
    </div>
  )
}
