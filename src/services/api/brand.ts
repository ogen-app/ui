import type { BrandData, BrandVoice } from '@/components/brand/types'
import { getActiveWorkspaceId } from '@/lib/activeWorkspace'
import seed from './brand.seed.json'

/**
 * Brand's data layer — **a stub, and the only stubbed service in the app**
 * (CON-226/227).
 *
 * There is no `/api/brand`: CON-228 has not been written, so there is no
 * endpoint, no table and no column. Everything below fakes one, badly on
 * purpose — a promise, a small delay, and `localStorage` where a database goes.
 *
 * ## Why a stub rather than fixtures rendered straight into the routes
 *
 * The screens were built against constants, which was enough to argue about how
 * they look and not enough to argue about how they *work*. A constant cannot
 * show you what saving a voice feels like, whether the list is where you expect
 * it to be when you come back, or whether the tab counts move. Those questions
 * are the ones left, so the data has to behave like data: asynchronous,
 * writable, and still there after a refresh.
 *
 * ## Why not MSW
 *
 * A service worker intercepting `fetch` would buy fidelity we have no use for —
 * status codes, headers, a wire format — for a contract nobody has agreed yet.
 * CON-228 will be written *from* what this prototype settles on, so pinning a
 * JSON envelope now would be inventing the API by accident, in the mock. A
 * plain module is also visible: you can read it and see the whole fake, which
 * is not true of a worker that answers requests from somewhere off-screen.
 *
 * ## The seam
 *
 * The function signatures are the point. When the endpoint lands, each body
 * becomes one `apiJson` call and **nothing above this file changes** — the
 * hook, the routes and the components already treat this as a network.
 *
 * ```ts
 * export function getBrand(): Promise<BrandData> {
 *   return apiJson<BrandData>('/api/brand', 'Unable to fetch brand')
 * }
 * ```
 *
 * Two rules while it is a stub. It is reached **only** through `useBrand`, so
 * there is one place to change; and nothing outside the `brand-materials` flag
 * may read it, per the standing rule — a workspace's real brand is not in here,
 * and a screen that mixed the two would be lying about which is which.
 *
 * The types come from `components/brand/types` rather than `src/types/`, which
 * is backwards for a service and deliberate: a type in `src/types/` claims to
 * be what the server sends, and none of this is that yet. Both move together
 * when CON-228 lands.
 */

/**
 * The workspace the screens open on: **Quant Wealth Management**, the same
 * fixture the harness is drawn from, so the live tab and `/design/brand` are
 * two views of one workspace rather than two inventions.
 *
 * Cast once, here. TypeScript widens a JSON import — `"never"` becomes
 * `string`, so the literal unions in `VoiceRules` and `BrandOrigin` do not
 * survive the read — and there is no way to narrow it back without duplicating
 * the whole file as a `const`. The cast is no weaker than what replaces it:
 * `apiJson<BrandData>` is an unchecked assertion about a response body too.
 * Keep `brand.seed.json` in step with `types.ts` by hand.
 */
const SEED = seed as unknown as BrandData

/**
 * Where the fake writes.
 *
 * **Per workspace**, because the real thing will be tenant-scoped and a stub
 * that let one workspace's voices show up in another would teach the wrong
 * thing about the feature at exactly the moment somebody switched. A tab with
 * no workspace pinned rides the account default and gets the `default` bucket —
 * the same fallback `services/api/base.ts` makes.
 *
 * `localStorage` and not `sessionStorage`: surviving a refresh is most of what
 * makes this feel like a server rather than a fixture. It is also why this is
 * safe to leave lying around — it is seed data about an invented investment
 * firm, not anybody's brand.
 */
function storageKey(): string {
  return `ogen.brand.stub.${getActiveWorkspaceId() ?? 'default'}`
}

/**
 * Long enough to see, short enough not to be in the way.
 *
 * Not zero, and that is the point of the number: a resolved-immediately promise
 * hides every loading state the screens have, and the first thing worth knowing
 * about a screen is what it looks like before it has anything.
 */
const LATENCY_MS = 220

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

function read(): BrandData {
  try {
    const stored = localStorage.getItem(storageKey())
    if (stored) return JSON.parse(stored) as BrandData
  } catch {
    // Unparseable or unavailable storage falls back to the seed rather than
    // throwing. A corrupt stub is a nuisance; a Brand tab that will not open
    // until you clear storage by hand is a bug report about a fake.
  }
  return structuredClone(SEED)
}

function write(data: BrandData): BrandData {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(data))
  } catch {
    // Quota or private mode. The write is lost on the next read, which is the
    // honest degradation: the screen still shows what the mutation returned.
  }
  return data
}

export function getBrand(): Promise<BrandData> {
  return settle(read())
}

/**
 * Create or replace one voice — a whole-resource write, matching the shape the
 * rest of this app's API already has (`PUT /api/campaigns/:id`).
 *
 * The editor assembles the entire voice including its id, so there is no create
 * and no update here, only *this is the voice now*. That is the same claim the
 * editor route makes by serving `new` from the same URL as every other voice.
 *
 * **The one-default invariant is enforced here, not in the editor.** Saving a
 * voice with `isDefault` set demotes every other voice in the same write. It
 * belongs to whoever owns the collection — the editor holds one voice and
 * cannot see the other three, and a client that had to remember to clear them
 * would eventually forget on the one path nobody tested. CON-228 does this in a
 * transaction; this does it in an array, and the rule it is keeping is the
 * same.
 */
export function saveVoice(voice: BrandVoice): Promise<BrandVoice> {
  const data = read()
  const at = data.voices.findIndex((v) => v.id === voice.id)
  const next =
    at === -1
      ? [...data.voices, voice]
      : data.voices.map((v) => (v.id === voice.id ? voice : v))

  const voices = voice.isDefault
    ? next.map((v) => (v.id === voice.id ? v : { ...v, isDefault: false }))
    : next

  write({ ...data, voices })
  return settle(voice)
}

/**
 * Deleting the default hands the flag to whatever is left.
 *
 * A workspace with voices and no default is a state nothing in the UI can
 * repair: the editor only promotes, so the flag would sit unowned until
 * somebody happened to open a voice and switch it on. The first remaining voice
 * is an arbitrary choice and that is fine — any voice is a better answer than
 * none, and the library says out loud which one it landed on.
 */
export function deleteVoice(id: string): Promise<void> {
  const data = read()
  const gone = data.voices.find((v) => v.id === id)
  const voices = data.voices.filter((v) => v.id !== id)
  if (gone?.isDefault && voices.length > 0) {
    voices[0] = { ...voices[0], isDefault: true }
  }

  write({ ...data, voices })
  return settle(undefined)
}

/**
 * Throw away everything this workspace has done to the stub and start from the
 * seed again.
 *
 * A stub needs one thing a real API must never have, which is an undo for the
 * whole world: iterating on a screen means wrecking its data repeatedly, and
 * without this the only way back is the browser's storage inspector. It is
 * reachable from `/design/brand` and nowhere else — a design harness is the one
 * place a dev-only control belongs, and it is a branch that never reaches
 * `develop`. This function goes when the endpoint lands.
 */
export function resetBrand(): Promise<BrandData> {
  try {
    localStorage.removeItem(storageKey())
  } catch {
    // Nothing was stored to remove. `read()` already answers with the seed.
  }
  return settle(read())
}
