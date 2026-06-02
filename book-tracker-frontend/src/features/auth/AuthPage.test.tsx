import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPage } from './AuthPage'
import * as useAuthModule from './useAuth'
import { ThemeProvider } from '@/lib/theme'

function renderAuthPage() {
  return render(
    <ThemeProvider>
      <AuthPage />
    </ThemeProvider>,
  )
}

describe('AuthPage', () => {
  it('validates empty login submission', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderAuthPage()

    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(await screen.findByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('calls login with credentials', async () => {
    const loginMock = vi.fn().mockResolvedValue({ id: 1, username: 'alice', email: '' })
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: loginMock,
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderAuthPage()

    await user.type(screen.getByLabelText('Username'), 'alice')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: /^log in$/i }))

    expect(loginMock).toHaveBeenCalledWith({ username: 'alice', password: 'secret123' })
  })
})
