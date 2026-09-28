import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  ImageBrokenIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { AssetIngestState } from '@/components/content/AssetIngestState'
import { AssetStateFrame } from '@/components/content/AssetStateFrame'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TagsInput } from '@/components/ui/tags-input'
import { useReextractImage, useRegenerateAltText } from '@/hooks/useContent'
import { drawableImageUrl } from '@/lib/assetPreview'
import {
  MAX_ALT_TEXT_CHARS,
  formatBytes,
  isTerminalStatus,
} from '@/lib/assetStatus'
import { ingestFailureMessage } from '@/lib/uploadError'
import { formatNumber } from '@/lib/intl'
import { cn } from '@/lib'
import type { Asset, UpdateAssetPayload } from '@/types/content'

/** How long after the last keystroke the whole asset is written back. */
const SAVE_DEBOUNCE_MS = 500

/**
 * Where the counter starts being information rather than noise: the last tenth
 * of the allowance. Before that it only tells someone typing a sentence that
 * they have 1,900 characters they were never going to use.
 */
const COUNTER_FROM = Math.round(MAX_ALT_TEXT_CHARS * 0.9)

type Props = {
  asset: Asset
  /**
   * Write this screen's fields back. The parent supplies the title and body it
   * tracks; everything else on the payload comes from here, and the PUT leaves
   * unnamed fields alone (CON-279).
   */
  onChange: (overrides: Partial<UpdateAssetPayload>) => void
  /** Marks the header's save indicator as in-flight, on the first keystroke. */
  onDirty: () => void
}

/**
 * An image asset: the picture, and the two things a person writes about it.
 *
 * This is the branch that keeps `AssetDocument`'s editor honest. An image's
 * `content` is a description of the picture rather than a document, so seeding
 * BlockNote from it renders the description as a paragraph and autosaves the
 * first keystroke over the asset (CON-235). Before this screen existed the type
 * fell through to `UnsupportedAsset`, which was safe and said nothing useful;
 * `UnsupportedAsset` stays the floor for a type this build has never heard of.
 *
 * **Alt text and description are two fields because they have two audiences.**
 * Alt text is what someone who cannot see the picture is told it is — one
 * sentence, and the string that will travel with the image when the attach
 * bridge copies it onto a post. The description is `content`, which is what the
 * embeddings are built from and therefore what the assistant retrieves when it
 * goes looking for a picture. Merging them would make every retrieval hit read
 * like an accessibility label, and every screen reader read out a paragraph
 * written for a search index.
 *
 * The picture is the full-size file — there is no thumbnail job yet — so it is
 * drawn inside a box the file's own dimensions reserve. Without that the fields
 * below jump down the moment a 4-megapixel photo decodes.
 */
export function AssetImageView(props: Props) {
  /*
   * Nothing to edit until image-service has finished (CON-281): an upload is
   * created `pending` and the description and alt text are the service's to
   * write first. The form below seeds its fields once, on mount, so mounting it
   * early would show two empty boxes and keep them empty after the service
   * filled them in — waiting here means it mounts with what was written.
   */
  if (!isTerminalStatus(props.asset.status)) {
    return <AssetIngestState asset={props.asset} />
  }
  return <ImageForm {...props} />
}

