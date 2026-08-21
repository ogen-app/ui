import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { VoiceEditor } from '@/components/brand/VoiceEditor'
import { voiceStarter } from '@/components/brand/VoicesSection'
import { EMPTY_BRAND } from '@/components/brand/types'
import { isFeatureEnabled } from '@/config/featureFlags'
import { toast } from '@/stores/toastStore'

/**
 * `/brand/voices/:id` — one voice, being written.
 *
 * **Escaped from the Brand layout on purpose** (the trailing underscore on
 * `brand_`). The tab bar is the index's own navigation: five tabs across the
 * top of a screen you are *inside* offer to throw away what you have typed, and
 * the way back from an editor is one deliberate step, not five lateral ones.
 * Same reason the asset editor and the post editor sit outside their lists.
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
 * **Nothing here persists.** There is no Brand endpoint (CON-228) and no query,
 * so the workspace is `EMPTY_BRAND` and `SAVE VOICE` says what it did rather
 * than pretending. The screen is the design; the wiring is one `useVoices` away
 * when the API lands.
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

  const back = () => navigate({ to: '/brand/voices' })
  const voice = EMPTY_BRAND.voices.find((v) => v.id === voiceId) ?? null

  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-full min-h-0 flex-col">
        <PageHeader
          back={
            <Button variant="ghost" size="sm" onClick={back}>
              <ArrowLeftIcon />
              <span>Voices</span>
            </Button>
          }
        />
        <div className="min-h-0 grow">
          <VoiceEditor
            voice={voice}
            starter={voiceStarter(from)}
            onCancel={back}
            onSave={() => {
              toast.info('Nothing was saved — Brand has no API yet.')
              back()
            }}
            onDelete={
              voice
                ? () => {
                    toast.info('Nothing was deleted — Brand has no API yet.')
                    back()
                  }
                : undefined
            }
          />
        </div>
      </div>
    </PageContainer>
  )
}
