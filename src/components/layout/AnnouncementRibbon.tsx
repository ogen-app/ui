import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRightIcon, MegaphoneIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { ZIndex } from '@/config/zIndex'
import {
  useAnnouncements,
  useDismissAnnouncement,
  useRecordAnnouncementClick,
} from '@/hooks/useAnnouncements'
import type { Announcement } from '@/types/announcements'

/** One line of text plus a small button, and nothing that can wrap. */
const RIBBON_HEIGHT = '2.5rem'

/**
 * The CTA and the close are one pair of outlined boxes in the ribbon's own
 * ink, since the stock outline is drawn for a light surface.
 */
const RIBBON_OUTLINE =
  'shrink-0 border-primary/40 text-primary hover:border-primary hover:bg-primary/10'

/**
 * The newest operator announcement (CON-230), as a one-line ribbon across the
 * top of every authenticated screen.
 *
 * **Across the top, not in the rail**, because the rail can be collapsed and
 * an announcement that disappears with it is one half the users never see.
 * The cost of the top is that every page sizes itself to the viewport
 * (`PageContainer`, the rail's fixed column), so this frame publishes the
 * ribbon's height as `--announcement-h` and those subtract it. The variable is
 * `0px` everywhere else, which is what keeps the screens outside this layout
 * (`/plans`, `/workspaces`) exactly as they were.
 *
 * **One line, one at a time.** The body is cut to what fits (the full text is
 * the ribbon's tooltip), and closing the newest shows the next. The operator's
 * image is not shown — a 40px strip has no room for a picture.
 *
 * The copy is the operator's, verbatim and in whatever language they wrote it:
 * announcements carry no translations (out of scope on CON-230), so only the
 * ribbon's own chrome goes through the catalogue.
 */
export function AnnouncementFrame({ children }: { children: ReactNode }) {
  const current = useAnnouncements()[0]
  return (
    <div
      style={
        {
          '--announcement-h': current ? RIBBON_HEIGHT : '0px',
        } as CSSProperties
      }
    >
      {current && <AnnouncementRibbon announcement={current} />}
      {children}
    </div>
  )
}

function AnnouncementRibbon({ announcement }: { announcement: Announcement }) {
  const { t } = useTranslation()
  const dismiss = useDismissAnnouncement()
  const recordClick = useRecordAnnouncementClick()
  const { id, title, body, cta } = announcement

  return (
    // Sticky rather than in flow alone: on a page that scrolls the document,
    // the ribbon has to stay put or the rail below it would open a gap.
    <aside
      aria-label={t('announcements.label')}
      style={{ zIndex: ZIndex.navigation }}
      className="sticky top-0 flex h-(--announcement-h) items-center gap-3 bg-primary-foreground pr-1 pl-4 text-sm text-primary"
    >
      <MegaphoneIcon className="size-4 shrink-0" aria-hidden />
      <p
        className="min-w-0 flex-1 truncate"
        title={[title, body].filter(Boolean).join('\n')}
      >
        {title && <span className="font-medium">{title}</span>}
        {title && body && (
          <span aria-hidden className="px-2 opacity-50">
            ·
          </span>
        )}
        {body && <span className="opacity-70">{body}</span>}
      </p>
      {/* The pair sits 4px from the ribbon's edges and 4px apart. */}
      <div className="flex shrink-0 gap-1">
        {cta && (
          // A plain link rather than a proxied redirect — the ticket keeps Ogen
          // out of the path — so the count is a separate request that fires on
          // the way out and is allowed to fail.
          //
          // Capitals by CSS, not in the copy: the label is the operator's and
          // arrives as they typed it.
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(RIBBON_OUTLINE, 'uppercase')}
          >
            <a
              href={cta.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => recordClick.mutate(id)}
            >
              {cta.label}
              <ArrowUpRightIcon className="ml-1" />
            </a>
          </Button>
        )}
        {/* `pt-[3px]` puts the cross on the same line as the CTA's arrow: `sm`
            pads 11px over 8px to sit capitals optically centred, which lowers
            its icon by 1.5px, and an unpadded icon box would not follow. */}
        <Button
          variant="outline"
          size="smIcon"
          className={cn(RIBBON_OUTLINE, 'pt-[3px]')}
          aria-label={t('announcements.dismiss')}
          onClick={() => dismiss.mutate(id)}
        >
          <XIcon />
        </Button>
      </div>
    </aside>
  )
}
