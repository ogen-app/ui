import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoIcon, XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * The ⓘ beside the radar and the "Reading the radar" pop-over it opens
 * (CON-440, restyled in CON-443).
 *
 * A pop-over, not a modal: it hangs from the button and covers the chart it
 * explains, while the score above and the fixes below stay in view — a dialog
 * over the whole rail would hide the very thing it is describing. It opens
 * only when asked; the chart reads on its own once the rules are known, so
 * the rules sit one click away rather than taking rail height every time.
 *
 * Built on `ui/popover`, which portals it: drawn in place, a transform on an
 * ancestor trapped its z-index and the chart painted over it. Radix brings Esc,
 * click-outside, focus return and `aria-expanded` with it.
 */
export function RadarGuide({ platformName }: { platformName: string | null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t('posts.quality.guide.open')}
        className={cn(
          'flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-border-primary',
          open
            ? 'bg-foreground text-primary'
            : 'text-tertiary-foreground hover:text-foreground',
        )}
      >
        <InfoIcon
          aria-hidden
          weight={open ? 'bold' : 'regular'}
          className="size-[18px]"
        />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        // The arrow sits under the ⓘ rather than at the content's own edge.
        alignOffset={-6}
        aria-label={t('posts.quality.guide.title')}
        className="w-[320px]"
        // The rail closes on Escape too; this one belongs to the pop-over.
        onEscapeKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <h4 className="text-sm font-semibold text-foreground">
            {t('posts.quality.guide.title')}
          </h4>
          <PopoverClose
            aria-label={t('posts.quality.guide.close')}
            className="flex size-6 cursor-pointer items-center justify-center text-foreground hover:bg-tertiary focus-visible:outline-2 focus-visible:outline-border-primary"
          >
            <XIcon aria-hidden className="size-4" />
          </PopoverClose>
        </div>

        <dl className="flex flex-col gap-4 pt-4">
          <Rule
            sample={<RingsSample />}
            title={t('posts.quality.guide.ringsTitle')}
            body={t('posts.quality.guide.ringsBody')}
          />
          <Rule
            sample={<HalvesSample />}
            title={t('posts.quality.guide.halvesTitle')}
            body={
              platformName
                ? t('posts.quality.guide.halvesBody', {
                    platform: platformName,
                  })
                : t('posts.quality.guide.halvesBodyGeneric')
            }
          />
          <Rule
            sample={<LinesSample />}
            title={t('posts.quality.guide.linesTitle')}
            body={t('posts.quality.guide.linesBody')}
          />
          <Rule
            sample={<CornerSample />}
            title={t('posts.quality.guide.cornersTitle')}
            body={t('posts.quality.guide.cornersBody')}
          />
          <Rule
            sample={<ZoneSample />}
            title={t('posts.quality.guide.zoneTitle')}
            body={t('posts.quality.guide.zoneBody')}
          />
        </dl>
      </PopoverContent>
    </Popover>
  )
}

/**
 * One rule, led by a tiny sample of the mark it describes — the rings, the
 * split, solid against dashed — rather than a reduced copy of the radar to
 * decode inside the explanation of the radar.
 */
function Rule({
  sample,
  title,
  body,
}: {
  sample: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center"
      >
        {sample}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-[13px] font-semibold text-foreground">{title}</dt>
        <dd className="text-[13px]/[1.45] text-secondary-foreground">{body}</dd>
      </div>
    </div>
  )
}

function Sample({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 28 28" className="size-7">
      {children}
    </svg>
  )
}

function RingsSample() {
  return (
    <Sample>
      <rect
        x="2.5"
        y="2.5"
        width="23"
        height="23"
        fill="none"
        className="stroke-border"
      />
      <rect
        x="8.5"
        y="8.5"
        width="11"
        height="11"
        fill="none"
        className="stroke-quaternary-foreground"
      />
    </Sample>
  )
}

function HalvesSample() {
  return (
    <Sample>
      <rect
        x="2.5"
        y="2.5"
        width="23"
        height="23"
        fill="none"
        className="stroke-border"
      />
      <line
        x1="14"
        y1="0"
        x2="14"
        y2="28"
        strokeDasharray="1 3"
        className="stroke-tertiary-foreground"
      />
      <line
        x1="0"
        y1="14"
        x2="28"
        y2="14"
        strokeDasharray="1 3"
        className="stroke-quaternary-foreground"
      />
    </Sample>
  )
}

function LinesSample() {
  return (
    <Sample>
      <line
        x1="0"
        y1="9"
        x2="28"
        y2="9"
        strokeWidth={1.75}
        className="stroke-foreground"
      />
      <line
        x1="0"
        y1="19"
        x2="28"
        y2="19"
        strokeWidth={1.25}
        strokeDasharray="4 3"
        className="stroke-tertiary-foreground"
      />
    </Sample>
  )
}

function CornerSample() {
  return (
    <Sample>
      <text
        x="2"
        y="21"
        className="fill-foreground font-display text-[16px] font-medium"
      >
        6
      </text>
      <rect x="18" y="12" width="6" height="6" className="fill-foreground" />
    </Sample>
  )
}

function ZoneSample() {
  return (
    <Sample>
      <path
        d="M2 2h24v24H2Z M7 7h14v14H7Z"
        fillRule="evenodd"
        className="fill-positive/10"
      />
      <rect
        x="2.5"
        y="2.5"
        width="23"
        height="23"
        fill="none"
        className="stroke-border"
      />
      <rect
        x="7.5"
        y="7.5"
        width="13"
        height="13"
        fill="none"
        className="stroke-quaternary-foreground"
      />
    </Sample>
  )
}
