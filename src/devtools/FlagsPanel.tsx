import {
  buildFlagValue,
  FLAG_IDS,
  type FeatureFlag,
} from '@/config/featureFlags'
import {
  clearFlagOverrides,
  readFlagOverrides,
  serializeFlagOverrides,
  setFlagOverride,
} from '@/config/flagOverrides'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  demoMode,
  setDemoMode,
  type DemoMode,
} from '@/services/api/analytics.demo'
import { cn } from '@/lib'

/** What each analytics mode answers, said in the panel rather than in a doc. */
const ANALYTICS_MODES: { id: DemoMode; label: string; note: string }[] = [
  { id: 'live', label: 'Live', note: 'Whatever the API says' },
  { id: 'demo', label: 'Demo', note: 'Simulated numbers, a full dashboard' },
  { id: 'empty', label: 'No data', note: 'Wired up, nothing published yet' },
  {
    id: 'unavailable',
    label: 'Unavailable',
    note: 'Measurement not connected',
  },
]

/**
 * The staging flag panel — every flag in the build, and a switch per flag that
 * applies to this browser and no other.
 *
 * This module is only ever reached through a dead-code-eliminated branch in
 * `routes/flags.tsx`, so a production build never emits its chunk. Nothing in
 * the app links here: the fast path is a bookmarked `?ff=` link, and this is
 * where you come to see what you have on and turn it back off.
 *
 * **Its copy is deliberately not in the i18n catalogue.** This is a developer
 * tool that does not exist in the shipped app, which is the exemption in
 * `CLAUDE.md` — a translation of it would be catalogue weight for a screen no
 * user can open. It is the one screen in `src/` that may hold literal English.
 */
export default function FlagsPanel() {
  const overrides = readFlagOverrides()
  const unknown = Object.keys(overrides).filter(
    (flag) => !FLAG_IDS.includes(flag as FeatureFlag),
  )

  // Flags are read in route `beforeLoad` guards and snapshotted at module
  // load, so a switch cannot take effect under a mounted router — reloading is
  // what makes the whole app agree about the answer. See `flagOverrides.ts`.
  function apply(change: () => void) {
    change()
    window.location.reload()
  }

  const share = serializeFlagOverrides(overrides)

  return (
    <div className="min-h-dvh bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium">Feature flags</h1>
          <p className="text-sm text-tertiary-foreground">
            Forces a flag on or off <strong>in this browser only</strong>.
            Nobody else on this deploy is affected, and nothing is written to
            the workspace. This page does not exist in a production build.
          </p>
        </header>

        <ul className="flex flex-col">
          {FLAG_IDS.map((flag) => {
            const base = buildFlagValue(flag)
            const override = overrides[flag]
            const on = override ?? base
            const forced = override !== undefined

            return (
              <li
                key={flag}
                className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-mono text-sm">{flag}</span>
                  <span className="text-xs text-tertiary-foreground">
                    {forced
                      ? `forced ${on ? 'on' : 'off'} — the build says ${base ? 'on' : 'off'}`
                      : `${base ? 'on' : 'off'} in this build`}
                  </span>
                </div>

                {forced && (
                  <button
                    type="button"
                    className="text-xs text-tertiary-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => apply(() => setFlagOverride(flag, null))}
                  >
                    reset
                  </button>
                )}

                <Switch
                  checked={on}
                  aria-label={flag}
                  onCheckedChange={(next) =>
                    apply(() =>
                      // Choosing the build's own value is not an override —
                      // it drops the entry, so the flag keeps following the
                      // deploy instead of being pinned to what it says today.
                      setFlagOverride(flag, next === base ? null : next),
                    )
                  }
                />
              </li>
            )
          })}
        </ul>

        {unknown.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">Not flags in this build</h2>
            <p className="text-sm text-tertiary-foreground">
              Left over from a branch that declared them, or a typo. They do
              nothing.
            </p>
            <ul className="flex flex-col">
              {unknown.map((flag) => (
                <li
                  key={flag}
                  className="flex items-center gap-4 border-b border-border py-3 last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-tertiary-foreground">
                    {flag}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-tertiary-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => apply(() => setFlagOverride(flag, null))}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Analytics data</h2>
          <p className="text-sm text-tertiary-foreground">
            A local API measures nothing, so the dashboard is only ever seen in
            its setup state. <strong>Demo</strong> serves simulated numbers to
            all three cards instead — invented, and about this workspace's own
            posts, so the corner says so for as long as it is on. Also reachable
            as <code className="font-mono">?analytics=demo</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_MODES.map((option) => (
              <Button
                key={option.id}
                variant={demoMode() === option.id ? 'default' : 'outline'}
                size="sm"
                title={option.note}
                onClick={() => apply(() => setDemoMode(option.id))}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Share this set</h2>
          <p className="text-sm text-tertiary-foreground">
            Opening this link applies the same overrides in another browser. A
            leading <code className="font-mono">-</code> forces a flag off, and{' '}
            <code className="font-mono">?ff=</code> on its own clears
            everything.
          </p>
          <code
            className={cn(
              'block overflow-x-auto rounded-md bg-secondary px-3 py-2',
              'font-mono text-xs text-secondary-foreground',
            )}
          >
            {`${window.location.origin}/campaigns?ff=${share}`}
          </code>
        </div>

        <div>
          <Button
            variant="outline"
            disabled={Object.keys(overrides).length === 0}
            onClick={() => apply(clearFlagOverrides)}
          >
            Reset all to build defaults
          </Button>
        </div>
      </div>
    </div>
  )
}
