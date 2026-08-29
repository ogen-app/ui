import type { ReactNode } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { VoiceEditor } from '@/components/brand/VoiceEditor'
import { voiceStarter } from '@/components/brand/VoicesSection'
import { isFeatureEnabled } from '@/config/featureFlags'
import { useBrand, useDeleteVoice, useSaveVoice } from '@/hooks/useBrand'
import { toast } from '@/stores/toastStore'

/**
 * `/brand/voices/:id` — one voice, being written.
 *
 * **The third level**, and the only section that has one: the Overview lists
 * the voices, `/brand/voices` shows them, and this is one of them open. The
 * caret at top-left goes back one step, the same as the caret on the section
 * above it — from here the way out is always one gesture, never a choice.
 *
 * Escaped from the Brand layout (the trailing underscore on `brand_`) because
 * `/brand/voices` is a leaf and a leaf cannot have children. The URL is
 * identical either way — the underscore never reaches the address bar — so
 * this is a file-tree fact, not a navigation one.
 *
 * The flag is re-checked here rather than inherited, because escaping the
 * layout escapes its `beforeLoad` too — "every entry point" in the standing
 * rule means this one as well.
 *
 * `new` is a voice id like any other, which is what lets one route serve
 * writing one, forking one (`?from=<starter>`) and editing one. There is no
 * separate create screen, because there is no separate creating: a voice is
 * whatever is in the editor when you commit it.
 *
 * Saving writes through `useBrand`'s mutations, which today reach a stub
 * (`services/api/brand.ts`) rather than an endpoint — a JSON seed and
 * `localStorage`. The distinction is invisible from here, which is the whole
 * point of putting the fake at the service and not in the screen: when CON-228
 * lands, this file does not change.
 */
export const Route = createFileRoute('/_authenticated/brand_/voices/$voiceId')({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-materials')) {
      throw redirect({ to: '/campaigns' })
    }
  },
  /**
   * Which starter this was forked from, when arriving from an empty library.
   *
   * Absent rather than `undefined` when there isn't one: a key that is always
   * present makes `search` a required argument on every `navigate` to this
   * route, including the two that have nothing to say about starters.
   */
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === 'string' ? { from: search.from } : {},
  component: VoiceEditorPage,
})

function VoiceEditorPage() {
  const { voiceId } = Route.useParams()
  const { from } = Route.useSearch()
  const navigate = useNavigate()

  const { data, isPending, isError } = useBrand()
  const save = useSaveVoice()
  const remove = useDeleteVoice()

  const back = () => navigate({ to: '/brand/voices' })
  const isNew = voiceId === 'new'
  const voice = data?.voices.find((v) => v.id === voiceId) ?? null

  /*
   * No title: the voice's name is the first field of the editor below, and a
   * page titled by a name you are in the middle of typing is a header that
   * flickers as you type it. Same arrangement as the post editor, whose title
   * is likewise in the document — and the card at the top of the column names
   * the voice you opened.
   *
   * Handed to the editor rather than rendered above it: the sticky gradient
   * only fades content that passes *under* it, so the header has to be inside
   * the scroller. The two branches that have nothing to scroll get their own
   * copy above a static frame.
   */
  const header = (
    <PageHeader
      back={<BrandBackButton to="/brand/voices" label="Back to voices" />}
    />
  )

  const body = () => {
    if (isNew) {
      return (
        <VoiceEditor
          header={header}
          voice={null}
          starter={voiceStarter(from)}
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

    // The library is what says which voices exist, so an id it has never heard
    // of cannot open an editor. Falling through to the blank form — which is
    // what a `?? null` here would do — would answer a wrong URL with a create
    // screen, and the first thing typed into it would be saved under whatever
    // the address bar happened to say.
    if (isPending)
      return (
        <Static header={header}>
          <PageLoader />
        </Static>
      )
    if (isError || !voice) {
      return (
        <Static header={header}>
          <PageError
            subHeader="NOT FOUND"
            errorType="NOT FOUND"
            header="No such voice"
            message="It may have been deleted, or the link may be to another workspace."
            action={
              <Button variant="ghost" size="sm" onClick={back}>
                <span className="uppercase">Back to voices</span>
              </Button>
            }
          />
        </Static>
      )
    }

    return (
      <VoiceEditor
        header={header}
        voice={voice}
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
          remove.mutate(voice.id, {
            onSuccess: () => {
              toast.success(`${voice.name} was deleted.`)
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
 * no-such-voice page. Nothing passes under the gradient in either, so there is
 * nothing to keep inside a scroller.
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
