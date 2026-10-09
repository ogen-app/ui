import { useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { PlusIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'
import {
  firstCommentDelay,
  firstCommentFit,
  firstCommentStatusLine,
  type FirstCommentStatusLine,
} from '@/lib/firstComment'
import { formatDate, formatNumber } from '@/lib/intl'
import {
  FIRST_COMMENT_DELAYS,
  type FirstCommentDelay,
  type Post,
} from '@/types/posts'

type Props = {
  post: Post
  changeDoc: (fn: (p: Post) => void) => void
  /**
   * The ceiling for the post's effective type: `0` takes no first comment,
   * `undefined` is not known yet (no type, rules in flight).
   */
  limit: number | undefined
  /** The platform and type, worded, for the sentence saying it takes none. */
  target: string
  /** The post has left Ogen (CON-251): the card is the record, not a field. */
  locked: boolean
  className?: string
}

const POSTED_AT_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/**
 * The post's first comment (CON-361): text posted under the live post, with it
 * or a few minutes after — the place for the link a caption is better without.
 *
 * Sits between the copy and the sources, because it is copy: it is written
 * with the post and goes out with it. Three shapes:
 *
 * - **Offered** — a heading and ADD FIRST COMMENT, like Notes and Sources.
 *   Absent entirely where the type takes none: an offer that can only be
 *   refused is not one.
 * - **Editing** — the text, its counter and when it goes out. A type that takes
 *   none *keeps* the text and says so, rather than clearing it: switching back
 *   is the likeliest next move, and the checks bar and the transition blocker
 *   are what stop it going out (the server refuses it either way).
 * - **Locked** — the text as it went (or will go) out, and what became of it.
 */
export function PostFirstCommentCard({
  post,
  changeDoc,
  limit,
  target,
  locked,
  className,
}: Props) {
  const { t } = useTranslation()
  const stored = post.first_comment ?? ''
  // A local draft, like the title's, because the server trims what it stores
  // and its answer lands back in the cache: typed straight through, the space
  // before the next word would vanish under the cursor on every save.
  const [draft, setDraft] = useState(stored)
  // Adopt a value from outside — a restored version, another tab — but not the
  // trimmed echo of this one. Adjusted during render, against the last value
  // seen, rather than in an effect that would paint the stale draft first.
  const [seen, setSeen] = useState(stored)
  if (stored !== seen) {
    setSeen(stored)
    if (draft.trim() !== stored) setDraft(stored)
  }
  const [composing, setComposing] = useState(false)

  const hasText = draft.trim() !== ''
  const unsupported = limit !== undefined && limit <= 0

  if (locked) {
    if (!stored.trim()) return null
    return (
      <div
        className={cn('flex flex-col gap-4 bg-primary px-10 py-6', className)}
      >
        <div className="flex items-start justify-between gap-4 min-w-0">
          <h2 className="text-xl font-display font-medium tracking-tight">
            {t('posts.firstComment.heading')}
          </h2>
          {/* Keyed by status, so the clock below starts from the moment a
              comment became pending rather than from when the card opened. */}
          <FirstCommentStatus
            key={post.first_comment_status ?? 'none'}
            post={post}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-wrap break-words border-b border-border pb-3 text-sm">
            {stored}
          </p>
          <p className="text-sm text-tertiary-foreground">
            {firstCommentDelay(post) === 0
              ? t('posts.firstComment.timing.withPost')
              : t('posts.firstComment.timing.after', {
                  count: firstCommentDelay(post),
                })}
          </p>
        </div>
      </div>
    )
  }

  const open = composing || hasText
  if (!open && unsupported) return null

  const fit = firstCommentFit(draft, limit)

  const write = (next: string) => {
    setDraft(next)
    changeDoc((d) => {
      d.first_comment = next
    })
  }
  const setDelay = (minutes: FirstCommentDelay) =>
    changeDoc((d) => {
      d.first_comment_delay_minutes = minutes
    })
  const remove = () => {
    setDraft('')
    setComposing(false)
    changeDoc((d) => {
      d.first_comment = ''
      d.first_comment_delay_minutes = 0
    })
  }

  const delays = FIRST_COMMENT_DELAYS.map((minutes) => ({
    id: String(minutes),
    displayValue:
      minutes === 0
        ? t('posts.firstComment.delay.now')
        : t('posts.firstComment.delay.minutes', { count: minutes }),
  }))

  return (
    <div className={cn('flex flex-col gap-4 bg-primary px-10 py-6', className)}>
      <div className="flex items-center justify-between gap-4 min-w-0">
        <h2 className="text-xl font-display font-medium tracking-tight">
          {t('posts.firstComment.heading')}
        </h2>
        {open ? (
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            <span>{t('posts.firstComment.remove')}</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setComposing(true)}
          >
            <PlusIcon />
            <span>{t('posts.firstComment.add')}</span>
          </Button>
        )}
      </div>
      <p className="text-sm text-tertiary-foreground">
        {t('posts.firstComment.helper')}
      </p>

      {open && (
        <>
          <div className="flex flex-col gap-1">
            <Textarea
              // Only on the click that opened it — a card that arrives with
              // text in it is being read, not written.
              autoFocus={composing && !hasText}
              value={draft}
              onChange={(e) => write(e.target.value)}
              placeholder={t('posts.firstComment.placeholder')}
              aria-label={t('posts.firstComment.fieldLabel')}
              aria-invalid={fit.state === 'over' || undefined}
            />
            {fit.state === 'unsupported' ? (
              <p className="flex items-start gap-2 pt-2 text-sm text-warning">
                <WarningCircleIcon
                  weight="fill"
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>{t('posts.firstComment.unsupported', { target })}</span>
              </p>
            ) : fit.state !== 'unknown' ? (
              <span
                className={cn(
                  'self-end text-xs tabular-nums',
                  fit.state === 'over'
                    ? 'text-destructive'
                    : 'text-tertiary-foreground',
                )}
              >
                {formatNumber(fit.length)} / {formatNumber(fit.limit)}
              </span>
            ) : null}
          </div>

          {/* Hidden where the comment cannot go out at all: when it goes is
              a question about a comment that will not. */}
          {!unsupported && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`first-comment-delay-${post.id}`}>
                {t('posts.firstComment.delayLabel')}
              </Label>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <TextSelect
                  id={`first-comment-delay-${post.id}`}
                  variant="default"
                  size="lg"
                  className="w-64"
                  value={String(firstCommentDelay(post))}
                  onValueChange={(v) =>
                    setDelay(Number(v) as FirstCommentDelay)
                  }
                  elements={delays}
                />
                <span className="text-xs text-tertiary-foreground">
                  {t('posts.firstComment.accountNote')}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * What became of the comment, beside the heading of a locked card. Ticks every
 * half minute while the comment is waiting out its delay, so "~3 min" counts down
 * between the editor's polls rather than standing still until one lands.
 */
function FirstCommentStatus({ post }: { post: Post }) {
  const { t } = useTranslation()
  const pending = post.first_comment_status === 'pending'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!pending) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [pending])

  const line = firstCommentStatusLine(post, now)
  if (!line) return null
  return (
    <span className="flex flex-wrap items-center justify-end gap-x-2 text-right">
      <StatusBadge
        label={statusLabel(line, t)}
        tone={line.tone}
        className="text-sm text-primary-foreground"
      />
      {line.key === 'failed' && line.reconnect && (
        <Link
          to="/workspace-settings"
          className="text-sm text-primary-foreground underline underline-offset-2"
        >
          {t('posts.firstComment.status.reconnect')}
        </Link>
      )}
    </span>
  )
}

function statusLabel(line: FirstCommentStatusLine, t: TFunction): string {
  switch (line.key) {
    case 'withPost':
      return t('posts.firstComment.status.withPost')
    case 'afterPublish':
      return t('posts.firstComment.status.afterPublish', {
        count: line.minutes,
      })
    case 'postingIn':
      return t('posts.firstComment.status.postingIn', { count: line.minutes })
    case 'postingNow':
      return t('posts.firstComment.status.postingNow')
    case 'delegated':
      return t('posts.firstComment.status.delegated')
    case 'posted': {
      const at = formatDate(line.at, POSTED_AT_FORMAT)
      return at
        ? t('posts.firstComment.status.posted', { at })
        : t('posts.firstComment.status.postedUndated')
    }
    case 'failed':
      // The permission case in our own words — the server's is an
      // instruction ("reconnect it…") the link beside it already gives.
      // Anything else is the reason as it was reported, untranslated, which
      // beats a sentence that says less.
      return line.reconnect
        ? t('posts.firstComment.status.failedPermission')
        : line.error
          ? t('posts.firstComment.status.failed', { error: line.error })
          : t('posts.firstComment.status.failedUnexplained')
    case 'skipped':
      return t('posts.firstComment.status.skipped')
  }
}
