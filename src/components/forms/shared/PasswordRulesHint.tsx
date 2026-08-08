import { useTranslation } from 'react-i18next'

import { usePasswordRules } from '@/hooks/useAuthSchemas'
import { cn } from '@/lib'

/**
 * The live "Min. 8 chars, an uppercase, a lowercase, and a digit" line under a
 * new-password field. Each rule turns positive on its own as the user types,
 * and the whole line does once they all pass.
 *
 * One component for the three screens that set a password — signup, the
 * emailed reset, and Profile — which previously carried three copies of the
 * same join. The joins are the reason it has to be assembled rather than
 * translated as one sentence: the rules are coloured individually, but
 * English's ", and " is Spanish's " y ", so the separators come from the
 * catalogue too.
 */
export function PasswordRulesHint({ value, className }: { value: string; className?: string }) {
  const { t } = useTranslation()
  const rules = usePasswordRules()
  const allPassed = rules.every(({ test }) => test(value))

  return (
    <p
      className={cn(
        'text-xs',
        allPassed ? 'text-positive' : 'text-tertiary-foreground',
        className
      )}
    >
      {rules.map(({ test, label }, i) => (
        <span key={label}>
          {i > 0 &&
            (i === rules.length - 1
              ? t('validation.passwordRules.lastSeparator')
              : t('validation.passwordRules.separator'))}
          <span
            className={cn(test(value) ? 'text-positive' : 'text-tertiary-foreground')}
          >
            {label}
          </span>
        </span>
      ))}
      {allPassed && '  ✓'}
    </p>
  )
}
