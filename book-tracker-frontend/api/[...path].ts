import type { VercelRequest, VercelResponse } from '@vercel/node'

const BACKEND =
  process.env.RAILWAY_API_URL ??
  'https://book-tracker-production-d6a1.up.railway.app'

/** Forward raw bodies so JSON and multipart CSV uploads both work. */
export const config = {
  api: {
    bodyParser: false,
  },
}

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawPath = req.query.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath ?? '')
  const queryIndex = req.url?.indexOf('?') ?? -1
  const search = queryIndex >= 0 ? req.url!.slice(queryIndex) : ''
  const target = `${BACKEND}/api/${path}${search}`

  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || key.toLowerCase() === 'host') continue
    headers[key] = Array.isArray(value) ? value.join(', ') : String(value)
  }

  let body: Buffer | undefined
  if (req.method && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    body = await readRawBody(req)
  }

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: body?.length ? body : undefined,
  })

  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return
    res.setHeader(key, value)
  })

  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : []
  const fallbackCookie = upstream.headers.get('set-cookie')
  if (setCookies.length > 0) {
    res.setHeader('Set-Cookie', setCookies)
  } else if (fallbackCookie) {
    res.setHeader('Set-Cookie', fallbackCookie)
  }

  const text = await upstream.text()
  res.send(text)
}
