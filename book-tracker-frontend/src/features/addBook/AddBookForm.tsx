import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button, Field, Input, Select } from '@/components/ui'
import { getUserErrorMessage, normalizeApiError } from '@/lib/api/client'
import { addBookSchema, type AddBookInput, type AddBookValues } from '@/lib/schemas/book'
import { READING_STATUS_LABELS, type ReadingStatus } from '@/lib/api/types'
import { createUserBook, libraryKeys } from '@/features/library/api'
import { dashboardKeys } from '@/features/dashboard/api'

const STATUS_OPTIONS = Object.entries(READING_STATUS_LABELS) as Array<
  [ReadingStatus, string]
>

const DEFAULT_VALUES: AddBookInput = {
  title: '',
  author: '',
  isbn: '',
  pages: '',
  rating: '',
  status: 'want_to_read',
  current_page: 0,
  cover_url: '',
  description: '',
  published_year: '',
}

function mergeInitialValues(initialValues?: Partial<AddBookInput>): AddBookInput {
  return {
    ...DEFAULT_VALUES,
    ...initialValues,
    status: initialValues?.status ?? 'want_to_read',
    current_page: initialValues?.current_page ?? 0,
  }
}

export function AddBookForm({
  onSuccess,
  initialValues,
}: {
  onSuccess?: () => void
  initialValues?: Partial<AddBookInput>
}) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddBookInput, unknown, AddBookValues>({
    resolver: zodResolver(addBookSchema),
    defaultValues: mergeInitialValues(initialValues),
  })

  useEffect(() => {
    reset(mergeInitialValues(initialValues))
  }, [initialValues, reset])

  const mutation = useMutation({
    mutationFn: createUserBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      reset(mergeInitialValues())
      setFormError(null)
      onSuccess?.()
    },
    onError: (error) => {
      const normalized = normalizeApiError(error)
      let mappedField = false
      for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
        const message = Array.isArray(messages) ? messages[0] : messages
        if (field in addBookSchema.shape) {
          setError(field as keyof AddBookInput, { type: 'server', message })
          mappedField = true
        }
      }
      if (!mappedField) {
        setFormError(getUserErrorMessage(error))
      }
    },
  })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Title" error={errors.title?.message}>
        <Input {...register('title')} placeholder="The Hobbit" data-testid="add-book-title" />
      </Field>
      <Field label="Author" error={errors.author?.message}>
        <Input {...register('author')} placeholder="J.R.R. Tolkien" data-testid="add-book-author" />
      </Field>
      <Field label="ISBN" error={errors.isbn?.message}>
        <Input {...register('isbn')} placeholder="978-0-547-92822-7" data-testid="add-book-isbn" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Pages" error={errors.pages?.message}>
          <Input
            type="number"
            min={1}
            {...register('pages')}
            placeholder="e.g. 310"
            data-testid="add-book-pages"
          />
        </Field>
        <Field label="Rating (0–5)" error={errors.rating?.message}>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            {...register('rating')}
            placeholder="e.g. 4.5"
            data-testid="add-book-rating"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Status" error={errors.status?.message}>
          <Select {...register('status')} data-testid="add-book-status">
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Current page" error={errors.current_page?.message}>
          <Input type="number" min={0} {...register('current_page')} />
        </Field>
      </div>

      <input type="hidden" {...register('cover_url')} />
      <input type="hidden" {...register('description')} />
      <input type="hidden" {...register('published_year')} />

      {formError && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        loading={isSubmitting || mutation.isPending}
        className="w-full"
        data-testid="add-book-submit"
      >
        Add to library
      </Button>
    </form>
  )
}
