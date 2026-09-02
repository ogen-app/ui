import type { ReactNode } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { AudienceEditor } from '@/components/brand/AudienceEditor'
import { audienceStarter } from '@/components/brand/AudiencesSection'
import { isFeatureEnabled } from '@/config/featureFlags'
import { useBrand, useDeleteAudience, useSaveAudience } from '@/hooks/useBrand'
import { toast } from '@/stores/toastStore'

/**
 * `/brand/audiences/:id` — one audience, being described.
 *
 * The voice route's twin, and deliberately identical down to the branches: the
 * caret goes back one step, `new` is an id like any other so writing one and
 * opening one are the same screen, the flag is re-checked because escaping the
 * layout escapes its `beforeLoad`, and an id the library has never heard of
 * answers with "no such audience" rather than falling through to a blank form
 * that would save under whatever the address bar happened to say.
 *
 * Two sections now have a third level, which is the point at which the parts
 * they share belong in one place — see `components/brand/editor.tsx`.
 */
export const Route = createFileRoute(
  '/_authenticated/brand_/audiences/$audienceId',
)({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-materials')) {
      throw redirect({ to: '/campaigns' })
    }
  },
  /** Which starter this was forked from, when arriving from an empty library. */
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' ? { from: search.from } : {},
  component: AudienceEditorPage,
})

function AudienceEditorPage() {
  const { audienceId } = Route.useParams()
  const { from } = Route.useSearch()
  const navigate = useNavigate()

  const { data, isPending, isError } = useBrand()
  const save = useSaveAudience()
  const remove = useDeleteAudience()

  const back = () => navigate({ to: '/brand/audiences' })
  const isNew = audienceId === 'new'
  const audience = data?.audiences.find((a) => a.id === audienceId) ?? null

  /*
   * No title: the name is the first field of the editor below, and a page
   * titled by a name you are in the middle of typing is a header that flickers
   * as you type it. Handed to the editor rather than rendered above it, because
   * the sticky gradient only fades content that passes *under* it and the
   * scroller is in there.
   */
  const header = (
    <PageHeader
      back={<BrandBackButton to="/brand/audiences" label="Back to audiences" />}
    />
  )

  const body = () => {
    if (isNew) {
      return (
        <AudienceEditor
          header={header}
          audience={null}
          starter={audienceStarter(from)}
          onCancel={back}
          onSave={(written) => {
            save.mutate(written, {
              onSuccess: () => {
                toast.success(`${written.name} is in the library.`)
                back()
              },
            })
          }}
        />
      )
    }

    if (isPending) {
      return (
        <Static header={header}>
          <PageLoader />
        </Static>
      )
    }
    if (isError || !audience) {
      return (
        <Static header={header}>
          <PageError
            subHeader="NOT FOUND"
            errorType="NOT FOUND"
            header="No such audience"
            message="It may have been deleted, or the link may be to another workspace."
            action={
              <Button variant="ghost" size="sm" onClick={back}>
                <span className="uppercase">Back to audiences</span>
              </Button>
            }
          />
        </Static>
      )
    }

    return (
      <AudienceEditor
        header={header}
        audience={audience}
        onCancel={back}
        onSave={(written) => {
          save.mutate(written, {
            onSuccess: () => {
              toast.success(`${written.name} saved.`)
              back()
            },
          })
        }}
        onDelete={() => {
          remove.mutate(audience.id, {
            onSuccess: () => {
              toast.success(`${audience.name} was deleted.`)
              back()
            },
          })
        }}
      />
    )
  }

  return <BrandPage>{body()}</BrandPage>
}

/**
 * The header above something that does not scroll — the spinner, and the
 * no-such-audience page. Nothing passes under the gradient in either.
 */
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
