import { afterEach, describe, expect, it } from 'vitest'

import type { WorkspacePlan } from '@/types/entitlements'
import {
  complimentaryEnded,
  forgetComplimentary,
  noteComplimentary,
} from './complimentaryMemory'

function plan(billing: Partial<WorkspacePlan['billing']>): WorkspacePlan {
  return {
    tier: {} as WorkspacePlan['tier'],
    billing: {
      required: false,
      trialEligible: true,
      complimentary: false,
      ...billing,
    },
    entitlements: {},
  }
}

const COMPED = plan({ complimentary: true })
const GATED = plan({ required: true })

afterEach(() => localStorage.clear())

describe('complimentaryMemory', () => {
  it('owes the notice to a gated workspace this browser saw comped', () => {
    noteComplimentary('ws-1', COMPED)
    expect(complimentaryEnded('ws-1', GATED)).toBe(true)
  })

  it('owes nothing to a workspace that was simply never paid for', () => {
    expect(complimentaryEnded('ws-1', GATED)).toBe(false)
  })

  it('owes nothing while the workspace is still comped, or no longer gated', () => {
    noteComplimentary('ws-1', COMPED)
    expect(complimentaryEnded('ws-1', COMPED)).toBe(false)
    expect(complimentaryEnded('ws-1', plan({}))).toBe(false)
  })

  it('keeps workspaces apart', () => {
    noteComplimentary('ws-1', COMPED)
    expect(complimentaryEnded('ws-2', GATED)).toBe(false)
  })

  it('says it once', () => {
    noteComplimentary('ws-1', COMPED)
    forgetComplimentary('ws-1')
    expect(complimentaryEnded('ws-1', GATED)).toBe(false)
  })

  it('survives storage it cannot read', () => {
    localStorage.setItem('ogen.complimentarySeen', '{not json')
    expect(complimentaryEnded('ws-1', GATED)).toBe(false)
    noteComplimentary('ws-1', COMPED)
    expect(complimentaryEnded('ws-1', GATED)).toBe(true)
  })
})
