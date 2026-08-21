import type { ReactNode } from 'react'
import {
  ArrowRightIcon,
  GlobeIcon,
  PencilSimpleIcon,
  SparkleIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
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
 * So the offers are ordered best-first, and the order is the argument:
 *
 * 1. **From the website** — CON-222 already scrapes a URL to Markdown with
 *    images, so this is assembly of machinery that exists, and it starts the
 *    customer somewhere nobody else is.
 * 2. **From what they have published** — produces something they recognise,
 *    which is a different and easier kind of agreement than authoring.
 * 3. **From our library** — for the true cold start. Few and opinionated;
 *    eight to twelve, not sixty. A library that needs a search box has failed.
 *
 * And the fourth is deliberately not a peer of the other three: **the blank
 * form is the escape hatch, not the default.** Nobody's first act should be
 * authoring a brand voice from nothing, so it is a text link under the cards
 * rather than a fourth tile.
 *
 * The risk is stated on the screen rather than hidden in a doc: if the template
 * path works as intended, every customer picks from the same twelve voices and
 * we have relocated the un-branded problem rather than solved it. **The
 * template's job is to be replaced**, which is why paths 1 and 2 outrank it and
 * why the screen keeps asking for samples afterwards.
 */
export function FirstRun({
  onFromWebsite,
  onFromPosts,
  onFromLibrary,
  onSkip,
}: {
  onFromWebsite?: () => void
  onFromPosts?: () => void
  onFromLibrary?: () => void
  /** Straight to the empty sections, for someone who wants to type. */
  onSkip?: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 rounded-lg bg-primary p-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h2 className="font-display text-2xl font-medium leading-8 tracking-tight">
          Everything generated here sounds like everything else generated
          anywhere
        </h2>
        <p className="text-sm leading-5 text-secondary-foreground">
          People use social media to be distinct — that is what branding is for.
          Generated content has no voice of its own and nothing stopping it from
          reading like the rest of the feed. This is where you keep the material
          that makes yours yours: how you sound, who you are talking to, what
          you may never claim, and what your images look like.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Offer
          icon={<GlobeIcon />}
          title="Read it off your website"
          body="Point us at your site and we propose the whole thing in one step — voice samples from your own copy, boilerplate, product facts, colours and logo."
          recommended
          onClick={onFromWebsite}
        />
        <Offer
          icon={<SparkleIcon />}
          title="Learn it from your posts"
          body="Here is the voice you already have, in your own words. Fix what's wrong rather than inventing something from scratch."
          onClick={onFromPosts}
        />
        <Offer
          icon={<StackIcon />}
          title="Start from a template"
          body="A dozen voices with real samples, for a cold start. Yours the moment you pick one, and meant to be replaced as you go."
          onClick={onFromLibrary}
        />
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tertiary-foreground">
        <span>
          A template gets you most of the way in one click. It is the samples you
          add afterwards that make it yours — twelve workspaces on the same
          template sound like twelve workspaces on the same template.
        </span>
      </p>

      <div>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          <PencilSimpleIcon />
          <span>Or fill it in yourself</span>
        </Button>
      </div>
    </div>
  )
}

function Offer({
  icon,
  title,
  body,
  recommended = false,
  onClick,
}: {
  icon: ReactNode
  title: string
  body: string
  recommended?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-2 rounded-md p-4 text-left transition-colors',
        // The recommended one is not merely first — a row of three identical
        // tiles is a menu, and a menu is what the blank box already was.
        recommended
          ? 'bg-secondary hover:bg-tertiary'
          : 'border border-quaternary hover:bg-secondary',
      )}
    >
      <span className="flex items-center gap-2">
        <span className="[&_svg]:size-4 text-secondary-foreground">{icon}</span>
        <span className="font-grotesk text-sm font-medium">{title}</span>
      </span>
      <span className="text-xs leading-4 text-tertiary-foreground">{body}</span>
      <span className="mt-auto flex items-center gap-1 pt-2 text-xs text-secondary-foreground">
        <span>{recommended ? 'Start here' : 'Use this'}</span>
        <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
