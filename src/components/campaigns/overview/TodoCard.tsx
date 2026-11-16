import {
  CheckCircleIcon,
  ListChecksIcon,
  PlusIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { LineItem } from '@/components/ui/line-item'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog.tsx'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate.ts'
import { useAddPost } from '@/hooks/usePosts.ts'
import type { AttentionItem } from '@/lib/campaignReadiness.ts'
import { formatNumber } from '@/lib/intl'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { OverviewCard, SectionLink } from './OverviewCard.tsx'

/**
 * The Overview's to-do list: the gaps with no clock on them — the brief, the
 * dates, the channels, a first post, drafts gone stale. The client's `todo`
 * and `info` rules, in the order `attentionItems` gives them, which is the
 * order a person would work through them.
 *
 * Each row is an empty box rather than a dot: these are things to do, and
 * the warnings above are things that are true.
 */
export function TodoCard({
  items,
  campaignId,
}: {
  /** The client's rules, already narrowed to `todo` and `info`. */
  items: AttentionItem[]
  campaignId: string
}) {
  const { t } = useTranslation()

  if (items.length === 0) {
    return (
      <OverviewCard
        bare
        title={t('campaignOverview.todo.title')}
        icon={<CheckCircleIcon className="size-5 text-positive" aria-hidden />}
        className="gap-2"
      >
        <p className="text-sm text-secondary-foreground">
          {t('campaignOverview.todo.none')}
        </p>
      </OverviewCard>
    )
  }

  return (
    <OverviewCard
      bare
      title={t('campaignOverview.todo.title')}
      icon={
        <ListChecksIcon
          className="size-5 text-secondary-foreground"
          aria-hidden
        />
      }
      status={
        <span className="text-sm text-secondary-foreground">
          {formatNumber(items.length)}
        </span>
      }
    >
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            {item.id === 'no-posts' ? (
              <FirstPostRow item={item} campaignId={campaignId} />
            ) : (
              <LineItem
                asChild
                indicator={{ kind: 'task', done: false }}
                label={<span className="whitespace-normal">{item.label}</span>}
                trailing={
                  <span className="group-hover:text-primary-foreground">
                    {item.actionLabel}
                  </span>
                }
              >
                <SectionLink target={item.fix} campaignId={campaignId} />
              </LineItem>
            )}
          </li>
        ))}
      </ul>
    </OverviewCard>
  )
}

/**
 * The one to-do that can be done from here: an empty campaign is offered
 * both ways of filling it, the user's own hand first.
 *
 * GENERATE writes the ask into the campaign's composer and stops there —
 * generating writes posts, so the send is the user's. It is gated on this
 * click rather than on that send, because writing an ask into a composer the
 * user is then refused at is a worse answer than declining to write it.
 */
function FirstPostRow({
  item,
  campaignId,
}: {
  item: AttentionItem
  campaignId: string
}) {
  const { t } = useTranslation()
  // Wrapped, not passed bare: useAddPost takes an optional Date for the
  // calendar's click-to-create, so onClick={addPost} would hand it an event.
  const addPost = useAddPost(campaignId)
  const postGate = useUpgradeGate('posts_total')
  const planGate = useUpgradeGate('plan_runs_per_month')
  const askFor = useAssistantStore((s) => s.askFor)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)

  const generatePlan = () => {
    openRightPanel('assistant')
    askFor(
      threadIdFor({ kind: 'campaign', campaignId }),
      t('campaignOverview.todo.generateAsk'),
    )
  }

  return (
    <>
      <LineItem
        indicator={{ kind: 'task', done: false }}
        chevron={false}
        label={
          <span className="flex min-w-0 flex-col gap-2 py-1 whitespace-normal">
            <span>{item.label}</span>
            <span className="flex flex-wrap items-center gap-2">
              <Button
                variant="defaultInverted"
                size="sm"
                onClick={postGate.intent(() => addPost())}
              >
                <PlusIcon />
                <span>{t('campaignOverview.todo.addPost')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={planGate.intent(generatePlan)}
              >
                <SparkleIcon />
                <span>{t('campaignOverview.todo.generate')}</span>
              </Button>
            </span>
          </span>
        }
      />
      <UpgradeDialog gate={postGate} />
      <UpgradeDialog gate={planGate} />
    </>
  )
}
