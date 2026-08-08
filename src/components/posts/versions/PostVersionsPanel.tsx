import { useEffect, useState } from 'react'
import {
  ArrowUUpLeftIcon,
  CaretLeftIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FloppyDiskIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { useFeatureFlag } from '@/config/featureFlags'
import { usePostVersions } from '@/hooks/usePostVersions'
import type { PostVersion } from '@/services/api/posts'
import type { Post } from '@/types/posts'
import { relativeTime } from '@/lib/relativeTime'
import { cn } from '@/lib'

type Props = {
  doc: Post
  onClose?: () => void
}

/**
 * What the list shows. The live document is always the first entry, because
 * the post always has *some* current text — a post with no snapshots yet has a
 * history of one, not an empty state.
 *
 * When the newest snapshot still matches the live text, the two are the same
 * thing and collapse into one row. When they don't, the live entry stands on
 * its own and says so: marking a stale snapshot "Current" would name the wrong
 * text as the post's.
 */
type Entry =
  | { kind: 'live'; content: string; saved: PostVersion | null }
  | { kind: 'saved'; version: PostVersion }

/**
 * The UI names a snapshot "Version 3", never "v3" — including inside notes the
 * server wrote. `post_actions/restore` stamps `"Restored from v3"`, which is
 * the same reference in the same list under a different name; the front end
 * owns how these read, so it is renamed on the way in rather than left to two
 * spellings sitting one row apart.
 */
function versionNote(note: string): string {
  return note.replace(/\bv(\d+)\b/g, 'version $1')
}

function buildEntries(doc: Post, versions: PostVersion[]): Entry[] {
  const [head, ...rest] = versions
  const headIsLive = head?.content === doc.content
  return [
    { kind: 'live', content: doc.content, saved: headIsLive ? head : null },
    ...(headIsLive ? rest : versions).map((v): Entry => ({ kind: 'saved', version: v })),
  ]
}

/**
 * A post's version history (CON-168): every saved snapshot, a read-only look
 * at any of them, and the writes — snapshot, roll back, discard.
 *
 * Reading a version never touches the post. That is why the reader lives
 * inside the panel rather than in the editor: the editor keeps showing the
 * live document throughout, so there is no state where the user is looking at
 * old text in the place they normally type.
 *
 * "Restore" and not "make current", because the server doesn't move a pointer
 * — it copies the chosen text into a new version on top. Nothing is
 * overwritten, which the copy has to say, or rolling back reads as destroying
 * whatever came after.
 */
export function PostVersionsPanel({ doc, onClose }: Props) {
  const { versions, loading, save, saving, restore, restoring, remove, removing } =
    usePostVersions(doc.id)
  const canDelete = useFeatureFlag('post-version-delete')
  const [viewing, setViewing] = useState<Entry | null>(null)

  // The panel outlives the post — the sidebar keeps it mounted across
  // navigation — so an entry being read must not survive into another post's
  // history, where its number would name a different snapshot.
  useEffect(() => setViewing(null), [doc.id])

  if (viewing) {
    return (
      <VersionReader
        entry={viewing}
        onBack={() => setViewing(null)}
        onRestore={
          viewing.kind === 'saved'
            ? () => restore(viewing.version.version_number).then(() => setViewing(null))
            : undefined
        }
        restoring={restoring}
        onClose={onClose}
      />
    )
  }

  const entries = buildEntries(doc, versions)

  return (
    <RailPanel
      title="Versions"
      titleAdornment={
        <span className="text-sm text-tertiary-foreground">{entries.length}</span>
      }
      onClose={onClose}
      className="h-full"
      bodyClassName="flex-1"
      footer={<SaveVersionForm onSave={save} saving={saving} />}
      footerFade={40}
    >
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full shrink-0" />
          <Skeleton className="h-24 w-full shrink-0" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryRow
              key={entry.kind === 'live' ? 'live' : entry.version.id}
              entry={entry}
              onView={() => setViewing(entry)}
              onRestore={
                entry.kind === 'saved'
                  ? () => restore(entry.version.version_number)
                  : undefined
              }
              restoring={restoring}
              onDelete={entry.kind === 'saved' ? () => remove(entry.version) : undefined}
              canDelete={canDelete}
              removing={removing}
            />
          ))}
        </ul>
      )}
    </RailPanel>
  )
}

