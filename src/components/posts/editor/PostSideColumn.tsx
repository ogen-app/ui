import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BooksIcon,
  ClockCounterClockwiseIcon,
  DevicesIcon,
  GaugeIcon,
  ListChecksIcon,
  NotePencilIcon,
  LayoutIcon,
  type Icon,
} from '@phosphor-icons/react'
import { SideColumn } from '@/components/page-primitives/SideColumn'
import { POST_TABS, type PostTab } from '@/lib/postTabs'
import { useSettingsStore } from '@/stores/settingsStore'

const ICON: Record<PostTab, Icon> = {
  overview: LayoutIcon,
  preview: DevicesIcon,
  checks: ListChecksIcon,
  quality: GaugeIcon,
  sources: BooksIcon,
  notes: NotePencilIcon,
  history: ClockCounterClockwiseIcon,
}

/**
 * What a tab still says while closed: how many things on it stop the post
 * publishing, or should be looked at. Drawn as the warning dot, counted in
 * the tab's name.
 */
export type PostTabBadge = { warn?: number }

/**
 * The post editor's side column: one strip of tabs over the one tab on show.
 *
 * Everything about the post that is not the post — its settings, how it will
 * look, whether it passes, what it reads from, what the team said, what it
 * used to be — lives here, beside the writing column, so the right rail is
 * left to the assistant and Ogen can help with any of it. They used to be
 * four rail panels that took the assistant's place.
 *
 * Drawn by `SideColumn`, which the asset page shares.
 *
 * The tab is one remembered choice for every post (`settingsStore.postTab`):
 * reading the checks on one post and stepping to the next keeps the checks
 * open. Only the tab on show is mounted, so a tab that fetches (History) costs
 * nothing until it is opened.
 */
export function PostSideColumn({
  badges,
  children,
}: {
  badges: Partial<Record<PostTab, PostTabBadge>>
  /** The body of the tab on show, picked by the caller from `postTab`. */
  children: ReactNode
}) {
  const { t } = useTranslation()
  const tab = useSettingsStore((s) => s.postTab)
  const setTab = useSettingsStore((s) => s.setPostTab)
  const tabs = POST_TABS.map((id) => {
    const label = t(`posts.editor.tabs.${id}`)
    const warn = badges[id]?.warn ?? 0
    return {
      id,
      label,
      icon: ICON[id],
      warn,
      warnLabel: warn
        ? t('posts.editor.tabs.withWarnings', { label, count: warn })
        : undefined,
    }
  })

  return (
    <SideColumn
      tabs={tabs}
      current={tab}
      onSelect={setTab}
      label={t('posts.editor.tabs.label')}
      idPrefix="post"
    >
      {children}
    </SideColumn>
  )
}
