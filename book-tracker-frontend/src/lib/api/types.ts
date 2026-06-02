export type ReadingStatus = 'want_to_read' | 'reading' | 'finished' | 'paused'

export type NoteType = 'note' | 'reflection' | 'summary' | 'review'

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  isbn_normalized: string
  pages: number
  cover_url: string
  description: string
  published_year: number | null
  created_at: string
  updated_at: string
}

export interface UserBook {
  id: number
  book: Book
  rating: number | null
  status: ReadingStatus
  current_page: number
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export interface ReadingNote {
  id: number
  user_book: number
  title: string
  content: string
  note_type: NoteType
  page_number: number | null
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
}

/** DRF CursorPagination response envelope. */
export interface CursorPage<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export interface DashboardStats {
  total_books: number
  currently_reading: number
  finished_books: number
  average_rating: number | null
  total_pages_read: number
}

export interface DashboardResponse extends DashboardStats {
  reading: UserBook[]
}

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Want to read',
  reading: 'Reading',
  finished: 'Finished',
  paused: 'Paused',
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  note: 'Note',
  reflection: 'Reflection',
  summary: 'Summary',
  review: 'Review',
}
