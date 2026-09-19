import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ModalContainer } from '@/components/ui/modal'
import { StatTile } from '@/components/campaigns/overview/StatTile'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { useActivityFeed, useActivityReport } from '@/hooks/useActivity'
import { useDayLabel } from '@/hooks/useActivityLabels'
import { browserTimeZone } from '@/lib/timeZones'
import type { ActivityReport } from '@/types/activity'

/**
 * One day, as a report — the entry the feed's report row opens (CON-225).
 *
 * Counted by the server (CON-285) and never stored: every call recomputes from
 * the workspace's own posts, so a past day is available for as long as its
 * posts are and the figures cannot drift from them. The day boundary is the
 * reader's — the zone goes out with the request — which is the whole reason
 * this moved off the client, where the boundary was free but `created_by` and
 * `failure_reason` were out of reach.
 *
 * Route-backed (`/activity/$date`), so a day can be linked and sent to someone
 * — for a daily report that is most of the point, and a plain overlay
 * forecloses it.
 */
export function DailyReportModal({
  date,
  onClose,
}: {
  date: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const dayLabel = useDayLabel()
  const { now, campaignOfPost } = useActivityFeed()
  const { report, isLoading, isError } = useActivityReport(date)

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      size="full"
      height="full"
      title={`${t('activity.entry.reportTitle')} — ${dayLabel(date, now)}`}
    >
      <div className="flex h-full flex-col gap-8 overflow-y-auto">
        {isError ? (
          <p className="text-sm text-negative">
            {t('activity.report.loadFailed')}
          </p>
        ) : isLoading || !report ? (
          <p className="text-sm text-tertiary-foreground">
            {t('activity.report.loading')}
          </p>
        ) : (
          <ReportBody report={report} campaignOfPost={campaignOfPost} />
        )}

        <p className="mt-auto pt-4 text-xs text-tertiary-foreground">
          {/* The zone the server echoed, or — while the day is still in
              flight — the one it was asked for. They are the same string; the
              fallback only keeps the sentence whole. */}
          {t('activity.report.coverage', {
            zone: report?.tz ?? browserTimeZone(),
          })}
        </p>
      </div>
    </ModalContainer>
  )
}

function ReportBody({
  report,
  campaignOfPost,
}: {
  report: ActivityReport
  campaignOfPost: (postId: string) => string | null
}) {
  const { t } = useTranslation()

  const quiet =
    report.published.total === 0 &&
    report.failed.total === 0 &&
    report.created.posts_total === 0 &&
    report.campaigns_created.total === 0

  // A day with nothing on it is still a 200 rather than a 404, so this is the
  // ordinary rendering of a quiet day — a deep link to a Sunday, or to a day
  // that has not happened yet — and not a failure to load anything.
  if (quiet) {
    return (
      <p className="text-sm text-tertiary-foreground">
        {t('activity.report.nothing')}
      </p>
    )
  }

  return (
    <>
      <CountTiles report={report} />

      {report.published.by_channel.length > 0 && (
        <Section title={t('activity.report.byChannel')}>
          <ChannelRows counts={report.published.by_channel} />
        </Section>
      )}

      {report.failed.posts.length > 0 && (
        <Section title={t('activity.report.didNotGoOut')}>
          <FailedRows
            posts={report.failed.posts}
            campaignOfPost={campaignOfPost}
          />
        </Section>
      )}

      {report.created.posts_total > 0 && (
        <Section title={t('activity.report.createdBy')}>
          <AuthorRows report={report} />
        </Section>
      )}

      {report.campaigns_created.campaign_ids.length > 0 && (
        <Section title={t('activity.report.campaignsStarted')}>
          <CampaignRows ids={report.campaigns_created.campaign_ids} />
        </Section>
      )}
    </>
  )
}

/**
 * Zeroes are kept rather than hidden: "0 failed" is the sentence most of these
 * reports exist to say, and a tile that disappears on a good day makes the
 * reader check whether it was measured at all.
 *
 * Four tiles where there used to be five: the server counts a post that failed
 * and one that was never published in **one** bucket, because the reader's
 * question is the same for both. Which of the two each one was is on its own
 * row below.
 */
function CountTiles({ report }: { report: ActivityReport }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatTile
        value={report.published.total}
        label={t('activity.report.label.published')}
      />
      <StatTile
        value={report.failed.total}
        label={t('activity.report.label.failed')}
        tone={report.failed.total > 0 ? 'alert' : 'default'}
      />
      <StatTile
        value={report.created.posts_total}
        label={t('activity.report.label.created')}
      />
      <StatTile
        value={report.campaigns_created.total}
        label={t('activity.report.label.campaigns')}
      />
    </div>
  )
}

