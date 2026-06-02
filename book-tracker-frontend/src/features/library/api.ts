import { api } from '@/lib/api/client'
import type { CursorPage, UserBook } from '@/lib/api/types'
import type { AddBookValues } from '@/lib/schemas/book'

export interface LibraryQuery {
  search?: string
  status?: string
  rating?: string
  sort?: string
  page_size?: number
}

export const libraryKeys = {
  all: ['library'] as const,
  list: (params: LibraryQuery) => ['library', 'list', params] as const,
  detail: (id: number) => ['library', 'detail', id] as const,
}

function buildParams(query: LibraryQuery): Record<string, string> {
  const params: Record<string, string> = {}
  if (query.search) params.search = query.search
  if (query.status && query.status !== 'all') params.status = query.status
  if (query.rating && query.rating !== 'all') params.rating = query.rating
  if (query.sort) params.sort = query.sort
  if (query.page_size) params.page_size = String(query.page_size)
  return params
}

export async function fetchLibrary(
  query: LibraryQuery,
  cursorUrl?: string | null,
): Promise<CursorPage<UserBook>> {
  // When paginating we follow the absolute `next`/`previous` URL DRF returns.
  if (cursorUrl) {
    const { data } = await api.get<CursorPage<UserBook>>(cursorUrl)
    return data
  }
  const { data } = await api.get<CursorPage<UserBook>>('/library/', {
    params: buildParams(query),
  })
  return data
}

export async function fetchUserBook(id: number): Promise<UserBook> {
  const { data } = await api.get<UserBook>(`/library/${id}/`)
  return data
}

export async function createUserBook(payload: AddBookValues): Promise<UserBook> {
  const { data } = await api.post<UserBook>('/library/', payload)
  return data
}

export interface UpdateUserBookPayload {
  status?: string
  current_page?: number
  rating?: number
}

export async function updateUserBook(
  id: number,
  payload: UpdateUserBookPayload,
): Promise<UserBook> {
  const { data } = await api.patch<UserBook>(`/library/${id}/`, payload)
  return data
}

export async function deleteUserBook(id: number): Promise<void> {
  await api.delete(`/library/${id}/`)
}

/** Download the user's library as a file (CSV or JSON). */
export async function exportLibrary(format: 'csv' | 'json'): Promise<void> {
  const response = await api.get(`/library/export/`, {
    params: { export_as: format },
    responseType: 'blob',
  })
  const blob = response.data as Blob
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `library.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
