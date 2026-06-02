import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddBookForm } from './AddBookForm'

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AddBookForm />
    </QueryClientProvider>,
  )
}

describe('AddBookForm', () => {
  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /add to library/i }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Author is required')).toBeInTheDocument()
    expect(screen.getByText('ISBN is required')).toBeInTheDocument()
  })

  it('prefills numeric fields from ISBN lookup values', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AddBookForm
          initialValues={{
            title: 'Starcie królów',
            author: 'George R. R. Martin',
            isbn: '9788375069693',
            pages: '928',
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByTestId('add-book-pages')).toHaveValue(928)
    expect(screen.getByTestId('add-book-title')).toHaveValue('Starcie królów')
  })

  it('rejects an invalid ISBN client-side', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('The Hobbit'), 'Some Book')
    await user.type(screen.getByPlaceholderText('J.R.R. Tolkien'), 'Some Author')
    await user.type(screen.getByPlaceholderText('978-0-547-92822-7'), '123')
    await user.type(screen.getByPlaceholderText('e.g. 310'), '100')
    await user.type(screen.getByPlaceholderText('e.g. 4.5'), '4')
    await user.click(screen.getByRole('button', { name: /add to library/i }))

    expect(
      await screen.findByText('Enter a valid ISBN-10 or ISBN-13'),
    ).toBeInTheDocument()
  })
})
