import type { ReactNode } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isFeatureEnabled } from '@/config/featureFlags'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandBackButton, BrandPage } from '@/components/brand/detail'
import { FactsEditor } from '@/components/brand/FactsSection'
import { useFacts, useSaveFacts } from '@/hooks/useFacts'
import { toast } from '@/stores/toastStore'

/**
 * `/foundation/facts` — the ledger of what is true.
 *
 * Built like `/foundation/guardrails`, which it was part of until the table
 * arrived: a singleton section with no list above it, so the route *is* the
 * editor and the caret goes back to the Overview. It waits for the fetch for
 * the same reason that one does — the rows are the workspace's own, and a table
 * rendered on a guess is a table that saves over what is already there.
 *
 * The statements still travel on the guardrails record; `useSaveFacts` is where
 * that, and the metadata that has nowhere to travel yet, are reconciled.
 */
export const Route = createFileRoute('/_authenticated/foundation/facts')({
  // While `facts-ledger` is off the statements live where they always did —
  // the guardrails editor — and this table's metadata has no backend home.
  beforeLoad: () => {
    if (!isFeatureEnabled('facts-ledger')) {
      throw redirect({ to: '/foundation/guardrails' })
    }
  },
  component: FactsPage,
})

function FactsPage() {
  const { facts, isPending, isError } = useFacts()
  const { save } = useSaveFacts()

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
      {/* No `key`: the draft is seeded once and a background refetch must not
          throw away rows somebody is in the middle of typing. After a save the
          two agree anyway — the save is what the draft was. */}
      <FactsEditor
        header={header}
        facts={facts}
        onSave={(next) => {
          save(next, {
            onSuccess: () => toast.success('The facts are saved.'),
          })
        }}
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
