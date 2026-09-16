import type { ReactNode } from 'react'
import {
  ChatCircleTextIcon,
  GlobeIcon,
  PencilSimpleIcon,
  SparkleIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib'

/**
 * The screen every workspace sees on the day this ships.
 *
 * It exists to answer the strongest objection to giving Brand a top-level nav
 * entry: **it is empty on day one, and an empty top-level entry is a bad first
 * impression.** The mitigation is not to hide the entry — it is that the first
 * run is not blank. "Here is the Brand we read off your website" is a screen
 * worth arriving at; five empty cards is not.
 *
 * ## Five ways in, stacked, in the campaign-type anatomy
 *
 * It was a row of three tiles with a text link underneath, which made two
 * claims that turned out to be wrong. The first was in the shape: three
 * columns have room for a heading and a caption and nothing else, so each
 * onramp had to sell itself in a fragment. The second was in the demotion —
 * writing it yourself was the escape hatch, sized and coloured as the thing
 * you resort to. On a screen where most of the onramps are not built yet, the
 * one that always works cannot be the one drawn smallest.
 *
 * So this is `CampaignTypePicker`'s card, one per row: a 40px glyph, a label,
 * and a full sentence with somewhere to put it. Same anatomy, same measure,
 * same hover — a stack of choices where each choice explains itself is a
 * pattern this app already has, and inventing a second one for five items
 * would only mean two ways of drawing the same idea.
 *
 * ## One of them works, and four say COMING SOON
 *
 * That ratio is uncomfortable and it is deliberate. These four are the argument
 * for the whole section — reading a brand off a website, or being asked a
 * handful of questions instead of facing five empty forms, is the thing that
 * starts a customer somewhere nobody else does. None of them is a feature you
 * discover later from a changelog. Hiding them until the endpoints land would
 * mean the day-one screen understates what Brand is for, and the day they
 * arrive nobody would be looking.
 *
 * The honest cost is a screen that promises four times and delivers once, which
 * is why the tag is on the row rather than in a footnote: it is the first thing
 * read after the label, and nothing about a faded row invites a click.
 *
 * ## The template row is the wizard, not the starters
 *
 * Voices and Audiences each ship three starters today, and those still work —
 * open the section, pick one, it is yours. What does *not* exist is the thing
 * this row promises, which is a single pass that sets a voice **and** an
 * audience **and** the guardrails together. A stepper is the only shape that
 * does that without becoming five forms in a trench coat, and it is the one
 * onramp here that is a build rather than an endpoint. So the row says coming
 * soon and its copy points at the per-section starters, because a customer who
 * reads "templates: coming soon" and then finds template cards two clicks later
 * has been told something false.
 */
export function FirstRun({
  onManual,
}: {
  /** Straight to the empty sections, for someone who wants to type. */
  onManual?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 rounded-lg bg-primary p-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h2 className="font-display text-2xl font-medium leading-8 tracking-tight">
          {t('brand.firstRun.title')}
        </h2>
        <p className="text-sm leading-5 text-secondary-foreground">
          {t('brand.firstRun.body')}
        </p>
      </header>

      {/* The one that works, then the four that do not. Grouping beats
          best-first here: interleaved, the eye would have to read the tag on
          all five rows to find the single one it can use today. Within the
          faded group the old order stands, so the day an endpoint lands the
          only change is deleting a prop. */}
      <div className="grid grid-cols-1 gap-3">
        <Onramp
          icon={<PencilSimpleIcon />}
          title={t('brand.firstRun.manual.title')}
          body={t('brand.firstRun.manual.body')}
          onClick={onManual}
        />
        <Onramp
          icon={<SparkleIcon />}
          title={t('brand.firstRun.guided.title')}
          body={t('brand.firstRun.guided.body')}
          comingSoon
        />
        <Onramp
          icon={<GlobeIcon />}
          title={t('brand.firstRun.website.title')}
          body={t('brand.firstRun.website.body')}
          comingSoon
        />
        <Onramp
          icon={<ChatCircleTextIcon />}
          title={t('brand.firstRun.posts.title')}
          body={t('brand.firstRun.posts.body')}
          comingSoon
        />
        <Onramp
          icon={<StackIcon />}
          title={t('brand.firstRun.template.title')}
          body={t('brand.firstRun.template.body')}
          comingSoon
        />
      </div>
    </div>
  )
}

/**
 * One way in.
 *
 * A `coming soon` row is a `div` and not a disabled `button`, because there is
 * no action behind it to disable — the badge is the whole content of the row's
 * state, and a control that will never fire is a promise the markup makes and
 * the app cannot keep. The fade is on the glyph and the words only: a greyed
 * badge on a greyed row is the one part that still has to be read.
 */
function Onramp({
  icon,
  title,
  body,
  comingSoon = false,
  onClick,
}: {
  icon: ReactNode
  title: string
  body: string
  comingSoon?: boolean
  onClick?: () => void
}) {
  const { t } = useTranslation()
  const content = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary [&_svg]:size-6',
          comingSoon && 'opacity-50',
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'flex min-w-0 flex-col gap-0.5 text-left',
          comingSoon && 'opacity-50',
        )}
      >
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm leading-5 text-secondary-foreground">
          {body}
        </span>
      </span>
    </>
  )

  if (comingSoon) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-quaternary px-4 py-4">
        {content}
        <StatusBadge
          tone="neutral"
          label={t('brand.shell.comingSoon')}
          className="ml-auto shrink-0 pl-3 pt-0.5"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      // A path nobody has wired renders disabled rather than as a live tile
      // that does nothing — the callback being supplied is what says the flow
      // exists.
      disabled={!onClick}
      className={cn(
        'flex items-start gap-3 rounded-md border border-quaternary px-4 py-4',
        'cursor-pointer text-primary-foreground transition-colors enabled:hover:border-foreground',
        'disabled:cursor-default disabled:opacity-60',
      )}
    >
      {content}
    </button>
  )
}
