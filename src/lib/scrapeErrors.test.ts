import { describe, expect, it } from 'vitest'
import { readPageErrorMessage } from './scrapeErrors'
import { ApiError } from '@/services/api/errors'

describe('readPageErrorMessage', () => {
  it('translates the not-configured conflict, which is written for an API client', () => {
    const err = new ApiError(409, 'url scraping is not configured')
    expect(readPageErrorMessage(err)).toBe(
      "Reading web pages isn't switched on for this workspace yet.",
    )
  })

  it("keeps the backend's own words for a refusal about the link", () => {
    const err = new ApiError(400, 'url host is not allowed')
    expect(readPageErrorMessage(err)).toBe('url host is not allowed')
  })

  it('survives something that is not an error at all', () => {
    expect(readPageErrorMessage('nope')).toBe('Unable to read that page')
  })
})
