import type { ReactNode } from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { useBrand } from '@/hooks/useBrand'
import { brandSection, type BrandSectionId } from '@/lib/brandSections'
import { BrandIntro } from './shell'
import type { BrandData } from './types'

/**
 * A Brand section, as a screen you go into and come back from.
 *
 * ## The shape is the post details screen's, on purpose
 *
 * A caret back at top-left, and one centred column under it. That is what every
 * other *drilldown* in this app looks like — a post, an asset — and Brand's
 * sections are drilldowns now rather than tabs, so they should look like one. It
 * is not decoration: the caret in that corner is the app's one promise that
 * there is somewhere above here, and a screen that reaches the same depth by
 * other means has to keep it.
 *
 * **And the shape is structural, not just visual.** The header sits *inside*
 * the scroller, sticky, carrying the standard gradient — so the column
 * dissolves under it as it passes. The first build put the header above the
 * scroller as a sibling, which is a different screen with the same parts: the
 * content stops at a hard horizontal edge and cards slide under a cut. Every
 * other scrolling screen in this app (post details, Profile, Workspace
 * Settings) wraps its header in the scroll container, and the fade is the
 * visible half of that. `ScrollArea` rather than a bare `overflow-y-auto`, for
 * the same reason the post uses it: an overlay scrollbar that does not take a
 * column of width away from the content while it is idle.
 *
 * What that buys over the tab bar it replaces: the Overview gets its whole
 * header back, going somewhere is one gesture and coming back is one gesture,
 * and no screen you are working on offers four sideways exits along its top
 * edge. See `lib/brandSections` for the argument in full.
 *
 * Top-right is empty and stays that way — CON-178 gives it to views, and a
 * section has none. Creating goes at the end of the list it adds to
 * (`BrandLibrary`), which is where you are looking once you have read the list
 * and found nothing that does the job.
 *
 * ## The header carries no name
 *
 * It did — the section's label sat beside the caret, which is the ordinary
 * arrangement and was not wrong. What replaced it is better rather than
 * cheaper: the column now opens on a `BrandIntro` card carrying the same label
 * as a display heading *and* the two sentences saying what the section is for.
 * A header can only ever state the name. Naming the place twice, once in 15px
 * and once in 24px with the explanation attached, is the version where one of
 * them is redundant — so the smaller one went.
 *
 * The post editor reaches the same arrangement from the other direction: no
 * title there either, because the name is in the document. Here the name is in
 * the first card. Either way the header is a caret and the screen says where
 * you are in its own words.
 *
 * ## Why the data gate is in the same component as the chrome
 *
 * Five routes asked the same query and wrote the same three branches —
 * pending, failed, here — which is five chances for one of them to answer
 * differently. It is a render prop rather than a `data` prop because the point
 * is that **the body never runs without data**: a section cannot accidentally
 * read `data?.voices` and quietly draw an empty library while the fetch is
 * still in flight. An empty Brand section is a real state with its own copy,
 * and showing it to somebody whose brand is merely still loading is the one lie
 * this module is written to avoid.
 *
 * The header renders either way, so the wait happens *inside* the screen you
 * asked for rather than on a blank page that becomes it.
 */
export function BrandDetail({
  section,
  scroll = true,
  children,
}: {
  section: BrandSectionId
  /** `false` for a section that owns its own scrollers. Templates is the one. */
  scroll?: boolean
  children: (data: BrandData) => ReactNode
}) {
  // A section that owns its own scrollers cannot hand the page one: Templates
  // is a platform rail pinned to the full height of a panel beside it, and a
  // page scroller would drag the rail off the top with everything else. It
  // keeps the header above the frame, where nothing passes under it anyway.
  if (!scroll) {
    return (
      <BrandPage>
        <div className="flex h-full min-h-0 flex-col">
          <PageHeader back={<BrandBackButton />} />
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 lg:px-6">
            <BrandDetailBody section={section} fixed>
              {children}
            </BrandDetailBody>
          </div>
        </div>
      </BrandPage>
    )
  }

  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea className="min-h-0 flex-1" type="scroll" scrollHideDelay={350}>
          <PageHeader back={<BrandBackButton />} />
          <div className="px-3 pb-10 lg:px-6">
            <BrandDetailBody section={section}>{children}</BrandDetailBody>
          </div>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}

