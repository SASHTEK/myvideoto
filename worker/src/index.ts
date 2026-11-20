const ALLOWED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "facebook.com",
  "www.facebook.com",
  "web.facebook.com",
  "fb.watch",
  "m.facebook.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "instagr.am",
]

// Hosts routed to the yt-dlp backend instead of Cobalt.
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
])

const VALID_QUALITIES = new Set(["max", "1440", "1080", "720", "480", "360", "240"])

interface Env {
  COBALT_API_URL?: string
  YT_BACKEND_URL?: string
  ALLOWED_ORIGINS?: string
  RATE_LIMIT_PER_MIN?: string
}

// ---------------------------------------------------------------------------
// CORS — restricted to configured origins (Pages production + previews + dev).
// Requests without an Origin header (server-to-server, curl) are not subject
// to CORS but are still rate limited.
// ---------------------------------------------------------------------------

function originAllowed(origin: string, allowed: string[]): boolean {
  for (const entry of allowed) {
    if (origin === entry) return true
    try {
      const a = new URL(entry)
      const o = new URL(origin)
      // subdomain suffixes of an allowed https origin (e.g. preview.myvideoto.pages.dev)
      if (o.protocol !== "https:" || o.port !== a.port) continue
      if (o.hostname === a.hostname || o.hostname.endsWith("." + a.hostname)) return true
    } catch {
      // ignore malformed entries
    }
  }
  return false
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
  }
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }
  return headers
}

function jsonResponse(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  })
}

function errorResponse(status: number, code: string, origin: string | null): Response {
  return jsonResponse(status, { status: "error", error: { code } }, origin)
}

// ---------------------------------------------------------------------------
// Best-effort per-IP rate limiting (in-memory, per isolate).
// ---------------------------------------------------------------------------

const rateBuckets = new Map<string, { window: number; count: number }>()

function rateLimited(key: string, limitPerMin: number): boolean {
  const now = Math.floor(Date.now() / 60_000)
  let bucket = rateBuckets.get(key)
  if (!bucket || bucket.window !== now) {
    bucket = { window: now, count: 0 }
    rateBuckets.set(key, bucket)
  }
  bucket.count += 1
  if (rateBuckets.size > 5_000) {
    for (const [k, v] of rateBuckets) {
      if (v.window !== now) rateBuckets.delete(k)
    }
  }
  return bucket.count > limitPerMin
}

// ---------------------------------------------------------------------------
// URL validation (SSRF guard — only known public hosts, https only)
// ---------------------------------------------------------------------------

function isPrivateIP(hostname: string): boolean {
  const ip = hostname.replace(/^\[|\]$/g, "")
  if (
    /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.|169\.254\.|::1|fc00:|fe80:|::)/.test(ip)
  ) {
    return true
  }
  return false
}

function validateURL(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString)

    if (url.protocol !== "https:") {
      return { valid: false, error: "Only HTTPS URLs are allowed" }
    }
    if (url.username || url.password) {
      return { valid: false, error: "Invalid URL" }
    }
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return { valid: false, error: "Unsupported platform. Use YouTube, Facebook, TikTok, or Instagram." }
    }
    if (isPrivateIP(url.hostname)) {
      return { valid: false, error: "Invalid URL" }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin")
    const allowedOrigins = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    if (request.method === "OPTIONS") {
      if (origin && originAllowed(origin, allowedOrigins)) {
        return new Response(null, { status: 204, headers: corsHeaders(origin) })
      }
      return new Response(null, { status: 403 })
    }

    // Browser requests must come from an allowed origin.
    if (origin && !originAllowed(origin, allowedOrigins)) {
      return errorResponse(403, "origin_not_allowed", null)
    }

    if (request.method !== "POST") {
      return errorResponse(405, "method_not_allowed", origin)
    }

    const limitPerMin = Number(env.RATE_LIMIT_PER_MIN || 15)
    const ip = request.headers.get("CF-Connecting-IP") || "unknown"
    if (rateLimited(`ip:${ip}`, limitPerMin)) {
      return errorResponse(429, "rate_limited", origin)
    }

    let body: { url?: string; videoQuality?: string }
    try {
      body = (await request.json()) as { url?: string; videoQuality?: string }
    } catch {
      return errorResponse(400, "invalid_json", origin)
    }

    if (!body.url || typeof body.url !== "string") {
      return errorResponse(400, "url_required", origin)
    }

    const validation = validateURL(body.url)
    if (!validation.valid) {
      return jsonResponse(400, { status: "error", error: { code: "invalid_url", message: validation.error } }, origin)
    }

    const quality =
      typeof body.videoQuality === "string" && VALID_QUALITIES.has(body.videoQuality)
        ? body.videoQuality
        : "max"

    const hostname = new URL(body.url).hostname
    const isYouTube = YOUTUBE_HOSTS.has(hostname)
    const backend = isYouTube ? env.YT_BACKEND_URL : env.COBALT_API_URL

    if (!backend) {
      return errorResponse(503, isYouTube ? "youtube_backend_not_configured" : "cobalt_backend_not_configured", origin)
    }

    // Free-tier backends sleep when idle; the gateway answers 502/503/504 with a
    // non-JSON body while the instance wakes. Retry idempotent POSTs through that.
    const RETRY_DELAYS_MS = [5_000, 10_000, 20_000]
    const RETRYABLE_STATUS = new Set([502, 503, 504])
    const MAX_ATTEMPTS = 4

    let upStatus = 0
    let upData: unknown = null
    let resolved = false

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]))
      }

      let resp: Response
      try {
        resp = await fetch(backend, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            url: body.url,
            downloadMode: "auto",
            filenameStyle: "pretty",
            videoQuality: quality,
          }),
          signal: AbortSignal.timeout(60_000),
        })
      } catch (err) {
        if (attempt < MAX_ATTEMPTS - 1) continue // transient network/timeout — retry
        if (err instanceof Error && err.name === "TimeoutError") {
          return errorResponse(504, "upstream_timeout", origin)
        }
        console.error("upstream fetch failed:", err instanceof Error ? err.message : String(err))
        return errorResponse(502, "upstream_unreachable", origin)
      }

      upStatus = resp.status
      const text = await resp.text()
      try {
        upData = JSON.parse(text)
      } catch {
        upData = null
      }

      if (upData !== null && typeof upData === "object") {
        resolved = true // structured response (success or structured error)
        break
      }
      // non-JSON body — likely the gateway erroring while the instance wakes up
      if (RETRYABLE_STATUS.has(upStatus) && attempt < MAX_ATTEMPTS - 1) {
        continue
      }
      resolved = true
      break
    }

    if (!resolved) {
      return errorResponse(504, "upstream_waking", origin)
    }

    if (upData !== null && typeof upData === "object") {
      return jsonResponse(upStatus >= 200 && upStatus < 300 ? 200 : upStatus, upData, origin)
    }

    // non-JSON upstream body
    if (upStatus === 429) {
      return errorResponse(429, "rate_limited", origin)
    }
    if (RETRYABLE_STATUS.has(upStatus)) {
      // retries exhausted on gateway errors: the instance is still waking up
      return errorResponse(504, "upstream_waking", origin)
    }
    if (upStatus >= 200 && upStatus < 300) {
      return errorResponse(502, "upstream_invalid_response", origin)
    }
    return errorResponse(upStatus, "upstream_error", origin)
  },
}
