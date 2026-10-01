import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { FactsLedger } from '@/components/brand/FactsSection'
import { useFactMutations, useFacts } from '@/hooks/useFacts'
import { toast } from '@/stores/toastStore'

/**
 * `/foundation/facts` — the ledger of what is true.
 *
 * Built like `/foundation/guardrails`, which it was part of until the table
 * arrived: a singleton section with no list above it, so the route *is* the
 * screen and the caret goes back to the Overview. It waits for the fetch for
 * the same reason that one does — the rows are the workspace's own, and a table
 * rendered on a guess is a table that saves over what is already there.
 *
 * Each fact is its own row on the server (CON-316), written one at a time
 * through `useFactMutations`.
 */
export const Route = createFileRoute('/_authenticated/foundation/facts')({
  component: FactsPage,
})

function FactsPage() {
  const { facts, isPending, isError } = useFacts()
  const { save, remove } = useFactMutations()

  // Only the two static screens take a header from here. The ledger builds its
  // own, because the one control in it — ADD — is the screen's: the button
  // follows whichever tab is open and adds a problem under Problems, and a
  // header assembled out here could not know that.
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

  if (isError) {
    return (
      <BrandPage>
        <Static header={header}>
          <PageError
            header="The facts could not be loaded"
            message="What this workspace states as true is not reachable right now, and editing the ledger without seeing it would overwrite it. Everything else in the app is unaffected."
          />
        </Static>
      </BrandPage>
    )
  }

  return (
    <BrandPage>
      {/* Called per row, not per screen: the ledger has no commit bar, so
          every ADD, SAVE and removal arrives here on its own. The toast is
          the only confirmation left that a change reached the server, which
          is what a bar reading "Saved" used to be for. */}
      <FactsLedger
        facts={facts}
        onSave={(fact) =>
          save(fact).then(() => toast.success('The ledger is saved.'))
        }
        onRemove={(id) =>
          remove(id).then(() => toast.success('The ledger is saved.'))
        }
      />
    </BrandPage>
  )
}

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
