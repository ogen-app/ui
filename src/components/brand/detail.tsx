import type { ReactNode } from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageColumns } from '@/components/page-primitives/PageColumns'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { useBrand } from '@/hooks/useBrand'
import { brandSectionCopy, type BrandSectionId } from '@/lib/brandSections'
import { BrandSectionAside } from './sectionAside'
import type { BrandData } from './types'

/**
 * A Brand section, as a screen you go into and come back from.
 *
 * ## The hub's frame, one level down
 *
 * The same two columns as the Strategy hub above it (`PageColumns`, the side
 * one sticky), so going in keeps the frame and only changes what is in it:
 * the section's entries in the main column, and beside them what the section
 * is for (`BrandSectionAside`). The intro card used to open
 * the main column and carry the section's name; that put a paragraph of
 * explanation between the header and the list every visit, and left most of a
 * wide screen empty beside a 740px column.
 *
 * ## The header names the place
 *
 * A caret back at top-left and the section's name after it — "‹ Voices" —
 * the way every other page header names its place. It used to be a caret
 * alone, because the intro card carried the name; with that card moved to the
 * side, the header is the one place left that says where you are.
 *
 * It scrolls away like the hub's, and the bar over the page takes over the
 * title (`scrollAway`): the side column pins 16px from the top, which only
 * works with nothing pinned above it.
 *
 * The header sits *inside* the scroller, so the columns pass under it.
 * `ScrollArea` rather than a bare `overflow-y-auto`, for the reason the post
 * uses it: an overlay scrollbar that takes no width from the content while
 * idle.
 *
 * Top-right is empty and stays that way — CON-178 gives it to views, and a
 * section has none. Creating goes at the end of the list it adds to
 * (`BrandLibrary`).
 */
export function BrandSectionFrame({
  section,
  aside,
  children,
}: {
  section: BrandSectionId
  aside: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader
            back={<BrandBackButton />}
            title={brandSectionCopy(t, section).label}
            scrollAway
          />
          <PageColumns aside={aside} stickyAside>
            {children}
          </PageColumns>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}

/**
 * `BrandSectionFrame` over the brand query, for the sections whose entries are
 * on `BrandData` — Voices and Audiences.
 *
 * ## Why the data gate is in the same component as the chrome
 *
 * The routes asked the same query and wrote the same three branches —
 * pending, failed, here — which is a chance for one of them to answer
 * differently. It is a render prop rather than a `data` prop because the point
 * is that **the body never runs without data**: a section cannot accidentally
 * read `data?.voices` and quietly draw an empty library while the fetch is
 * still in flight. An empty Brand section is a real state with its own copy,
 * and showing it to somebody whose brand is merely still loading is the one lie
 * this module is written to avoid.
 *
 * The header and the About card render either way, so the wait happens
 * *inside* the screen you asked for rather than on a blank page that becomes
 * it.
 */
export function BrandDetail({
  section,
  children,
}: {
  section: 'voices' | 'audiences'
  children: (data: BrandData) => ReactNode
}) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useBrand()

  return (
    <BrandSectionFrame
      section={section}
      aside={
        <BrandSectionAside
          section={section}
          empty={data ? isSectionEmpty(section, data) : false}
        />
      }
    >
      {isPending ? (
        <PageLoader />
      ) : isError || !data ? (
        <PageError
          header={t('brand.detail.errorHeader')}
          message={t('brand.detail.errorMessage')}
        />
      ) : (
        children(data)
      )}
    </BrandSectionFrame>
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
 * are. Exported because the editors sit one level below this and take the same
 * control pointed at the section they came from.
 *
 * The `to` union is the list of screens that have something below them, and it
 * is a union rather than a `string` so that adding an editor without adding its
 * section here does not compile. Guardrails is not in it: it is a singleton, so
 * its screen *is* its editor and there is no level below it to come back from.
 */
export function BrandBackButton({
  to = '/foundation',
  label,
}: {
  to?:
    | '/foundation'
    | '/foundation/voices'
    | '/foundation/audiences'
    | '/foundation/series'
  /**
   * Overrides the destination's name for a caller one level deeper. Defaulted
   * inside rather than in the signature: a default argument is evaluated once
   * per call and that is fine, but writing it as a literal here would put an
   * English sentence on a prop signature, which is where a caller copies it
   * from.
   */
  label?: string
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant="headerIcon"
      size="excluded"
      asChild
      aria-label={label ?? t('brand.detail.back')}
    >
      <Link to={to}>
        <CaretLeftIcon className="size-5" />
      </Link>
    </Button>
  )
}

/**
 * Whether the section has anything at all behind it — the one line the About
 * card gains while it does not.
 */
function isSectionEmpty(
  section: 'voices' | 'audiences',
  data: BrandData,
): boolean {
  return section === 'voices'
    ? data.voices.length === 0
    : data.audiences.length === 0
}
