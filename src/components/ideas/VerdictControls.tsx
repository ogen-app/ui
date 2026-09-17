import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { POSTPONE_HORIZONS, postponeUntil, type IdeaVerdict } from '@/lib/ideas'
import { HORIZON_KEYS, VERDICTS } from './verdicts'
import { cn } from '@/lib'

export type Decide = (verdict: IdeaVerdict, remindAt: string | null) => void

/**
 * The three answers as controls, on the row that is being answered.
 *
 * Triage is the row, not a screen you go to. The decision needs the sentence
 * and the three answers and nothing else, and the row already has both — so a
 * separate mode would buy one thing, a bigger typeface, at the price of
 * leaving the list, losing the piles and having to come back. The list does it
 * in place: read a line, click an answer, the row leaves the pile it was in.
 *
 * **Later is a menu and the other two are buttons**, which is the asymmetry
 * the model asks for: "not now" is not an answer until it says how long, and a
 * button that quietly picked a horizon would be inventing the one fact that
 * makes the verdict honest. So the horizon is always chosen, never defaulted.
 *
 * Yes and No are one click and no confirmation. Both are reversible from the
 * pile they land in, and a confirm step on a reversible decision is what
 * teaches people to click through confirm steps.
 */
export function VerdictControls({
  onDecide,
  now = new Date(),
}: {
  onDecide: Decide
  /** Injected so a test can pin the horizons this produces. */
  now?: Date
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      <VerdictButton verdict="yes" onClick={() => onDecide('yes', null)} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <VerdictButton verdict="later" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {POSTPONE_HORIZONS.map((horizon) => (
            <DropdownMenuItem
              key={horizon}
              onSelect={() => onDecide('later', postponeUntil(now, horizon))}
            >
              {t(HORIZON_KEYS[horizon])}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <VerdictButton verdict="no" onClick={() => onDecide('no', null)} />
    </div>
  )
}

/**
 * One verdict control. Forwards everything it is given, because the Later one
 * is a dropdown trigger and Radix hands the trigger its own props.
 */
function VerdictButton({
  verdict,
  ...props
}: { verdict: IdeaVerdict } & React.ComponentProps<typeof Button>) {
  const { t } = useTranslation()
  const { icon: Glyph, tone, actionKey } = VERDICTS[verdict]

  return (
    <Button
      variant="ghost"
      size="smIcon"
      // The words are the accessible name: the control is a glyph, and a glyph
      // has no name unless it is given one.
      aria-label={t(actionKey)}
      {...props}
    >
      <Glyph className={cn('size-4', tone)} weight="bold" />
    </Button>
  )
}
