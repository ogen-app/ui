import folderEmptyImage from '@/assets/illustrations/folder-empty.webp'

/**
 * A destination that exists in the rail and not yet in the product.
 *
 * There is one reason to ship a page like this rather than leave the row out:
 * the nav is an argument about how the app is shaped, and this is what makes
 * that argument whole. A rail where the workspace has five modules and a
 * campaign has three of them teaches that the campaign is a lesser kind of
 * place, and the missing rows are exactly the ones that would have said
 * otherwise. The shape is the feature here; the screens catch up.
 *
 * What it must not do is pretend. No mock rows, no disabled controls, no
 * "coming soon" over a fake table — a stub that looks like the real thing is
 * how a demo becomes a promise. It says what will be here and what it is for,
 * because that much is decided, and stops.
 *
 * Every page using this is behind a flag that is off by default, so nobody
 * meets one without having asked to see it.
 *
 * Its own markup rather than `PageGridEmptyState`: that one fills its parent
 * from an absolutely-positioned layer, which needs a parent with a height, and
 * the campaign's document shell gives its sections an auto-height column. The
 * layer escapes upward over the header there. This centres in flow instead and
 * works under either shell.
 */
export function PageNotBuiltYet({
  title,
  subtitle,
}: {
  /** What this place will be — named as the rail names it. */
  title: string
  /** What it will hold, and why it is its own place rather than part of another. */
  subtitle: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <img src={folderEmptyImage} alt="" className="mb-5 w-40" />
      <div className="space-y-2 text-tertiary-foreground">
        <div className="font-display text-2xl/8 font-medium text-foreground">
          {title}
        </div>
        <p className="mx-auto max-w-prose">{subtitle}</p>
      </div>
    </div>
  )
}
