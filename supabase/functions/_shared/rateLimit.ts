// In-memory rate limiter — persists within a single Deno worker instance.
// Provides a meaningful first layer of defence for abuse/scripted attacks.

const store = new Map<string, number[]>()

/**
 * Returns true if the request should be blocked.
 * @param key      Unique key (e.g. IP + route)
 * @param max      Max allowed hits in the window
 * @param windowMs Window size in milliseconds
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const hits = (store.get(key) ?? []).filter(t => now - t < windowMs)
  hits.push(now)
  store.set(key, hits)
  return hits.length > max
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': '900',
      },
    }
  )
}
