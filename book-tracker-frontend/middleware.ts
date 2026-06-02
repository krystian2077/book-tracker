/**
 * Proxy /api/* to Railway so auth cookies are first-party on the Vercel domain.
 * Works with trailing slashes (Django) unlike the serverless catch-all route.
 */
const BACKEND =
  process.env.RAILWAY_API_URL ??
  'https://book-tracker-production-d6a1.up.railway.app'

export const config = {
  matcher: '/api/:path*',
}

export default async function middleware(request: Request): Promise<Response> {
  const incoming = new URL(request.url)
  const target = new URL(`${incoming.pathname}${incoming.search}`, BACKEND)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const method = request.method
  const body =
    method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
      ? undefined
      : request.body

  return fetch(target, {
    method,
    headers,
    body,
    redirect: 'manual',
  })
}
