import { api } from '@/lib/api/client'
import type { NoteType, ReadingNote } from '@/lib/api/types'

export const noteKeys = {
  forBook: (userBookId: number) => ['notes', userBookId] as const,
}

export interface NoteInput {
  title?: string
  content: string
  note_type: NoteType
  page_number?: number | null
}

export async function fetchNotes(userBookId: number): Promise<ReadingNote[]> {
  const { data } = await api.get<ReadingNote[]>(`/library/${userBookId}/notes/`)
  return data
}

export async function createNote(
  userBookId: number,
  payload: NoteInput,
): Promise<ReadingNote> {
  const { data } = await api.post<ReadingNote>(
    `/library/${userBookId}/notes/`,
    payload,
  )
  return data
}

export async function updateNote(
  id: number,
  payload: Partial<NoteInput>,
): Promise<ReadingNote> {
  const { data } = await api.patch<ReadingNote>(`/notes/${id}/`, payload)
  return data
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`/notes/${id}/`)
}
