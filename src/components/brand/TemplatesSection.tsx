import { CheckIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { brandSectionCopy } from '@/lib/brandSections'
import { formatList } from '@/lib/intl'
import { AddButton, BrandSection, EntryCard, Gap, OriginLine } from './shell'
import { EXPECTED_RATIOS, type BrandTemplate } from './types'

/**
 * What ships instead of an image editor.
 *
 * The distinction this section exists to hold: CON-132 is expensive for exactly
 * one reason — it **reflows layout** across aspect ratios, and constraint
 * anchors, safe areas and text overflow are all downstream of that. A template
 * does not reflow. It is a full-canvas PNG *per ratio*, so the hard problem
 * disappears rather than being deferred.
 *
 * That is why the card leads with which ratios exist. A missing ratio is not a
 * cosmetic gap here: it is the one thing that makes a template unusable on a
 * platform, and it is the price the design pays for not reflowing. Showing it
 * up front is the honest version of "we chose the cheap thing".
 *
 * Three layers, hard stop: background → source → foreground. Enough for frames,
 * watermarks and legibility scrims; not an editor.
 */
export function TemplatesSection({
  templates,
  onAdd,
  onOpen,
}: {
  templates: BrandTemplate[]
  onAdd?: () => void
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <BrandSection
      title={brandSectionCopy(t, 'templates').label}
      qualifier={
        templates.length > 0
          ? t('brand.templates.count', { count: templates.length })
          : undefined
      }
      readBy={[]}
      action={
        templates.length > 0 ? (
          <AddButton label={t('brand.templates.add')} onClick={onAdd} />
        ) : undefined
      }
    >
      {templates.length === 0 ? (
        <Gap
          what={t('brand.templates.gap')}
          offers={[
            {
              label: t('brand.templates.buildFromLogo'),
              hint: t('brand.look.best'),
            },
            { label: t('brand.templates.uploadPng') },
          ]}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </BrandSection>
  )
}

function TemplateCard({
  template,
  onOpen,
}: {
  template: BrandTemplate
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  const have = new Set(template.ratios.map((r) => r.ratio))
  const missing = EXPECTED_RATIOS.filter((r) => !have.has(r))
  const preview = template.ratios[0]

  return (
    <EntryCard
      title={template.name}
      meta={
        template.isDefault ? (
          // "Default" is the semantics, not a badge for its own sake: this is
          // the one pre-applied to every image unless something says
          // otherwise, which is the same applies-by-default rule voices have.
          <span className="flex shrink-0 items-center gap-1 text-xs text-tertiary-foreground">
            <CheckIcon className="size-3" />
            {t('brand.templates.appliedByDefault')}
          </span>
        ) : undefined
      }
      onClick={onOpen ? () => onOpen(template.id) : undefined}
      footer={
        <OriginLine
          origin={template.origin}
          className="text-xs text-tertiary-foreground"
        />
      }
    >
      <div className="flex gap-3">
        <div
          // A checkerboard, because these are PNGs with alpha and a solid
          // ground would hide exactly the thing that makes them work.
          className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary"
          style={{
            backgroundImage:
              'linear-gradient(45deg, var(--color-tertiary) 25%, transparent 25%), linear-gradient(-45deg, var(--color-tertiary) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-tertiary) 75%), linear-gradient(-45deg, transparent 75%, var(--color-tertiary) 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
          }}
        >
          {preview && (
            <img
              src={preview.url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs text-tertiary-foreground">
            {template.role === 'foreground'
              ? t('brand.templates.overImage')
              : t('brand.templates.underImage')}
          </p>

          <div className="flex flex-wrap gap-1">
            {EXPECTED_RATIOS.map((ratio) => (
              <span
                key={ratio}
                className={
                  have.has(ratio)
                    ? 'rounded border border-quaternary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground'
                    : 'rounded border border-dashed border-quaternary px-1.5 py-0.5 font-mono text-[11px] text-tertiary-foreground'
                }
              >
                {ratio}
              </span>
            ))}
          </div>

          {missing.length > 0 && (
            <p className="text-xs text-tertiary-foreground">
              {t('brand.templates.missingRatios', {
                ratios: formatList(missing),
              })}
            </p>
          )}
        </div>
      </div>
    </EntryCard>
  )
}
