import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createFact,
  deleteFact,
  getBrand,
  setGuardrailsStance,
  updateFact,
} from './brand'
import type { BrandFact } from '@/components/brand/facts'

/**
 * The facts ledger and the stance on the wire (CON-316).
 *
 * What is pinned is what fails quietly: a `null` date read as a string renders
 * "null" in the table, a PUT missing a date clears it on the server, and an
 * unset date sent as `''` is only accepted by the server's courtesy.
 */

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  }
}

const WIRE_FACT = {
  id: 'k3Xz9QpL',
  statement: 'Support answered 94% of tickets within one working day in 2026.',
  subject: 'us',
  kind: 'measured',
  source: 'Helpdesk export, Q4',
  addedAt: '2026-09-01',
  checkedAt: null,
  expiresAt: null,
  createdBy: 'Vo5fQRrMVdI',
  createdByName: 'Serhii Herasymov',
  updatedAt: '2026-09-20T10:12:00Z',
}

const FACT: BrandFact = {
  id: 'k3Xz9QpL',
  statement: 'Support answered 94% of tickets within one working day in 2026.',
  subject: 'us',
  kind: 'measured',
  source: 'Helpdesk export, Q4',
  addedAt: '2026-09-01',
  checkedAt: '',
  expiresAt: '',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getBrand', () => {
  it('reads the ledger with unset dates as empty strings', async () => {
    stubFetch(
      jsonResponse(200, {
        voices: [],
        audiences: [],
        guardrails: null,
        look: null,
        templates: [],
        facts: [WIRE_FACT],
        guardrailsStance: {
          none: true,
          decidedAt: '2026-09-25T14:00:00Z',
          decidedBy: 'Vo5fQRrMVdI',
          decidedByName: 'Serhii Herasymov',
        },
      }),
    )

    const brand = await getBrand()

    expect(brand.facts).toEqual([FACT])
    expect(brand.guardrailsStance.none).toBe(true)
  })
})

describe('createFact', () => {
  it('posts the editable fields, with no id and unset dates as null', async () => {
    const fetchMock = stubFetch(jsonResponse(201, WIRE_FACT))

    const saved = await createFact({ ...FACT, id: '' })

    expect(sent(fetchMock)).toEqual({
      url: '/api/brand/facts',
      method: 'POST',
      body: {
        statement: FACT.statement,
        subject: 'us',
        kind: 'measured',
        source: 'Helpdesk export, Q4',
        addedAt: '2026-09-01',
        checkedAt: null,
        expiresAt: null,
      },
    })
    expect(saved.id).toBe('k3Xz9QpL')
  })
})

describe('updateFact', () => {
  // A full replace: a date left out is a date cleared, so every key goes.
  it('puts every editable field by id', async () => {
    const fetchMock = stubFetch(jsonResponse(200, WIRE_FACT))

    await updateFact({ ...FACT, expiresAt: '2027-01-31' })

    const { url, method, body } = sent(fetchMock)
    expect(url).toBe('/api/brand/facts/k3Xz9QpL')
    expect(method).toBe('PUT')
    expect(Object.keys(body).sort()).toEqual(
      [
        'addedAt',
        'checkedAt',
        'expiresAt',
        'kind',
        'source',
        'statement',
        'subject',
      ].sort(),
    )
    expect(body.expiresAt).toBe('2027-01-31')
    expect(body.checkedAt).toBeNull()
  })

  it('surfaces a duplicate statement as a 409', async () => {
    stubFetch(
      jsonResponse(409, { error: 'a fact with this statement already exists' }),
    )

    await expect(updateFact(FACT)).rejects.toMatchObject({ status: 409 })
  })
})

describe('deleteFact', () => {
  it('deletes by id with no body', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await deleteFact('k3Xz9QpL')

    expect(sent(fetchMock)).toEqual({
      url: '/api/brand/facts/k3Xz9QpL',
      method: 'DELETE',
      body: undefined,
    })
  })
})

describe('setGuardrailsStance', () => {
  it('puts the decision on its own endpoint', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        none: false,
        decidedAt: null,
        decidedBy: null,
        decidedByName: null,
      }),
    )

    await setGuardrailsStance(false)

    expect(sent(fetchMock)).toEqual({
      url: '/api/brand/guardrails/stance',
      method: 'PUT',
      body: { none: false },
    })
  })
})
