import { cn } from '@/lib'
import { PASSWORD_RULES } from '@/lib/auth-validation'

/**
 * The password policy, written as one sentence that colours itself in as the
 * rules are met — "Min. 8 chars, an uppercase, a lowercase, and a digit".
 *
 * A sentence rather than a checklist because it also has to read as the
 * *instruction* before anything is typed, when nothing is green yet: a column
 * of unticked boxes says "four things you have failed", which is a strange
 * thing to tell someone who has not started.
 *
 * It doubles as the password field's error message, which is why the field
 * that renders this shows no separate one — `aria-describedby` should point
 * here. Two texts saying the same rule, one red and one grey, is worse than
 * the rule going green.
 */
export function PasswordRules({ value, id }: { value: string; id?: string }) {
  const allPassed = PASSWORD_RULES.every(({ test }) => test(value))

  return (
    <p
      id={id}
      className={cn('text-xs', allPassed ? 'text-positive' : 'text-tertiary-foreground')}
    >
      {PASSWORD_RULES.map(({ test, label }, i) => {
        const isLast = i === PASSWORD_RULES.length - 1
        return (
          <span
            key={label}
            className={cn(test(value) ? 'text-positive' : 'text-tertiary-foreground')}
          >
            {isLast ? 'and ' : ''}
            {label}
            {isLast ? '' : ', '}
          </span>
        )
      })}
      {allPassed && ' ✓'}
    </p>
  )
}
