import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, ErrorAlert, Field, Input, Select, Spinner, Textarea } from '@/components/ui'
import { getUserErrorMessage } from '@/lib/api/client'
import { NOTE_TYPE_LABELS, type NoteType, type ReadingNote } from '@/lib/api/types'
import {
  createNote,
  deleteNote,
  fetchNotes,
  noteKeys,
  updateNote,
  type NoteInput,
} from './api'

const NOTE_TYPE_OPTIONS = Object.entries(NOTE_TYPE_LABELS) as Array<[NoteType, string]>

function emptyDraft(): NoteInput {
  return { title: '', content: '', note_type: 'note', page_number: null }
}

function NoteForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  initial: NoteInput
  submitLabel: string
  onSubmit: (value: NoteInput) => void
  onCancel?: () => void
  pending?: boolean
  error?: string | null
}) {
  const [draft, setDraft] = useState<NoteInput>(initial)

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type">
          <Select
            value={draft.note_type}
            onChange={(e) =>
              setDraft((d) => ({ ...d, note_type: e.target.value as NoteType }))
            }
          >
            {NOTE_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Page (optional)">
          <Input
            type="number"
            min={0}
            value={draft.page_number ?? ''}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                page_number: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>
      <Field label="Title (optional)">
        <Input
          value={draft.title ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </Field>
      <Field label="Content">
        <Textarea
          rows={3}
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          placeholder="Write a note, reflection, summary or review…"
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => onSubmit(draft)}
          disabled={!draft.content.trim()}
          loading={pending}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

function NoteItem({ note, userBookId }: { note: ReadingNote; userBookId: number }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: noteKeys.forBook(userBookId) })

  const updateMutation = useMutation({
    mutationFn: (value: NoteInput) => updateNote(note.id, value),
    onSuccess: () => {
      invalidate()
      setEditing(false)
      setItemError(null)
    },
    onError: (error) => {
      setItemError(getUserErrorMessage(error, 'Could not save this note.'))
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteNote(note.id),
    onSuccess: invalidate,
    onError: (error) => {
      setItemError(getUserErrorMessage(error, 'Could not delete this note.'))
    },
  })

  if (editing) {
    return (
      <NoteForm
        initial={{
          title: note.title,
          content: note.content,
          note_type: note.note_type,
          page_number: note.page_number,
        }}
        submitLabel="Save"
        onSubmit={(value) => updateMutation.mutate(value)}
        onCancel={() => {
          setEditing(false)
          setItemError(null)
        }}
        pending={updateMutation.isPending}
        error={itemError}
      />
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
          {NOTE_TYPE_LABELS[note.note_type]}
          {note.page_number != null ? ` · p.${note.page_number}` : ''}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            aria-label="Edit note"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {note.title && <p className="font-medium">{note.title}</p>}
      <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
        {note.content}
      </p>
      {itemError && (
        <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
          {itemError}
        </p>
      )}
    </div>
  )
}

export function NotesSection({ userBookId }: { userBookId: number }) {
  const queryClient = useQueryClient()
  const [createError, setCreateError] = useState<string | null>(null)
  const notesQuery = useQuery({
    queryKey: noteKeys.forBook(userBookId),
    queryFn: () => fetchNotes(userBookId),
  })

  const createMutation = useMutation({
    mutationFn: (value: NoteInput) => createNote(userBookId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.forBook(userBookId) })
      setCreateError(null)
    },
    onError: (error) => {
      setCreateError(getUserErrorMessage(error, 'Could not add this note.'))
    },
  })

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Notes & reflections</h2>

      <NoteForm
        key={createMutation.isSuccess ? createMutation.submittedAt : 'new'}
        initial={emptyDraft()}
        submitLabel="Add note"
        onSubmit={(value) => createMutation.mutate(value)}
        pending={createMutation.isPending}
        error={createError}
      />

      {notesQuery.isError && (
        <ErrorAlert
          message={getUserErrorMessage(
            notesQuery.error,
            'Could not load notes. Please try again.',
          )}
          onRetry={() => notesQuery.refetch()}
        />
      )}

      {notesQuery.isLoading ? (
        <Spinner />
      ) : notesQuery.data && notesQuery.data.length > 0 ? (
        <div className="space-y-3">
          {notesQuery.data.map((note) => (
            <NoteItem key={note.id} note={note} userBookId={userBookId} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">No notes yet.</p>
      )}
    </section>
  )
}
