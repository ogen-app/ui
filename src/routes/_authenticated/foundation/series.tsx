import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { SeriesDetail } from '@/components/series/SeriesDetail'
import { SeriesSection } from '@/components/series/SeriesSection'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * `/foundation/series` — the recurring things this workspace makes (CON-264).
 *
 * The library, and deliberately **not** where the work happens. Everything a
 * person actually does with a series — pick it up, give it a rate, see what it
 * has produced — happens on a campaign's Strategy page, because that is the
 * level people live at. This screen answers *what do we have*, and it earns its
 * keep once a workspace runs more than one campaign and wants to know that the
 * digest works in all of them.
 *
 * Which is also the reason it was built second. A library with nothing pointing
 * at it is a filing cabinet.
 *
 * **One gate, and it is this file's.** The Foundation layout above is a bare
 * `Outlet` — Brand shipped and its flag went with it — so `series` is checked
 * here, because the section is offered separately from the module it sits in
 * (see `shown` in `lib/brandSections`). With this flag off there is no card on
 * the hub and no route to reach directly — which is what "every entry point"
 * asks for.
 *
 * Every way out of this screen leads to the same editor: writing one, forking a
 * starter and opening an existing one differ only in what it opens with. That
 * is why the section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/foundation/series')({
  beforeLoad: () => {
    if (!isFeatureEnabled('series')) throw redirect({ to: '/foundation' })
  },
  component: SeriesPage,
})

function SeriesPage() {
  const navigate = useNavigate()

  return (
    <SeriesDetail>
      {(series) => (
        <SeriesSection
          series={series}
          onAdd={() =>
            navigate({
              to: '/foundation/series/$seriesId',
              params: { seriesId: 'new' },
            })
          }
          onOpen={(seriesId) =>
            navigate({
              to: '/foundation/series/$seriesId',
              params: { seriesId },
            })
          }
          onStart={(from) =>
            navigate({
              to: '/foundation/series/$seriesId',
              params: { seriesId: 'new' },
              search: { from },
            })
          }
        />
      )}
    </SeriesDetail>
  )
}