function ImageForm({ asset, onChange, onDirty }: Props) {
  const { t } = useTranslation()
  const regenerate = useRegenerateAltText(asset.id)
  const reextract = useReextractImage(asset.id)
  /*
   * Who wrote the alt text on screen: image-service or a person. Seeded from
   * the server's `alt_text_edited_by_user`, then kept here, because the two
   * ways it changes on this screen don't agree with that flag — a regenerate
   * leaves it as it was (and a person's text has just been replaced by a
   * machine's), and typing flips it only once the save lands.
   */
  const [altByPerson, setAltByPerson] = useState(
    asset.alt_text_edited_by_user ?? true,
  )
  const altId = useId()
  const descriptionId = useId()
  const tagsId = useId()

  /*
   * The editable half of the asset, in one object.
   *
   * Seeded once, like the editor's blocks: this is the asset as it arrived, and
   * re-seeding when the query refetches would take a field away from whoever is
   * mid-sentence in it.
   *
   * One object rather than a `useState` per field because a save must carry the
   * *latest* of every field it sends. Kept apart, each handler would have to
   * remember to read the others, and the one it forgot would be sent at its
   * mounted value and quietly revert.
   */
  const [draft, setDraft] = useState({
    title: asset.title,
    alt_text: asset.alt_text,
    content: asset.content,
    tag_ids: asset.tag_ids,
  })

  /*
   * Which fields have actually been edited here, and therefore which the save
   * names. The PUT is presence-aware (CON-279), so an unnamed field is left
   * alone server-side — and that is the whole defence: the draft above was
   * seeded at mount, so sending all four on every keystroke would carry this
   * screen's opening copy of the tags over a re-tag done elsewhere in the
   * meantime, with nothing on either side to notice. A field is only this
   * screen's to write once someone has written in it.
   */
  const touchedRef = useRef(new Set<keyof typeof draft>())

  const titleRef = useRef<HTMLTextAreaElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /*
   * One timer for all four fields, not one each.
   *
   * Two saves in flight at once each hold a copy of the other's field from
   * before it was edited, and the one that lands second wins — typing an alt
   * text and then a description quickly enough would put the old alt text back.
   * Debouncing the asset rather than the field means there is only ever one
   * write describing one state.
   */
  const edit = useCallback(
    (patch: Partial<typeof draft>) => {
      const next = { ...draft, ...patch }
      for (const key of Object.keys(patch) as (keyof typeof draft)[]) {
        touchedRef.current.add(key)
      }
      setDraft(next)
      onDirty()
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const touched = touchedRef.current
        onChange({
          // The API has no way to say "no title", so an emptied one saves as a
          // space — the same fallback the document editor uses, for the same
          // 400. The description gets no such treatment: blank is a valid
          // description, and the one relaxation the update handler makes for
          // `IMG`.
          ...(touched.has('title') && {
            title: next.title.trim() === '' ? ' ' : next.title,
          }),
          ...(touched.has('content') && { content: next.content }),
          ...(touched.has('alt_text') && { alt_text: next.alt_text }),
          ...(touched.has('tag_ids') && { tag_ids: next.tag_ids }),
        })
      }, SAVE_DEBOUNCE_MS)
    },
    [draft, onChange, onDirty],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const autosizeTitle = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    autosizeTitle()
  }, [draft.title, autosizeTitle])

  const handleTitle = (e: ChangeEvent<HTMLTextAreaElement>) =>
    edit({ title: e.target.value.replace(/\n/g, '') })

  const handleAltText = (e: ChangeEvent<HTMLInputElement>) => {
    setAltByPerson(true)
    // Clamped by code point, which is what the server counts
    // (`utf8.RuneCountInString`). `maxLength` counts UTF-16 units instead, so a
    // field of emoji would stop the user half a limit early — and the reverse
    // mismatch would send a value the server answers 400 to.
    edit({
      alt_text: [...e.target.value].slice(0, MAX_ALT_TEXT_CHARS).join(''),
    })
  }

  /*
   * A fresh alt text, written and **saved** by the server. The field is set to
   * it without marking it touched: this screen didn't write it, so the next
   * debounced save must not send it back — which, from a draft built before
   * the regenerate, would also put the old text over the new one.
   */
  const handleRegenerate = () =>
    regenerate.mutate(undefined, {
      onSuccess: (alt_text) => {
        touchedRef.current.delete('alt_text')
        setDraft((prev) => ({ ...prev, alt_text }))
        setAltByPerson(false)
      },
    })

  const handleDescription = (e: ChangeEvent<HTMLTextAreaElement>) =>
    edit({ content: e.target.value })

  const altLength = [...draft.alt_text].length

  return (
    <div className="flex w-content flex-col gap-8 bg-primary px-10 py-8">
      <textarea
        ref={titleRef}
        value={draft.title.trim() === '' ? '' : draft.title}
        onChange={handleTitle}
        placeholder={t('content.image.titlePlaceholder')}
        rows={1}
        className="w-full resize-none overflow-hidden border-0 bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-tertiary-foreground"
      />

      {/* The picture is stored either way; what failed or stopped short is
          the reading of it. Named above the picture, with the way to try
          again, rather than instead of it. */}
      {(asset.status === 'failed' || asset.status === 'partial') && (
        <div className="flex items-center justify-between gap-4 border border-quaternary px-4 py-3">
          <p
            className={cn(
              'text-sm',
              asset.status === 'failed' ? 'text-destructive' : 'text-warning',
            )}
          >
            {asset.status === 'failed'
              ? ingestFailureMessage(t, asset)
              : t('content.image.partial')}
          </p>
          <Button
            variant="outline"
            onClick={() => reextract.mutate()}
            loading={reextract.isPending}
          >
            <ArrowsClockwiseIcon />
            <span>{t('content.image.reextract')}</span>
          </Button>
        </div>
      )}

      <Picture asset={asset} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor={altId}>{t('content.image.altLabel')}</Label>
          {/* Replaces whatever is there, a person's text included — it is
              asked for by name, and the label says what it does. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerate.isPending}
          >
            <SparkleIcon />
            <span>{t('content.image.altRegenerate')}</span>
          </Button>
        </div>
        <Input
          id={altId}
          value={draft.alt_text}
          onChange={handleAltText}
          placeholder={t('content.image.altPlaceholder')}
        />
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs text-tertiary-foreground">
            {!altByPerson && draft.alt_text !== ''
              ? t('content.image.altGenerated')
              : t('content.image.altHelp')}
          </p>
          {altLength >= COUNTER_FROM && (
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums',
                altLength >= MAX_ALT_TEXT_CHARS
                  ? 'text-destructive'
                  : 'text-tertiary-foreground',
              )}
            >
              {t('content.image.altCount', {
                count: MAX_ALT_TEXT_CHARS - altLength,
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={descriptionId}>
          {t('content.image.descriptionLabel')}
        </Label>
        <Textarea
          id={descriptionId}
          value={draft.content}
          onChange={handleDescription}
          placeholder={t('content.image.descriptionPlaceholder')}
          className="min-h-32"
        />
        <p className="text-xs text-tertiary-foreground">
          {t('content.image.descriptionHelp')}
        </p>
      </div>

      {/* Last of the three, because it is the only one that isn't about the
          picture. The list has always been able to filter by tag and nothing
          in the app has ever been able to set one — this is the first screen
          that closes that. */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={tagsId}>{t('content.image.tagsLabel')}</Label>
        <TagsInput
          id={tagsId}
          value={draft.tag_ids}
          onChange={(tag_ids) => edit({ tag_ids })}
          placeholder={t('content.image.tagsPlaceholder')}
        />
        <p className="text-xs text-tertiary-foreground">
          {t('content.image.tagsHelp')}
        </p>
      </div>

      <FileFacts asset={asset} />
    </div>
  )
}

