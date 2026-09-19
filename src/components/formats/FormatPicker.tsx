import { useTranslation } from 'react-i18next'
import { TextSelect } from '@/components/ui/text-select'
import {
  CONTENT_FORMATS,
  contentFormatCopy,
  normalizeContentFormat,
  type ContentFormatId,
} from '@/lib/contentFormats'

/**
 * Which shape a post takes — how-to, explainer, listicle (CON-264).
 *
 * One select over a fixed vocabulary. There is no "add a format" affordance and
 * there should not be: the moment this can grow, it is a library, and a library
 * needs a page, an editor, an empty state and somebody to maintain it. See
 * `lib/contentFormats` for why a fixed list is enough.
 *
 * **Unset is a first-class option, listed first.** Not a placeholder — a
 * placeholder cannot be chosen, and clearing a format somebody filed by mistake
 * has to be as easy as filing it. Nothing anywhere warns about a post with no
 * format; a required taxonomy gets filled in with whatever is nearest and the
 * grouping it exists for becomes noise.
 *
 * Radix has no empty string value, so unset travels as a sentinel that never
 * leaves this file. The prop is `ContentFormatId | null`, which is what the
 * column will be.
 */
const UNSET = 'none'

export function FormatPicker({
  value,
  onChange,
  disabled,
  id,
  variant = 'primary',
  className,
}: {
  /**
   * The current format. A value this build does not recognise — from an older
   * sidecar or a newer peer — narrows to unset rather than leaving the trigger
   * blank, which is the rule every picker in this app follows about a current
   * value that is no longer among its options.
   */
  value: string | null
  onChange: (format: ContentFormatId | null) => void
  disabled?: boolean
  id?: string
  variant?: 'default' | 'ghost' | 'primary' | 'inline'
  className?: string
}) {
  const { t } = useTranslation()
  const current = normalizeContentFormat(value)

  const elements = [
    { id: UNSET, displayValue: t('formats.none') },
    ...CONTENT_FORMATS.map((format) => ({
      id: format.id,
      displayValue: contentFormatCopy(t, format.id).label,
    })),
  ]

  return (
    <TextSelect
      id={id}
      className={className}
      variant={variant}
      value={current ?? UNSET}
      elements={elements}
      disabled={disabled}
      onValueChange={(next) =>
        onChange(next === UNSET ? null : normalizeContentFormat(next))
      }
    />
  )
}
