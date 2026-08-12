/**
 * Puts the cursor on the first field a failed submit rejected.
 *
 * Every form here is `noValidate` — the browser's own "please fill in this
 * field" bubble is suppressed so the messages can be ours. What that gives up
 * is the browser also *focusing* the offending field. Without it, submitting
 * an invalid form leaves focus on the button and the only evidence is red text
 * somewhere above, which a screen reader never reads and a long form may not
 * even have on screen.
 *
 * Deferred by a frame because it reads `aria-invalid` off the DOM, and the
 * attribute is only true after React has re-rendered with the new errors.
 * Reading the errors directly would mean every form mapping field names to
 * refs; the flags are already there and already ordered by the markup.
 */
export function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}
