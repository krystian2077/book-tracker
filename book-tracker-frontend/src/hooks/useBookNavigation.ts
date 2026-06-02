import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { navigateWithTransition } from '@/lib/bookTransition'

/** Navigate to book details with a smooth view transition when supported. */
export function useBookNavigation() {
  const navigate = useNavigate()

  return useCallback(
    (userBookId: number) => {
      navigateWithTransition(() => {
        navigate(`/books/${userBookId}`)
      })
    },
    [navigate],
  )
}
