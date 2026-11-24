import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The config is a snapshot taken at module load, so each case sets the stage —
 * `window.__OGEN_CONFIG__` as `env.js` would leave it, the build's `VITE_*` —
 * and then imports a fresh copy.
 */
async function load(config?: Window['__OGEN_CONFIG__']) {
  window.__OGEN_CONFIG__ = config
  vi.resetModules()
  return (await import('./runtimeConfig')).runtimeConfig
}

afterEach(() => {
  delete window.__OGEN_CONFIG__
  vi.unstubAllEnvs()
})

describe('runtimeConfig', () => {
  it('reads what the container wrote into env.js', async () => {
    vi.stubEnv('DEV', false)
    const config = await load({
      SENTRY_DSN: 'https://key@o0.ingest.sentry.io/1',
      SENTRY_ENVIRONMENT: 'production',
      SENTRY_TRACES_SAMPLE_RATE: '0.25',
      DEV_TOOLS: '1',
    })

    expect(config).toEqual({
      sentryDsn: 'https://key@o0.ingest.sentry.io/1',
      sentryEnvironment: 'production',
      sentryTracesSampleRate: 0.25,
      devTools: true,
    })
  })

  it('prefers env.js over the build, key by key', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://build@o0.ingest.sentry.io/1')
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'build-env')
    const config = await load({ SENTRY_ENVIRONMENT: 'development' })

    expect(config.sentryEnvironment).toBe('development')
    // Left out of env.js, so the build's value stands — how `pnpm dev` works.
    expect(config.sentryDsn).toBe('https://build@o0.ingest.sentry.io/1')
  })

  it('works with no env.js at all', async () => {
    vi.stubEnv('DEV', false)
    const config = await load(undefined)

    expect(config).toEqual({
      sentryDsn: '',
      sentryEnvironment: 'development',
      sentryTracesSampleRate: 0.1,
      devTools: false,
    })
  })

  it('turns dev tools on for "1" alone', async () => {
    vi.stubEnv('DEV', false)
    for (const value of ['0', 'true', 'yes', '']) {
      expect((await load({ DEV_TOOLS: value })).devTools).toBe(false)
    }
    expect((await load({ DEV_TOOLS: '1' })).devTools).toBe(true)
  })

  it('always has dev tools under pnpm dev', async () => {
    vi.stubEnv('DEV', true)
    expect((await load({})).devTools).toBe(true)
  })

  it('clamps the sample rate to [0, 1], defaulting to 0.1', async () => {
    const rate = async (value: string) =>
      (await load({ SENTRY_TRACES_SAMPLE_RATE: value })).sentryTracesSampleRate

    expect(await rate('0')).toBe(0)
    expect(await rate('1')).toBe(1)
    expect(await rate('1.5')).toBe(0.1)
    expect(await rate('-0.1')).toBe(0.1)
    expect(await rate('lots')).toBe(0.1)
    expect(await rate(' ')).toBe(0.1)
  })
})
