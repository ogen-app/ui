import type { ReactNode } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { SeriesEditor } from '@/components/series/SeriesEditor'
import {
  SERIES_STARTERS,
  blankSeries,
  seriesFromStarter,
} from '@/components/series/starters'
import { isFeatureEnabled } from '@/config/featureFlags'
import {
  useDeleteSeries,
  useSaveSeries,
  useSeriesLibrary,
} from '@/hooks/useSeries'
import { toast } from '@/stores/toastStore'

/**
 * `/foundation/series/:id` — one series, being written (CON-264).
 *
 * The voice editor's route, one section over, and intentionally its twin: third
 * level, one caret back, `new` is an id like any other. There is no separate
 * create screen because there is no separate creating — a series is whatever is
 * in the editor when you commit it.
 *
 * Escaped from the Foundation layout (`foundation_`) because `/foundation/series`
 * is a leaf and a leaf cannot have children. The URL is identical either way.
 * **Both flags are re-checked here**, because escaping the layout escapes its
 * `beforeLoad` too.
 *
 * Saving writes through `useSeries`, which reaches a stub rather than an
 * endpoint. That distinction is invisible from here, which is the whole point
 * of putting the fake at the service: when the table lands, this file does not
 * change.
 */
export const Route = createFileRoute(
  '/_authenticated/foundation_/series/$seriesId',
)({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-materials') || !isFeatureEnabled('series')) {
      throw redirect({ to: '/campaigns' })
    }
  },
  /** Which starter this was forked from. Absent rather than `undefined`. */
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' ? { from: search.from } : {},
  component: SeriesEditorPage,
})

function SeriesEditorPage() {
  const { t } = useTranslation()
  const { seriesId } = Route.useParams()
  const { from } = Route.useSearch()
  const navigate = useNavigate()

  const { data, isPending, isError } = useSeriesLibrary()
  const save = useSaveSeries()
  const remove = useDeleteSeries()

  const back = () => navigate({ to: '/foundation/series' })
  const isNew = seriesId === 'new'
  const series = data?.find((entry) => entry.id === seriesId) ?? null

  // No title: the series' name is the first field below, and a header titled by
  // a name you are typing flickers as you type it. Handed to the editor rather
  // than rendered above it, because the sticky gradient only fades content that
  // passes under it.
  const header = (
    <PageHeader
      back={
        <BrandBackButton
          to="/foundation/series"
          label={t('series.detail.back')}
        />
      }
    />
  )

  const body = () => {
    // The create branch waits on the library too, unlike the voice editor's —
    // not because anything is decided by how many series exist, but because a
    // save has to know whether the name it is about to write is a new row or a
    // replace, and that is `data`'s to answer.
    if (isPending) {
      return (
        <Static header={header}>
          <PageLoader />
        </Static>
      )
    }

    if (isNew) {
      const starter = SERIES_STARTERS.find((entry) => entry.id === from)
      return (
        <SeriesEditor
          header={header}
          // Written from the workspace library, so it belongs to the workspace.
          // A campaign's own path passes its own scope — see `seriesFromStarter`.
          series={
            starter
              ? seriesFromStarter(t, starter, { kind: 'workspace' })
              : blankSeries({ kind: 'workspace' })
          }
          onCancel={back}
          onSave={(written) =>
            save.mutate(written, {
              onSuccess: () => {
                toast.success(
                  t('series.detail.created', { name: written.name }),
                )
                back()
              },
            })
          }
        />
      )
    }

    // The library is what says which series exist, so an id it has never heard
    // of cannot open an editor. Falling through to the blank form would answer
    // a wrong URL with a create screen, and the first thing typed into it would
    // be saved under whatever the address bar happened to say.
    if (isError || !series) {
      return (
        <Static header={header}>
          <PageError
            subHeader={t('errors.notFound.type')}
            errorType={t('errors.notFound.type')}
            header={t('series.detail.notFoundHeader')}
            message={t('brand.detail.missingMessage')}
            action={
              <Button variant="ghost" size="sm" onClick={back}>
                <span className="uppercase">{t('series.detail.back')}</span>
              </Button>
            }
          />
        </Static>
      )
    }

    return (
      <SeriesEditor
        header={header}
        series={series}
        onCancel={back}
        onSave={(written) =>
          save.mutate(written, {
            onSuccess: () => {
              toast.success(t('series.detail.saved', { name: written.name }))
              back()
            },
          })
        }
        onDelete={() =>
          remove.mutate(series.id, {
            onSuccess: () => {
              toast.success(t('series.detail.deleted', { name: series.name }))
              back()
            },
          })
        }
      />
    )
  }

  return <BrandPage>{body()}</BrandPage>
}

/** The header above something that does not scroll — the spinner, and the 404. */
function Static({
  header,
  children,
}: {
  header: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div className="min-h-0 grow">{children}</div>
    </div>
  )
}
