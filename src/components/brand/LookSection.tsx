import { Button } from '@/components/ui/button'
import { BrandSection, ChipList, Gap } from './shell'
import type { BrandLogo, BrandLook } from './types'

const LOGO_JOB_LABEL: Record<BrandLogo['job'], string> = {
  profile: 'Profile photo',
  watermark: 'Watermark',
  mark: 'Mark only',
}

/**
 * The visual half, same semantics as the voice half: ambient, applied by
 * default, fine-tuned rather than attached.
 *
 * Two things it deliberately is not. It is **not a file list** — every logo
 * carries a declared job, because "which of these four PNGs goes in the corner"
 * is a question the app has to answer without asking. And the palette carries
 * **roles rather than swatches**: a grid of eight colours with no roles is a
 * palette nobody can apply, and the consumers that want this (CON-132, CON-105)
 * need resolvable values, not files in a list.
 *
 * Reference imagery is CON-105's `brand_style` promoted from a per-asset flag
 * to where it belongs — an existing, working instance of this whole idea at the
 * wrong scope.
 */
export function LookSection({
  look,
  onEdit,
  variant,
}: {
  look: BrandLook | null
  onEdit?: () => void
  variant?: 'card' | 'page'
}) {
  return (
    <BrandSection
      variant={variant}
      title="Look"
      // `images` is aspirational and marked as such by being the only entry:
      // the template compositor is the consumer, and it is prototype 6.
      readBy={[]}
      action={
        look ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            EDIT
          </Button>
        ) : undefined
      }
    >
      {!look ? (
        <Gap
          what="No logo, no colours, no type. Anything generated with an image in it will look like stock."
          offers={[{ label: 'Upload a logo', hint: 'best' }]}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <SlotLabel>Logo</SlotLabel>
            {look.logos.length === 0 ? (
              <MissingPart>
                No logo. Templates and profile images have nothing to place.
              </MissingPart>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {look.logos.map((logo) => (
                  <li
                    key={logo.id}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="flex size-16 items-center justify-center overflow-hidden rounded-md bg-secondary">
                      <img
                        src={logo.url}
                        // The job, not the filename: the job is what the app
                        // reads and what the user is choosing between.
                        alt={LOGO_JOB_LABEL[logo.job]}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-xs text-tertiary-foreground">
                      {LOGO_JOB_LABEL[logo.job]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <SlotLabel>Palette</SlotLabel>
            {look.palette.length === 0 ? (
              <MissingPart>No colours stated.</MissingPart>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {look.palette.map((color) => (
                  <li key={color.id} className="flex items-center gap-2">
                    {/* The one place in the app that renders a raw hex, and it
                        is not a theme colour — it is the customer's brand, so
                        a semantic token would be actively wrong here. */}
                    <span
                      aria-hidden
                      className="size-6 shrink-0 rounded border border-quaternary"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="flex flex-col leading-4">
                      <span className="text-xs text-secondary-foreground">
                        {color.role}
                      </span>
                      <span className="font-mono text-[11px] text-tertiary-foreground">
                        {color.hex}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <SlotLabel>Type</SlotLabel>
            {look.typefaces.length === 0 ? (
              <MissingPart>No typefaces stated.</MissingPart>
            ) : (
              <ChipList items={look.typefaces} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <SlotLabel>Reference imagery</SlotLabel>
            {look.referenceImages.length === 0 ? (
              <MissingPart>
                Nothing to steer generated images by — they will land wherever
                the model's defaults are.
              </MissingPart>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {look.referenceImages.map((url) => (
                  <li key={url}>
                    <img
                      src={url}
                      alt=""
                      className="size-16 rounded-md object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </BrandSection>
  )
}

function SlotLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
      {children}
    </p>
  )
}

/**
 * A missing part **inside** a filled singleton — the partly-filled state, which
 * is the one every real workspace lives in. Worded as what it costs rather than
 * as a blank, for the same reason `Gap` is: an absence nobody can price is an
 * absence nobody fills.
 */
function MissingPart({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-tertiary-foreground">{children}</p>
}
