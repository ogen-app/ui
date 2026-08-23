import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { GuardrailsEditor } from '@/components/brand/GuardrailsEditor'
import { useBrand, useDeleteGuardrails, useSaveGuardrails } from '@/hooks/useBrand'
import { toast } from '@/stores/toastStore'

/**
 * `/brand/guardrails` — what is true, what may be claimed, what never may.
 *
 * **The one Brand section with nothing under it.** Voices and audiences are
 * libraries and their rows are screens; there is one set of guardrails per
 * workspace, so a section listing it and an editor below the section were two
 * screens showing the same document with a click between them that chose
 * nothing. This route is the editor — see `GuardrailsEditor` for the argument
 * — and `/brand` is what the caret goes back to.
 *
 * ## Two things the merge makes this route responsible for
 *
 * **It waits for the fetch.** The other sections can draw a list while one is
 * loading; this screen's fields *are* the workspace's one set, and an empty
 * form rendered on a guess is a form that saves over what is already there.
 *
 * **The editor is keyed on whether anything is stored**, so deleting rebuilds
 * it empty rather than leaving the deleted rules standing in the fields,
 * looking like unsaved work. Keyed on existence rather than on `updatedAt`,
 * which is the version that also remounts on every ordinary save: the draft
 * already equals what was just stored, and rebuilding it only throws the
 * scroll position back to the top of a long document the moment somebody
 * commits — on a screen they stay on, which is the whole point of it.
 */
export const Route = createFileRoute('/_authenticated/brand/guardrails')({
  component: GuardrailsPage,
})

function GuardrailsPage() {
  const { data, isPending, isError } = useBrand()
  const save = useSaveGuardrails()
  const remove = useDeleteGuardrails()

  const header = <PageHeader back={<BrandBackButton />} />

  if (isPending) {
    return (
      <BrandPage>
        <Static header={header}>
          <PageLoader />
        </Static>
      </BrandPage>
    )
  }

  if (isError || !data) {
    return (
      <BrandPage>
        <Static header={header}>
          <PageError
            header="Guardrails could not be loaded"
            message="The workspace's rules are not reachable right now, and editing them without seeing them would overwrite what is there. Everything else in the app is unaffected."
          />
        </Static>
      </BrandPage>
    )
  }

  const { guardrails } = data

  return (
    <BrandPage>
      <GuardrailsEditor
        key={guardrails ? 'set' : 'empty'}
        header={header}
        guardrails={guardrails}
        onSave={(written) => {
          save.mutate(written, {
            onSuccess: () => {
              toast.success(
                guardrails ? 'The guardrails are saved.' : 'The guardrails are set.',
              )
            },
          })
        }}
        onDelete={() => {
          remove.mutate(undefined, {
            onSuccess: () => {
              toast.success('The guardrails were deleted.')
            },
          })
        }}
      />
    </BrandPage>
  )
}

/**
 * The header above something that does not scroll — the spinner, and the
 * failed-to-load page. Nothing passes under the gradient in either.
 */
function Static({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div className="min-h-0 grow">{children}</div>
    </div>
  )
}
