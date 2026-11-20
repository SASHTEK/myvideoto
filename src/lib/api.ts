const COBALT_API_URL = import.meta.env.VITE_COBALT_API_URL

export interface VideoInfo {
  title: string
  thumbnail: string
  duration: number
  platform: string
  url: string
}

export interface DownloadOptions {
  url: string
  quality: string
  trimStart?: number
  trimEnd?: number
}

export interface CobaltResponse {
  status: string
  url?: string
  filename?: string
  data?: {
    url: string
    filename?: string
    mimeType?: string
    fileSize?: number
  }
  error?: {
    code: string
    message?: string
    detail?: string // bounded upstream (yt-dlp) message — diagnostics/fallback only
  }
}

// Friendly, user-facing messages for known error codes (worker + yt-api + cobalt).
const FRIENDLY_ERRORS: Record<string, string> = {
  // yt-api (YouTube backend)
  "yt.invalid_url": "That doesn't look like a valid YouTube video link.",
  "yt.playlist": "Playlists aren't supported — paste a link to a single video.",
  "yt.unsupported": "That link isn't a video — paste a link to a single video.",
  "yt.private": "This video is private and can't be downloaded.",
  "yt.restricted":
    "This video is age-restricted or requires sign-in, so it can't be downloaded.",
  "yt.signin_required":
    "YouTube is asking for a sign-in check on this video (common for some videos). Please try again in a moment, or try a different video.",
  "yt.unavailable": "This video is unavailable or has been removed.",
  "yt.too_long": "Videos longer than 2 hours aren't supported.",
  "yt.too_large": "This video is too large to download. Try a lower quality.",
  "yt.rate_limited": "Too many requests — please wait a minute and try again.",
  "yt.busy": "Our download servers are busy right now. Please try again in a few seconds.",
  "yt.expired": "Your download link expired — please click Download again.",
  "yt.invalid_token": "Download link invalid — please click Download again.",
  "yt.empty": "YouTube returned an empty file. Please try again.",
  "yt.extraction_failed": "Couldn't process this video right now. Please try again later.",
  "yt.upstream_unreachable": "Can't reach YouTube right now. Please try again later.",
  "yt.internal": "Something went wrong on our side. Please try again later.",
  // cobalt backend
  "error.api.fetch.fail":
    "The download service can't reach this platform right now. Please try again in a few minutes.",
  "error.api.content.post.unavailable": "This post is unavailable or blocked.",
  "error.api.content.video.unavailable": "This video is unavailable.",
  "error.api.auth.jwt.missing": "The download service isn't configured correctly.",
  // worker
  "rate_limited": "Too many requests — please wait a minute and try again.",
  "origin_not_allowed": "This request isn't allowed from your browser.",
  "upstream_timeout":
    "The download server took too long to respond (it may be waking up). Please try again in a minute.",
  "upstream_waking":
    "The download server is waking up (it sleeps when idle). Please try again in a moment.",
  "upstream_unreachable": "Can't reach the download server right now. Please try again later.",
  "upstream_invalid_response":
    "The download server returned an unexpected response. Please try again later.",
  "upstream_error": "The download service reported an error. Please try again later.",
  "youtube_backend_not_configured": "YouTube downloads aren't configured yet.",
  "cobalt_backend_not_configured": "The download service isn't configured yet.",
  "url_required": "Please paste a video URL.",
  "method_not_allowed": "Invalid request.",
  "invalid_json": "Invalid request.",
}

const TIMEOUT_MESSAGE =
  "The server is taking too long (it may be waking up). Please try again in a minute."
const UNREACHABLE_MESSAGE =
  "Can't reach the download server. Please check your connection and try again."
const GENERIC_MESSAGE = "Failed to download video. Please try again."

function friendly(code: unknown, message?: unknown): string {
  if (typeof code === "string" && FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code]
  if (typeof message === "string" && message.trim().length > 0 && message.length < 200) {
    return message
  }
  return GENERIC_MESSAGE
}

export function detectPlatform(url: string): string | null {
  const patterns: [RegExp, string][] = [
    [/youtube\.com|youtu\.be/i, "youtube"],
    [/facebook\.com|fb\.watch/i, "facebook"],
    [/tiktok\.com/i, "tiktok"],
    [/instagram\.com/i, "instagram"],
  ]
  for (const [pattern, platform] of patterns) {
    if (pattern.test(url)) return platform
  }
  return null
}

export function isValidVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return false
    return detectPlatform(url) !== null
  } catch {
    return false
  }
}

export function isApiConfigured(): boolean {
  return Boolean(COBALT_API_URL && COBALT_API_URL.length > 0)
}

export async function downloadVideo(options: DownloadOptions): Promise<string> {
  if (!isApiConfigured()) {
    throw new Error(
      "Cobalt API is not configured. Please set VITE_COBALT_API_URL in your .env file. " +
        "See COBALT_DEPLOYMENT.md for deployment instructions."
    )
  }

  const body: Record<string, string> = {
    url: options.url,
    downloadMode: "auto",
    filenameStyle: "pretty",
  }

  if (options.quality && options.quality !== "original") {
    body.videoQuality = options.quality
  } else {
    body.videoQuality = "max"
  }

  let response: Response
  try {
    response = await fetch(`${COBALT_API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      // generous: covers Render cold start + YouTube extraction on the backend
      signal: AbortSignal.timeout(150_000),
    })
  } catch (err) {
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new Error(TIMEOUT_MESSAGE)
    }
    console.error("download request failed:", err)
    throw new Error(UNREACHABLE_MESSAGE)
  }

  let data: CobaltResponse | null = null
  try {
    data = (await response.json()) as CobaltResponse
  } catch {
    data = null
  }

  if (!response.ok) {
    const err = data?.error
    if (err && typeof err === "object") {
      if (err.detail) console.warn("[yt-api]", err.code, err.detail)
      throw new Error(friendly(err.code, err.message ?? err.detail))
    }
    // legacy worker shape: { error: "some string" }
    const legacy = (data as unknown as { error?: unknown })?.error
    if (typeof legacy === "string") {
      throw new Error(legacy)
    }
    throw new Error(friendly(null))
  }

  if (!data) {
    throw new Error(friendly("upstream_invalid_response"))
  }

  if (data.status === "error") {
    const e = data.error
    if (e?.detail) console.warn("[yt-api]", e.code, e.detail)
    throw new Error(friendly(e?.code, e?.message ?? e?.detail))
  }

  const downloadUrl = data.data?.url || data.url
  if (!downloadUrl) {
    throw new Error(friendly("upstream_invalid_response"))
  }

  return downloadUrl
}
