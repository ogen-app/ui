import { useEffect, useRef, type ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'

export type CampaignTab = {
  id: string
  label: string
  /**
   * How many things are behind the tab, drawn as its own mark rather than
   * appended to the label.
   *
   * Separate because it is a different kind of fact: the label is the name of a
   * place and does not change, the count is the state of that place and changes
   * under you. Set into the label — `VOICES 2` — the two read as one string,
   * the bar reflows every time something is added, and a tab whose name happens
   * to end in a number is indistinguishable from a tab that is counting.
   *
   * Omit it rather than passing `0`: a count is worth carrying when it tells
   * you there is something to open, and a row of zeroes is furniture.
   */
  count?: number
}

type CampaignTabBarProps = {
  activeTab: string
  tabs: CampaignTab[]
  rightTabs?: CampaignTab[]
  onTabSelect: (tabId: string) => void
  action?: ReactNode
}

/**
 * The count beside a tab's name: a small mono figure on a faint wash.
 *
 * Mono because it is a figure and this app sets figures in Geist Mono, and the
 * wash because the mark has to survive both tab states — the active trigger
 * fills with `bg-quaternary`, so an outline or a grey chip disappears on
 * exactly the tab you are looking at. Ink is inherited rather than set: the
 * count belongs to its tab and dims and lifts with it, which is one rule fewer
 * than giving it a colour of its own.
 */
function TabCount({ value }: { value: number }) {
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-primary-foreground/8 px-1 font-mono text-[10px] leading-none">
      {value}
    </span>
  )
}

export function CampaignTabBar({
  activeTab,
  tabs,
  rightTabs,
  onTabSelect,
  action,
}: CampaignTabBarProps) {
  const isMobile = useIsMobile()
  const activeTriggerRef = useRef<HTMLButtonElement>(null)
  const allTabs = [...tabs, ...(rightTabs ?? [])]

  useEffect(() => {
    if (isMobile) {
      activeTriggerRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [activeTab, isMobile])

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return
    onTabSelect(tabId)
  }

  const renderTrigger = (tab: CampaignTab) => (
    <TabsTrigger
      variant="underline"
      key={tab.id}
      value={tab.id}
      ref={isMobile && tab.id === activeTab ? activeTriggerRef : undefined}
      onClick={(e) => {
        if (tab.id === activeTab) e.preventDefault()
        handleTabClick(tab.id)
      }}
    >
      {tab.label}
      {tab.count != null && <TabCount value={tab.count} />}
    </TabsTrigger>
  )

  if (isMobile) {
    return (
      <div className="flex items-center mx-3 mt-1 mb-0.5 gap-1 shrink-0">
        <div
          className="flex-1 overflow-x-auto border-b border-border"
          style={{ scrollbarWidth: 'none' }}
        >
          <Tabs value={activeTab} className="-mb-px">
            <TabsList variant="underline" size="lg">
              {allTabs.map(renderTrigger)}
            </TabsList>
          </Tabs>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mx-3 lg:mx-6 mt-2 mb-0.5 gap-4 shrink-0">
      <div className="flex-1 border-b border-border flex items-end justify-between">
        <Tabs value={activeTab} className="-mb-px">
          <TabsList variant="underline" size="lg">
            {tabs.map(renderTrigger)}
          </TabsList>
        </Tabs>
        {rightTabs && rightTabs.length > 0 && (
          <Tabs value={activeTab} className="-mb-px">
            <TabsList variant="underline" size="lg">
              {rightTabs.map(renderTrigger)}
            </TabsList>
          </Tabs>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
