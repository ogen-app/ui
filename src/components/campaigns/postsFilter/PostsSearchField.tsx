import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib'
import { POST_TEXT_MAX } from '@/lib/postFilter'

/** How long typing rests before the address takes it. */
const SETTLE_MS = 300

/**
 * The calendars' search (CON-534): `text=` in the address, typed into a
 * field because a calendar has no filter line to hold it as a clause.
 *
 * The address is written once the typing rests, or at once on Enter, so each
 * keystroke is not a request. A search put there by anything else — the
 * assistant's `set_filter`, its UNDO, BACK — replaces what is in the field,
 * and drops a write still waiting, which would otherwise undo it.
 *
 * Below `lg` it is its icon until it is focused or holds a search: the
 * header row it shares does not wrap, and a full field there pushed the
 * calendar's own controls off a phone's screen.
 */
export function PostsSearchField({
  value,
  onChange,
}: {
  /** The search in the address; empty for none. */
  value: string
  /** Stable: a new one each render restarts the wait. */
  onChange: (next: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const [draft, setDraft] = useState(value)
  // What this field last wrote, to tell its own write coming back from one
  // made elsewhere.
  const [sent, setSent] = useState(value)
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    if (value !== sent) {
      setSent(value)
      setDraft(value)
    }
  }

  const commit = (next: string) => {
    const text = next.trim()
    setSent(text)
    if (text !== value) onChange(text)
  }

  useEffect(() => {
    const text = draft.trim()
    if (text === sent) return
    const id = window.setTimeout(() => {
      setSent(text)
      onChange(text)
    }, SETTLE_MS)
    return () => window.clearTimeout(id)
  }, [draft, sent, onChange])

  const clear = () => {
    setDraft('')
    commit('')
  }

  return (
    <div
      className={cn(
        'flex h-8 w-52 items-center gap-1.5 overflow-hidden border-b-2 border-quaternary bg-input-secondary pr-1 pl-2 transition-[width] focus-within:border-foreground',
        draft === '' ? 'max-lg:w-8 max-lg:focus-within:w-44' : 'max-lg:w-44',
      )}
    >
      {/* The icon is the way in while the field is folded to it. */}
      <label htmlFor={id} className="flex shrink-0 cursor-text">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={1.5}
          aria-hidden
          className="size-4 text-secondary-foreground"
        />
      </label>
      <Input
        id={id}
        type="search"
        variant="search"
        inputSize="sm"
        value={draft}
        maxLength={POST_TEXT_MAX}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(draft)
          } else if (event.key === 'Escape' && draft !== '') {
            event.preventDefault()
            clear()
          }
        }}
        placeholder={t('postsFilter.search.placeholder')}
        aria-label={t('postsFilter.search.label')}
        className="px-0 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft !== '' && (
        <button
          type="button"
          onClick={clear}
          aria-label={t('postsFilter.search.clear')}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-secondary-foreground outline-none hover:text-foreground focus-visible:text-foreground"
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            strokeWidth={1.5}
            aria-hidden
            className="size-4"
          />
        </button>
      )}
    </div>
  )
}
