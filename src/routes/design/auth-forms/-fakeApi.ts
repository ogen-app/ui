/**
 * A fake backend for the auth harness — DESIGN BRANCH ONLY.
 *
 * The auth forms are worth looking at mid-flight and after a refusal, and both
 * of those states belong to the server. Reproducing them against a real API
 * means owning an account whose password is wrong, an email that is already
 * taken and a reset link that has expired — so in practice nobody looks at
 * them, and they rot.
 *
 * This patches `window.fetch` for `/api/*` only, and decides the outcome from
 * what was typed. The rules are printed on the page; the short version is that
 * the word "wrong", the address `taken@example.com`, a *second* reset link for
 * `limited@example.com`, and the token `expired` each fail their own way.
 *
 * Every response is delayed, because the loading state is half of what there
 * is to look at here.
 */

const LATENCY_MS = 700

type Handler = (body: Record<string, never>) => Response | Promise<Response>

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** The shape `errorMessage` reads. */
function fail(status: number, message: string): Response {
  return json(status, { error: message })
}

const NOW = '2026-08-08T09:00:00Z'

const RAW_USER = {
  id: 'u_design',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  created_at: NOW,
  updated_at: NOW,
}

const TENANT = { id: 't_design', name: 'Alephbet', slug: 'alephbet' }

/**
 * Deliberately **400, not 401**, for a rejected credential.
 *
 * A 401 from anywhere in the app calls `handleUnauthorized`, which navigates
 * the whole window to `/auth/login`. The real login screen is exempt by
 * pathname; `/design/*` is not, so a faithful 401 here would throw the harness
 * off the page the moment you demonstrated a wrong password. The status is the
 * one thing the forms never show — they render the message, which is identical.
 */
const WRONG_CREDENTIAL = 400

/** How many reset links this page has asked for, per address. */
const sendsPerAddress = new Map<string, number>()

const HANDLERS: Record<string, Handler> = {
  'POST /api/sessions': (body) => {
    const password = String(body.password ?? '')
    if (/wrong/i.test(password)) return fail(WRONG_CREDENTIAL, 'invalid credentials')
    return json(200, { id: 's_design', user_id: RAW_USER.id, expires_at: NOW })
  },

  'POST /api/tenants': (body) => {
    const user = (body.user ?? {}) as { email?: string; name?: string }
    if (user.email === 'taken@example.com') {
      return fail(409, 'That email is already registered')
    }
    return json(200, {
      tenant: TENANT,
      user: { ...RAW_USER, name: user.name ?? RAW_USER.name, email: user.email },
      session: { id: 's_design', user_id: RAW_USER.id, expires_at: NOW },
    })
  },

  /**
   * The throttle is per address and only bites on a *second* send — which is
   * the point: the first link has to get through, or the confirmation panel
   * the resend lives on is never reached.
   */
  'POST /api/password-reset': (body) => {
    const email = String(body.email ?? '')
    const sends = (sendsPerAddress.get(email) ?? 0) + 1
    sendsPerAddress.set(email, sends)
    if (email === 'limited@example.com' && sends > 1) {
      return fail(429, 'Too many reset emails for that address. Try again in 15 minutes.')
    }
    return new Response(null, { status: 202 })
  },

  'POST /api/password-reset/confirm': (body) => {
    if (String(body.token ?? '').includes('expired')) {
      return fail(400, 'This link has expired')
    }
    return new Response(null, { status: 200 })
  },

  'GET /api/current_user': () => json(200, { ...RAW_USER, tenant: TENANT }),
}

/** `PUT /api/users/:id` — the id varies, so it is matched by shape. */
function updateUser(body: Record<string, never>): Response {
  return json(200, { ...RAW_USER, name: body.name ?? RAW_USER.name })
}

/**
 * Patches `window.fetch` and returns the undo.
 *
 * **Call this from the harness component, never at module scope.** The
 * generated route tree imports every route module statically, so a patch
 * applied on import is applied on app boot: `/campaigns` then loads against
 * this file, `GET /api/current_user` answers with a user who doesn't exist,
 * and everything behind it retries 404s for as long as you let it. It has to
 * live and die with the harness being on screen.
 */
export function installFakeApi(): () => void {
  // The reference, not a bound copy: the undo below has to put back the exact
  // function it took, or a second install would wrap the first one's wrapper.
  const real = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const { pathname } = new URL(url, window.location.origin)
    // `call` because `fetch` is illegal to invoke detached from `window`.
    if (!pathname.startsWith('/api/')) return real.call(window, input, init)

    const method = (init?.method ?? 'GET').toUpperCase()
    let body: Record<string, never> = {}
    try {
      body = init?.body ? JSON.parse(String(init.body)) : {}
    } catch {
      // A body we can't read is a body no rule below asks about.
    }

    await new Promise((r) => setTimeout(r, LATENCY_MS))

    if (method === 'PUT' && /^\/api\/users\//.test(pathname)) return updateUser(body)

    const handler = HANDLERS[`${method} ${pathname}`]
    if (handler) return handler(body)

    return fail(404, `No fake handler for ${method} ${pathname}`)
  }

  return () => {
    window.fetch = real
  }
}
