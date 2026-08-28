import { ArchiveIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

import { NoticeShell, formatDay } from './parts'
import type { Suspension } from '@/types/entitlements'

type Props = {
  suspension: Suspension
  /** See `NoticeShell` — omitted until there is a billing screen to send them to. */
  onUpgrade?: () => void
  className?: string
}

/**
 * What a workspace sees on something it still owns but can no longer edit.
 *
 * A downgrade takes effect at the next billing boundary and then suspends
 * rather than deletes: a workspace that drops to one campaign and has two keeps
 * both, and the server marks one read-only. So this notice has one job beyond
 * explaining the lock, and it is the reassurance — the first thing a person
 * thinks when a campaign stops accepting edits is that they have lost it.
 *
 * It renders on a resource the server has flagged; nothing here counts anything
 * against a limit. If the client picked the victim it would pick a different
 * one from the server, and possibly a different one in each tab.
 *
 * The rule this belongs to: gating applies to *creating and choosing*, never to
 * displaying what exists. Suspended things stay in their lists, still open, and
 * still read — which is also why every picker in the app has to tolerate a
 * current value that is no longer among its options.
 */
export function SuspendedNotice({ suspension, onUpgrade, className }: Props) {
  const { t, i18n } = useTranslation()
  if (!suspension.suspended) return null

  return (
    <NoticeShell
      icon={<ArchiveIcon size={16} />}
      title={t('tiers.suspended')}
      action={onUpgrade ? { label: t('tiers.upgrade'), onClick: onUpgrade } : undefined}
      className={className}
    >
      <p>{t('tiers.suspendedBody')}</p>
      {suspension.since && (
        <p>{t('tiers.suspendedSince', { when: formatDay(suspension.since, i18n.language) })}</p>
      )}
    </NoticeShell>
  )
}
