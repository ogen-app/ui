import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { ModalContainer } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import {
  DISTILL_COUNTS,
  DISTILL_MAX_COUNT,
  DISTILL_MAX_FOCUS,
  DISTILL_MIN_COUNT,
  focusLength,
  focusTooLong,
} from '@/lib/ideaDistill'

export type DistillDraft = { count: number; focus: string }

/**
 * How many new ideas, and what they should lean towards (CON-398).
 *
 * Controlled: the draft lives with the button that opened it, so a second
 * visit — "Try again" after a run that found nothing — opens on what was asked
 * last time rather than on an empty box.
 *
 * The buttons are the delete dialog's pair with the commit's colour taken out:
 * a ghost dismissal and a filled commit, both in literal capitals. The commit
 * repeats the count, so what is about to be asked for is read on the button
 * that asks for it.
 */
export function DistillIdeasModal({
  isOpen,
  onClose,
  campaignName,
  draft,
  onDraftChange,
  onSubmit,
  pending,
  error,
}: {
  isOpen: boolean
  onClose: () => void
  /** The campaign whose reading this is; `null` for the workspace's. */
  campaignName: string | null
  draft: DistillDraft
  onDraftChange: (draft: DistillDraft) => void
  onSubmit: () => void
  pending: boolean
  /** A refusal to state inside the form, already worded. */
  error: string | null
}) {
  const { t } = useTranslation()
  const focusId = useId()
  const hintId = useId()
  const countLabelId = useId()
  const countHintId = useId()
  const tooLong = focusTooLong(draft.focus)

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={t('assetInsights.distill.modal.title')}
      closeOnBackdropClick={!pending}
      closeOnEscape={!pending}
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (!tooLong && !pending) onSubmit()
        }}
      >
        <div className="flex flex-col gap-2">
          <span id={countLabelId} className="text-control text-input-label">
            {t('assetInsights.distill.modal.howMany')}
          </span>
          <Segmented
            fill
            value={draft.count}
            onChange={(count) => onDraftChange({ ...draft, count })}
            options={DISTILL_COUNTS.map((n) => ({
              value: n,
              label: String(n),
            }))}
            aria-labelledby={countLabelId}
            aria-describedby={countHintId}
          />
          <p id={countHintId} className="text-xs text-tertiary-foreground">
            {t('assetInsights.distill.modal.howManyHint', {
              min: DISTILL_MIN_COUNT,
              max: DISTILL_MAX_COUNT,
            })}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={focusId}>
            {t('assetInsights.distill.modal.focus')}
          </Label>
          <Textarea
            id={focusId}
            value={draft.focus}
            onChange={(e) =>
              onDraftChange({ ...draft, focus: e.currentTarget.value })
            }
            placeholder={t('assetInsights.distill.modal.focusPlaceholder')}
            aria-invalid={tooLong || undefined}
            aria-describedby={hintId}
          />
          <div className="flex items-start justify-between gap-4 text-xs">
            <p
              id={hintId}
              className={
                tooLong ? 'text-destructive' : 'text-tertiary-foreground'
              }
            >
              {tooLong
                ? t('assetInsights.distill.modal.focusTooLong', {
                    max: DISTILL_MAX_FOCUS,
                  })
                : t('assetInsights.distill.modal.focusHint')}
            </p>
            <span
              className={cn(
                'shrink-0 tabular-nums',
                tooLong ? 'text-destructive' : 'text-tertiary-foreground',
              )}
            >
              {t('assetInsights.distill.modal.counter', {
                count: focusLength(draft.focus),
                max: DISTILL_MAX_FOCUS,
              })}
            </span>
          </div>
        </div>

        <p className="text-sm text-secondary-foreground">
          {campaignName
            ? t('assetInsights.distill.modal.contextFor', {
                campaign: campaignName,
              })
            : t('assetInsights.distill.modal.context')}
        </p>

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            {t('assetInsights.distill.modal.cancel')}
          </Button>
          <Button
            type="submit"
            variant="defaultInverted"
            disabled={tooLong}
            loading={pending}
          >
            {t('assetInsights.distill.modal.submit', { count: draft.count })}
          </Button>
        </div>
      </form>
    </ModalContainer>
  )
}