/**
 * The page frame every Brand screen shares — including the Overview, which is
 * not a `BrandDetail` but has to arrive the same way.
 *
 * Fades in rather than cutting, the same way a post does. Two screens one click
 * apart that arrive differently read as two different apps.
 */
export function BrandPage({ children }: { children: ReactNode }) {
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      {children}
    </PageContainer>
  )
}

/**
 * Back to the Overview.
 *
 * A `Link` rather than a `navigate` callback: it is a real anchor, so it
 * middle-clicks into a tab and shows its destination in the status bar, and
 * the caret is the same one the post editor goes back with.
 *
 * Icon-only, with the destination in the `aria-label` alone — again the post
 * editor's arrangement. Nothing else in the header names it, and nothing needs
 * to: a caret in that corner means *up*, and the screen under it says where you
 * are. Exported because the voice editor sits one level below this and takes
 * the same control pointed at `/brand/voices`.
 */
export function BrandBackButton({
  to = '/brand',
  label = 'Back to Brand',
}: {
  to?: '/brand' | '/brand/voices'
  label?: string
}) {
  return (
    <Button variant="headerIcon" size="excluded" asChild aria-label={label}>
      <Link to={to}>
        <CaretLeftIcon className="size-5" />
      </Link>
    </Button>
  )
}

function BrandDetailBody({
  section,
  fixed,
  children,
}: {
  section: BrandSectionId
  /** The section owns its own scrollers and must fill the height it is given. */
  fixed?: boolean
  children: (data: BrandData) => ReactNode
}) {
  const { data, isPending, isError } = useBrand()

  if (isPending) return <PageLoader />
  if (isError || !data) {
    return (
      <PageError
        header="Brand could not be loaded"
        message="The workspace's voices, audiences and guardrails are not reachable right now. Everything else in the app is unaffected."
      />
    )
  }

  if (fixed) {
    return (
      <>
        <BrandSectionIntro section={section} data={data} wide />
        <div className="min-h-0 flex-1">{children(data)}</div>
      </>
    )
  }

  return (
    <BrandColumn>
      <BrandSectionIntro section={section} data={data} />
      {children(data)}
    </BrandColumn>
  )
}

/**
 * The stack a section's cards sit in — the same 12px rhythm the Overview uses,
 * so going into a section does not change the spacing of the column you were
 * just looking at.
 */
export function BrandColumn({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

/**
 * The card a section opens with, filled from the table.
 *
 * Exported because the harness draws sections without the page — and without a
 * query to draw them from — around them, and a harness that assembles its own
 * intro card is a harness that can keep passing after the app stops matching
 * it.
 */
export function BrandSectionIntro({
  section,
  data,
  wide,
}: {
  section: BrandSectionId
  data: BrandData
  wide?: boolean
}) {
  const info = brandSection(section)
  return (
    <BrandIntro
      icon={info.icon}
      tone={info.tone}
      title={info.label}
      body={info.description}
      missing={isSectionEmpty(section, data) ? info.whenEmpty : undefined}
      readBy={info.readBy}
      wide={wide}
    />
  )
}

/**
 * Whether the section has anything at all behind it — the one line the intro
 * card gains while it does not.
 *
 * Local rather than on `brandSections`: it is the only question this file asks
 * of the data, and a `switch` here is cheaper to read than a fifth column on a
 * table whose other four are copy.
 */
function isSectionEmpty(section: BrandSectionId, data: BrandData): boolean {
  switch (section) {
    case 'voices':
      return data.voices.length === 0
    case 'audiences':
      return data.audiences.length === 0
    case 'guardrails':
      return data.guardrails === null
    case 'look':
      return data.look === null
    case 'templates':
      return data.templates.length === 0
  }
}
