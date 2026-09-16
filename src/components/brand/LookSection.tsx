import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { brandSectionCopy } from '@/lib/brandSections'
import { BrandSection, ChipList, Gap } from './shell'
import type { BrandLook } from './types'

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
  const { t } = useTranslation()
  return (
    <BrandSection
      variant={variant}
      title={brandSectionCopy(t, 'look').label}
      // `images` is aspirational and marked as such by being the only entry:
      // the template compositor is the consumer, and it is prototype 6.
      readBy={[]}
      action={
        // Only when there is somewhere for it to go: the route renders this
        // without an editor to open (`/brand/look`), and an EDIT that does
        // nothing is worse than none.
        look && onEdit ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            {t('brand.look.edit')}
          </Button>
        ) : undefined
      }
    >
      {!look ? (
        <Gap
          what={t('brand.look.gap')}
          offers={[
            { label: t('brand.look.uploadLogo'), hint: t('brand.look.best') },
          ]}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <SlotLabel>{t('brand.look.logoSlot')}</SlotLabel>
            {look.logos.length === 0 ? (
              <MissingPart>{t('brand.look.noLogo')}</MissingPart>
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
                        // reads and what the user is choosing between. Both
                        // renderings read one key, so the caption and the
                        // accessible name can never drift apart.
                        alt={t(`brand.look.job.${logo.job}` as const)}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-xs text-tertiary-foreground">
                      {t(`brand.look.job.${logo.job}` as const)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <SlotLabel>{t('brand.look.paletteSlot')}</SlotLabel>
            {look.palette.length === 0 ? (
              <MissingPart>{t('brand.look.noPalette')}</MissingPart>
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
            <SlotLabel>{t('brand.look.typeSlot')}</SlotLabel>
            {look.typefaces.length === 0 ? (
              <MissingPart>{t('brand.look.noTypefaces')}</MissingPart>
            ) : (
              <ChipList items={look.typefaces} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <SlotLabel>{t('brand.look.referenceSlot')}</SlotLabel>
            {look.referenceImages.length === 0 ? (
              <MissingPart>{t('brand.look.noReference')}</MissingPart>
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
