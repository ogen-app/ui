import { useTranslation } from 'react-i18next'

import { usePasswordRules } from '@/hooks/useAuthSchemas'
import { cn } from '@/lib'

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
 *
 * The joins come from the catalogue rather than being literals: the rules are
 * coloured individually, but English's ", and " is Spanish's " y ", so the
 * separators translate alongside the rules themselves.
 */
export function PasswordRules({ value, id }: { value: string; id?: string }) {
  const { t } = useTranslation()
  const rules = usePasswordRules()
  const allPassed = rules.every(({ test }) => test(value))

  return (
    <p
      id={id}
      className={cn(
        'text-xs',
        allPassed ? 'text-positive' : 'text-tertiary-foreground',
      )}
    >
      {rules.map(({ test, label }, i) => (
        <span key={label}>
          {i > 0 &&
            (i === rules.length - 1
              ? t('validation.passwordRules.lastSeparator')
              : t('validation.passwordRules.separator'))}
          <span
            className={cn(
              test(value) ? 'text-positive' : 'text-tertiary-foreground',
            )}
          >
            {label}
          </span>
        </span>
      ))}
      {allPassed && ' ✓'}
    </p>
  )
}
