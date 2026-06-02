import { useEffect, useRef } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
      }) => void
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>,
      ) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

let scriptPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (window.google) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders the official "Sign in with Google" button. Hidden when
 * VITE_GOOGLE_CLIENT_ID is not configured. On success it hands the Google ID
 * token to `onCredential`, which exchanges it for our cookie-JWT session.
 */
export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void
  onError?: (message: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return
    let cancelled = false

    loadGisScript()
      .then(() => {
        if (cancelled || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_blue',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
        })
      })
      .catch(() => onError?.('Could not load Google sign-in.'))

    return () => {
      cancelled = true
    }
  }, [onCredential, onError])

  if (!GOOGLE_CLIENT_ID) return null

  return <div ref={containerRef} className="flex justify-center" />
}
