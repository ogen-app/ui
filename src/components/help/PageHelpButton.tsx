import { QuestionIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { useFeatureFlag } from '@/config/featureFlags'
import { usePageHelpArticle } from '@/hooks/useHelp'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { selectCurrentArticle, useHelpStore } from '@/stores/helpStore'

/**
 * "Help for this page" — the "?" every page header carries (CON-173).
 *
 * `PageHeader` renders it, so a screen gets one by declaring which page it is
 * on its route (`staticData: { help }`) and by nothing else. It sits at the end
 * of the top-right group because that corner is for *views*, and opening an
 * explanation of the screen is a way of looking at it, not a change to it.
 *
 * **Renders nothing when the screen has no article**, by the same rule as
 * `<HelpTrigger>`: a "?" that opens an apology is worse than no "?", and this
 * is what lets every route declare its page before anyone writes the article.
 *
 * It toggles. Pressed while its own article is showing, it closes the drawer —
 * the same button opening and closing the same thing is what the preview and
 * settings toggles beside it already do.
 */
export function PageHelpButton() {
  // The flag is read before anything else is: `PageHeader` is on every
  // screen and in a great many tests, and with the flag off this must not so
  // much as reach for the Query client.
  const enabled = useFeatureFlag('help-center')
  return enabled ? <PageHelp /> : null
}

function PageHelp() {
  const { t } = useTranslation()
  const articleKey = usePageHelpArticle({ enabled: true })
  const showing = useHelpStore(
    (s) => s.isOpen && selectCurrentArticle(s) === articleKey,
  )

  if (!articleKey) return null

  const toggle = () => {
    const { open, close } = useHelpStore.getState()
    if (showing) close()
    else open(articleKey)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="smIcon"
          className={cn(showing && 'text-accent hover:text-accent')}
          onClick={toggle}
          aria-label={t('help.page.label')}
          aria-pressed={showing}
        >
          <QuestionIcon
            weight={showing ? 'fill' : 'regular'}
            className="size-5"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t('help.page.label')}</TooltipContent>
    </Tooltip>
  )
}
