import { useState } from 'react'
import { PlatformFilter } from '@/components/analytics/PlatformFilter'
import { DEFAULT_PERIOD, PERIODS } from '../../-fixtures'
import { HarnessShell, Specimen } from '../../chrome-page'
import { PLATFORM_FILTER_STATES, type PlatformFilterState } from '../-states'

/**
 * The scope bar, in every state it has to survive.
 *
 * Each specimen is live — click a platform, change the period, and the bar
 * moves. What does not move is everything a real surface would put below it,
 * which is the point of showing this on its own: the bar has to say what it is
 * counting without any help from the figures, because on the real page the only
 * other evidence is a number quietly getting smaller.
 */
export function PlatformFilterHarness() {
  return (
    <HarnessShell
      title="Platforms filter"
      lede="The line that says what is being counted and over what window. The marks change what is in the numbers at all; the period on the right changes how far back they reach. Each mark carries its connected-account count — a platform showing thin numbers is usually a platform with two of its three accounts unconnected."
    >
      {PLATFORM_FILTER_STATES.map((state) => (
        <Specimen key={state.id} label={state.label} note={state.note}>
          <LiveFilter state={state} />
        </Specimen>
      ))}
    </HarnessShell>
  )
}

function LiveFilter({ state }: { state: PlatformFilterState }) {
  const [selected, setSelected] = useState(state.selected)
  const [period, setPeriod] = useState(DEFAULT_PERIOD)

  return (
    <PlatformFilter
      platforms={state.platforms}
      selected={selected}
      onChange={setSelected}
      period={period}
      periods={PERIODS}
      onPeriodChange={setPeriod}
    />
  )
}