/**
 * The published breakdown. `platform_id` is a catalogue **sqid** and not a
 * network name, so it goes through the catalogue that knows both (CON-292);
 * a row this build ships no support for keeps its id rather than vanishing,
 * because the count is true either way.
 */
function ChannelRows({
  counts,
}: {
  counts: ActivityReport['published']['by_channel']
}) {
  const { resolve } = usePlatformCatalog()
  return (
    <ul className="flex flex-col">
      {counts.map((channel) => (
        <Row
          key={channel.platform_id}
          label={resolve(channel.platform_id)?.name ?? channel.platform_id}
          value={`${channel.count}`}
        />
      ))}
    </ul>
  )
}

/**
 * What did not go out, one row per post.
 *
 * Each links to the post — the report's job is to be the way back to the thing
 * that needs attention — and each carries the server's own `failure_reason`
 * verbatim. That string is Go prose (`"zernio_terminal: rejected"`), composed
 * on the server and not a code this build can translate, so it is shown as it
 * arrived or not at all; the same rule as a notification's `title`. A per-post
 * `code` is the ask that would let this be worded here — `docs/open-questions.md`.
 */
function FailedRows({
  posts,
  campaignOfPost,
}: {
  posts: ActivityReport['failed']['posts']
  campaignOfPost: (postId: string) => string | null
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()

  return (
    <ul className="flex flex-col">
      {posts.map((post) => {
        const channel = resolve(post.platform_id)?.name ?? post.platform_id
        const what =
          post.status === 'not_published'
            ? t('activity.report.status.notPublished')
            : t('activity.report.status.failed')
        const campaignId = campaignOfPost(post.post_id)
        const label = channel ? `${what} — ${channel}` : what

        // No campaign means the post is deleted or out of this reader's reach.
        // The row still says what happened, which is the part that matters.
        if (!campaignId) {
          return (
            <Row
              key={post.post_id}
              label={label}
              detail={post.failure_reason}
            />
          )
        }
        return (
          <li
            key={post.post_id}
            className="border-b border-border last:border-b-0"
          >
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId, postId: post.post_id }}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
                {label}
              </span>
              {post.failure_reason && (
                <span className="min-w-0 truncate text-xs text-tertiary-foreground">
                  {post.failure_reason}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Who wrote the day's posts — the half of the report the client could never
 * compute, because `created_by` was not in the summaries projection until
 * CON-285 put it there.
 *
 * A `user_id` that is not in the member list belongs to somebody who has left
 * the workspace: their posts survive the membership, so the count is real and
 * only the name is gone.
 */
function AuthorRows({ report }: { report: ActivityReport }) {
  const { t } = useTranslation()
  const { data: members } = useWorkspaceMembers()

  const nameOf = useMemo(() => {
    const byId = new Map((members ?? []).map((m) => [m.id, m.name || m.email]))
    return (id: string) =>
      id
        ? (byId.get(id) ?? t('activity.report.formerMember'))
        : t('activity.report.noAuthor')
  }, [members, t])

  return (
    <>
      <p className="text-sm text-primary-foreground">
        {[
          t('activity.report.created', { count: report.created.posts_total }),
          report.created.scheduled_total > 0 &&
            t('activity.report.scheduled', {
              count: report.created.scheduled_total,
            }),
        ]
          .filter((part): part is string => typeof part === 'string')
          .join(' · ')}
      </p>
      <ul className="flex flex-col">
        {report.created.by_author.map((author) => (
          <Row
            key={author.user_id || 'unattributed'}
            label={nameOf(author.user_id)}
            value={`${author.count}`}
          />
        ))}
      </ul>
    </>
  )
}

/** The campaigns started that day, by name, each one openable. */
function CampaignRows({ ids }: { ids: string[] }) {
  const { t } = useTranslation()
  const { data: campaigns } = useCampaigns()

  const nameOf = useMemo(() => {
    const byId = new Map((campaigns ?? []).map((c) => [c.id, c.name.trim()]))
    return (id: string) => byId.get(id) || t('nav.untitledCampaign')
  }, [campaigns, t])

  return (
    <ul className="flex flex-col">
      {ids.map((id) => (
        <li key={id} className="border-b border-border last:border-b-0">
          <Link
            to="/campaigns/$campaignId/overview"
            params={{ campaignId: id }}
            className="flex items-baseline justify-between gap-4 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
              {nameOf(id)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-xs/4 font-medium uppercase text-tertiary-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  detail,
}: {
  label: string
  value?: string
  detail?: string
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 flex-1 truncate text-sm text-primary-foreground">
        {label}
      </span>
      {detail && (
        <span className="min-w-0 truncate text-xs text-tertiary-foreground">
          {detail}
        </span>
      )}
      {value && (
        <span className="font-mono text-sm text-primary-foreground">
          {value}
        </span>
      )}
    </li>
  )
}