/**
 * The picture, in a box its own proportions reserve.
 *
 * `width`/`height` come off the file rather than being measured, so the browser
 * knows the aspect before a byte of the image has arrived and the fields below
 * never move. They are also the only place those numbers are trustworthy: the
 * server probed them from the bytes, where a client could only read what the
 * decoder happened to produce.
 *
 * A file with no URL is not a broken image — it is an asset whose bytes never
 * reached storage, which is a deployment fault rather than something the user
 * did. It says so rather than showing a torn-page glyph in the frame.
 */
function Picture({ asset }: { asset: Asset }) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)
  // The original when a browser can draw it, else image-service's PNG of it —
  // a HEIC or TIFF has only the second (CON-299).
  const url = asset.file ? drawableImageUrl(asset.file) : null

  if (!url || broken) {
    // Stored, but in a format no browser draws and with no PNG copy of it —
    // the reading that makes one failed. Not the same as never stored.
    const undrawable = !broken && !!asset.file?.url
    return (
      // The picture's own box, so a missing one takes the place a drawn one
      // would and the fields below sit where they will once it is.
      <AssetStateFrame inset className="bg-secondary px-4">
        <ImageBrokenIcon className="size-8 text-tertiary-foreground" />
        <p className="text-sm text-tertiary-foreground">
          {undrawable
            ? t('content.image.undrawable')
            : t('content.image.missing')}
        </p>
      </AssetStateFrame>
    )
  }

  return (
    // Checked against the page's own surface rather than a flat fill: a PNG
    // with transparency on white is indistinguishable from one with a white
    // background, and which of the two it is decides whether it can be put on a
    // coloured post.
    <div className="flex justify-center bg-secondary p-4">
      <img
        src={url}
        // Empty rather than absent when nobody has written one: an `alt` that
        // is missing makes a screen reader fall back to reading the file name,
        // and `ogen-test-image.png` is worse than silence. The title sits
        // directly above and has already named the thing.
        alt={asset.alt_text}
        width={asset.file?.width || undefined}
        height={asset.file?.height || undefined}
        onError={() => setBroken(true)}
        className="max-h-150 w-auto max-w-full object-contain"
      />
    </div>
  )
}

/**
 * What the file is, in one line: dimensions, format, weight.
 *
 * Facts rather than copy, so they sit under the picture instead of in it — but
 * they are the facts that decide whether this image can be published anywhere,
 * which is why the screen states them at all rather than leaving it to whoever
 * opens the file elsewhere.
 */
function FileFacts({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation()
  const file = asset.file
  if (!file) return null

  const facts = [
    file.width > 0 && file.height > 0
      ? `${formatNumber(file.width, {}, i18n.language)} × ${formatNumber(file.height, {}, i18n.language)}`
      : null,
    imageFormatLabel(file.mime_type),
    formatBytes(file.size_bytes),
    file.is_animated ? t('content.image.animated') : null,
  ].filter(Boolean)

  return <p className="text-xs text-tertiary-foreground">{facts.join(' · ')}</p>
}

/**
 * `image/png` → `PNG`. Format names, not copy — they are the same word in every
 * language, so this stays a plain map rather than a catalogue lookup.
 */
function imageFormatLabel(mime: string): string {
  if (mime === 'image/webp') return 'WebP'
  const subtype = mime.split('/')[1] ?? ''
  return subtype.toUpperCase()
}
