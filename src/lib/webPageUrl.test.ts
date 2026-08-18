import { describe, expect, it } from 'vitest'
import { checkPageUrl, pageUrlLabel } from './webPageUrl'

describe('checkPageUrl', () => {
  it('passes a full https url through', () => {
    expect(checkPageUrl('https://example.com/article')).toEqual({
      ok: true,
      url: 'https://example.com/article',
    })
  })

  it('keeps the query string, which the backend treats as part of the page', () => {
    const result = checkPageUrl('https://example.com/posts?id=7')
    expect(result).toEqual({ ok: true, url: 'https://example.com/posts?id=7' })
  })

  it('completes a bare host rather than rejecting it', () => {
    expect(checkPageUrl('example.com/article')).toEqual({
      ok: true,
      url: 'https://example.com/article',
    })
  })

  it('trims what was pasted', () => {
    expect(checkPageUrl('  https://example.com  ')).toEqual({
      ok: true,
      url: 'https://example.com/',
    })
  })

  it('asks for something when the field is empty', () => {
    expect(checkPageUrl('   ')).toEqual({ ok: false, error: 'Paste a link first.' })
  })

  it('refuses a scheme the scraper cannot fetch', () => {
    expect(checkPageUrl('ftp://example.com/file.txt')).toEqual({
      ok: false,
      error: 'Only http and https links can be read.',
    })
    expect(checkPageUrl('file:///etc/hosts')).toEqual({
      ok: false,
      error: 'Only http and https links can be read.',
    })
  })

  it('refuses a host that cannot be a public site', () => {
    expect(checkPageUrl('localhost:3000/page').ok).toBe(false)
    expect(checkPageUrl('not a url').ok).toBe(false)
  })
})

describe('pageUrlLabel', () => {
  it('drops the scheme, the www and the query', () => {
    expect(pageUrlLabel('https://www.example.com/blog/post?utm=x')).toBe(
      'example.com/blog/post',
    )
  })

  it('is just the host for a root url', () => {
    expect(pageUrlLabel('https://example.com/')).toBe('example.com')
  })

  it('shows an unparseable value rather than nothing', () => {
    expect(pageUrlLabel('¯\\_(ツ)_/¯')).toBe('¯\\_(ツ)_/¯')
  })
})
