import { useState } from 'react'
import { ArrowCounterClockwiseIcon, PlusIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  useCreatePostVersion,
  usePostVersions,
  useRestorePostVersion,
} from '@/hooks/usePostVersions'
import type { PostVersion } from '@/types/posts'

const VERSION_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

type Props = {
  postId: string
  /** Called after a restore has been applied to the post query cache. */
  onRestored?: () => void
  onClose?: () => void
}

/**
 * Version history rail panel: manual snapshots and one-click restore.
 * Restore is non-destructive server-side (the target content becomes a new
 * HEAD version, unsaved edits are auto-snapshotted first), so no confirmation
 * step is required.
 */
export function PostVersionsPanel({ postId, onRestored, onClose }: Props) {
  const { data: versions, isLoading, error } = usePostVersions(postId)
  const createVersion = useCreatePostVersion(postId)
  const restoreVersion = useRestorePostVersion(postId)
  const [note, setNote] = useState('')

  const latestNumber = versions?.[0]?.version_number

  const saveVersion = () => {
    if (createVersion.isPending) return
    createVersion.mutate(note.trim(), { onSuccess: () => setNote('') })
  }

  return (
    <RailPanel
      title="Versions"
      onClose={onClose}
      footer={
        <div className="flex items-end gap-2">
          <Input
            variant="default"
            inputSize="sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Version note (optional)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveVersion()
            }}
          />
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={saveVersion}
            disabled={createVersion.isPending}
          >
            <PlusIcon />
            Save
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner className="w-6" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Unable to fetch versions'}
        </p>
      ) : !versions || versions.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          No versions yet. Save one manually, or let the assistant snapshot
          significant edits.
        </p>
      ) : (
        <div className="flex flex-col">
          {versions.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              isLatest={v.version_number === latestNumber}
              restoring={
                restoreVersion.isPending &&
                restoreVersion.variables === v.version_number
              }
              disabled={restoreVersion.isPending}
              onRestore={() =>
                restoreVersion.mutate(v.version_number, {
                  onSuccess: () => onRestored?.(),
                })
              }
            />
          ))}
          {restoreVersion.error && (
            <p className="mt-2 text-xs text-destructive">
              {restoreVersion.error instanceof Error
                ? restoreVersion.error.message
                : 'Unable to restore version'}
            </p>
          )}
        </div>
      )}
    </RailPanel>
  )
}

type VersionRowProps = {
  version: PostVersion
  isLatest: boolean
  restoring: boolean
  disabled: boolean
  onRestore: () => void
}

function VersionRow({ version, isLatest, restoring, disabled, onRestore }: VersionRowProps) {
  const created = new Date(version.created_at)
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            v{version.version_number}
          </span>
          <StatusBadge
            tone={version.creator === 'assistant' ? 'progress' : 'neutral'}
            label={version.creator === 'assistant' ? 'Assistant' : 'Manual'}
          />
        </div>
        {version.note && (
          <span className="text-xs text-secondary-foreground break-words">
            {version.note}
          </span>
        )}
        {!Number.isNaN(created.getTime()) && (
          <span className="text-xs text-tertiary-foreground">
            {VERSION_DATE_FORMAT.format(created)}
          </span>
        )}
      </div>
      {isLatest ? (
        <span className="shrink-0 text-xs text-tertiary-foreground pt-0.5">Current</span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="shrink-0"
          disabled={disabled}
          onClick={onRestore}
        >
          {restoring ? <Spinner className="w-4" /> : <ArrowCounterClockwiseIcon />}
          Restore
        </Button>
      )}
    </div>
  )
}
