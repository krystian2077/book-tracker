import { api } from '@/lib/api/client'

export interface IsbnLookupResult {
  title: string
  author: string | null
  isbn: string
  pages: number | null
  cover_url: string | null
  description: string | null
  published_year: number | null
  source: string
}

export async function lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
  const { data } = await api.get<IsbnLookupResult>('/books/lookup-isbn/', {
    params: { isbn },
  })
  return data
}