/** Who took the snapshot — the assistant saves one before it rewrites. */
function CreatorMark({ creator }: { creator: PostVersion['creator'] }) {
  const Icon = creator === 'assistant' ? SparkleIcon : UserIcon
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-tertiary-foreground">
      <Icon className="size-3.5" weight="regular" aria-hidden />
      {creator === 'assistant' ? 'Assistant' : 'You'}
    </span>
  )
}

function EntryRow({
  entry,
  onView,
  onRestore,
  restoring,
  onDelete,
  canDelete,
  removing,
}: {
  entry: Entry
  onView: () => void
  /** Absent on the live entry — it is already the post's text. */
  onRestore?: () => void
  restoring: boolean
  /** Absent on the live entry — there is no snapshot to discard. */
  onDelete?: () => void
  /** `post-version-delete`, read once by the panel rather than per row. */
  canDelete: boolean
  removing: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const live = entry.kind === 'live'
  // The live row borrows the matching snapshot's identity when there is one,
  // so "Current" and "v4" stay the same row rather than two claiming the text.
  const version = live ? entry.saved : entry.version

  return (
    <li
      className={cn(
        'flex flex-col gap-2 border px-3 py-3 min-w-0',
        // Lighter than `border-foreground`: the accent only has to separate one
        // row from the ones around it, and full black reads as a selection.
        live ? 'border-tertiary-foreground' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium shrink-0">
          {version ? `Version ${version.version_number}` : 'Draft'}
        </span>
        {live && <StatusBadge tone="positive" label="Current" className="shrink-0" />}
        <span className="ml-auto shrink-0 text-xs text-tertiary-foreground">
          {version ? relativeTime(version.created_at) : 'Unsaved'}
        </span>
        {/* The whole column disappears with the flag: with nothing to put in
            it, the spacer would only push the timestamp off the right edge. */}
        {!canDelete ? null : onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="xsIcon"
                className="shrink-0"
                aria-label={`More options for version ${entry.kind === 'saved' ? entry.version.version_number : ''}`}
              >
                <DotsThreeVerticalIcon weight="regular" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Sentence case, unlike the DELETE confirm below it: the
                  literal-capitals rule is for the button that does the thing,
                  and no menu in the app shouts at its own items. */}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <TrashIcon />
                <span>Delete version</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Holds the column so the live row's timestamp lines up with the
          // ones below it, which sit left of a menu button.
          <span className="size-4 shrink-0" aria-hidden />
        )}
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {version ? (
          <CreatorMark creator={version.creator} />
        ) : (
          <span className="shrink-0 text-xs text-tertiary-foreground">
            Not snapshotted yet
          </span>
        )}
        {version?.note && (
          <span
            className="truncate text-xs text-secondary-foreground"
            title={versionNote(version.note)}
          >
            · {versionNote(version.note)}
          </span>
        )}
      </div>

      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-secondary-foreground">
            Delete this snapshot? The post keeps its text — you just lose the
            ability to come back to this one.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={removing}
              loading={removing}
              onClick={() => onDelete?.()}
            >
              DELETE
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // `px-0`: a ghost button has no fill, so its horizontal padding is
        // invisible — all it does is indent the icon past the text column
        // above it. Spacing between the two comes from the gap instead.
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="sm" className="px-0" onClick={onView}>
            <EyeIcon />
            <span>View</span>
          </Button>
          {onRestore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0"
              disabled={restoring}
              onClick={onRestore}
            >
              <ArrowUUpLeftIcon />
              <span>Restore</span>
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * One entry's text, read-only. The live post is untouched behind it — the back
 * arrow is the only way out, and nothing here writes until Restore.
 */
function VersionReader({
  entry,
  onBack,
  onRestore,
  restoring,
  onClose,
}: {
  entry: Entry
  onBack: () => void
  onRestore?: () => void
  restoring: boolean
  onClose?: () => void
}) {
  const version = entry.kind === 'live' ? entry.saved : entry.version
  const content = entry.kind === 'live' ? entry.content : entry.version.content

  return (
    <RailPanel
      title={version ? `Version ${version.version_number}` : 'Current draft'}
      onClose={onClose}
      className="h-full"
      bodyClassName="flex-1"
      actions={
        <Button
          type="button"
          variant="ghost"
          size="smIcon"
          onClick={onBack}
          aria-label="Back to all versions"
        >
          <CaretLeftIcon className="size-5" />
        </Button>
      }
      subheader={
        <div className="flex items-center gap-2 min-w-0">
          {version ? (
            <>
              <CreatorMark creator={version.creator} />
              <span className="shrink-0 text-xs text-tertiary-foreground">
                · {relativeTime(version.created_at)}
              </span>
            </>
          ) : (
            <span className="shrink-0 text-xs text-tertiary-foreground">
              The post as it stands — not snapshotted yet
            </span>
          )}
          {version?.note && (
            <span
              className="truncate text-xs text-secondary-foreground"
              title={versionNote(version.note)}
            >
              · {versionNote(version.note)}
            </span>
          )}
        </div>
      }
      footer={
        onRestore ? (
          <div className="flex flex-col gap-2">
            {/* Outline, like every other panel's main action: the default
                variant's fill is `bg-primary`, which is the panel's own
                background — it disappears in here. */}
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              disabled={restoring}
              loading={restoring}
              onClick={onRestore}
            >
              <ArrowUUpLeftIcon />
              <span>RESTORE THIS VERSION</span>
            </Button>
            <p className="text-xs text-tertiary-foreground">
              Saved as a new version on top — nothing is overwritten, and you
              can come back to where you are now.
            </p>
          </div>
        ) : undefined
      }
      footerFade={48}
    >
      {content.trim() === '' ? (
        <p className="text-sm text-tertiary-foreground">There is no text here yet.</p>
      ) : (
        // Preserving the author's line breaks: this is the post as written, not
        // a rendering of it, and the editor below is plain text too.
        <p className="whitespace-pre-wrap break-words text-sm text-primary-foreground">
          {content}
        </p>
      )}
    </RailPanel>
  )
}

/**
 * Takes a snapshot of the post as it stands.
 *
 * Collapsed to a single action until asked for, because the note is the
 * optional half of this: an unlabelled version is still a version, and a text
 * field parked under the list all day reads as something to fill in before you
 * are allowed to save. Opening it is the same click either way.
 */
function SaveVersionForm({
  onSave,
  saving,
}: {
  onSave: (note: string) => Promise<void>
  saving: boolean
}) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        <span>CREATE NEW VERSION</span>
      </Button>
    )
  }

  const close = () => {
    setOpen(false)
    setNote('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    void onSave(note.trim()).then(close)
  }

  return (
    <form className="flex items-center gap-2" onSubmit={submit}>
      <Button
        type="button"
        variant="ghost"
        size="defaultIcon"
        onClick={close}
        aria-label="Cancel"
      >
        <CaretLeftIcon className="size-5" />
      </Button>
      <Input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What changed? (optional)"
        aria-label="Version note"
        className="flex-1 min-w-0"
      />
      {/* Default size, not `sm`: the input beside it is h-10, and an h-8
          button next to it reads as a mistake rather than a hierarchy. */}
      <Button type="submit" variant="outline" disabled={saving} loading={saving}>
        <FloppyDiskIcon />
        <span>Save</span>
      </Button>
    </form>
  )
}
