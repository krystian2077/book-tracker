import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { getUserErrorMessage, normalizeApiError } from './client'

describe('normalizeApiError', () => {
  it('extracts field errors and detail from a DRF response', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 400,
      data: { detail: 'Invalid input', isbn: ['Enter a valid ISBN.'] },
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    }
    const result = normalizeApiError(error)
    expect(result.status).toBe(400)
    expect(result.detail).toBe('Invalid input')
    expect(result.fieldErrors.isbn).toEqual(['Enter a valid ISBN.'])
  })

  it('strips technical axios status messages', () => {
    const error = new AxiosError('Request failed with status code 500')
    error.response = {
      status: 500,
      data: {},
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never,
    }
    const result = normalizeApiError(error)
    expect(result.detail).toBeNull()
    expect(getUserErrorMessage(error)).toBe('Server error. Please try again in a moment.')
  })

  it('handles non-axios errors gracefully', () => {
    const result = normalizeApiError(new Error('boom'))
    expect(result.status).toBeNull()
    expect(result.detail).toBe('boom')
    expect(result.fieldErrors).toEqual({})
  })
})

describe('getUserErrorMessage', () => {
  it('prefers field errors over detail', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 400,
      data: { detail: 'Bad request', isbn: ['Enter a valid ISBN.'] },
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
    }
    expect(getUserErrorMessage(error)).toBe('Enter a valid ISBN.')
  })
})
