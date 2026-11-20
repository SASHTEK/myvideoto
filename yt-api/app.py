"""
myvideoto yt-api
Cobalt-compatible YouTube download backend powered by yt-dlp.

Endpoints:
  GET  /          health check
  POST /          {url, videoQuality} -> {status:"tunnel", url, filename}  (cobalt-compatible)
  GET  /stream    ?token=...        streams the resulting MP4

Security model (see plan review):
  * SSRF guard: https only, exact-match YouTube host allowlist, userinfo/port
    tricks rejected, video-path required — yt-dlp never sees anything else.
  * yt-dlp is used as a Python library (no shell), playlists rejected,
    duration + filesize capped, concurrency capped.
  * stream URLs are HMAC-signed and expire (TOKEN_TTL_SECONDS).
  * per-IP rate limit on POST.
  * filenames are sanitized before going into Content-Disposition (CRLF guard).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import tempfile
import threading
import time
import traceback
from typing import Any
from urllib.parse import parse_qs, urlparse

import yt_dlp
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict
from starlette.background import BackgroundTask

# --------------------------------------------------------------------------
# configuration (all overridable via environment variables)
# --------------------------------------------------------------------------

ALLOWED_HOSTS = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
    }
)
VIDEO_PATH_PREFIXES = ("/watch", "/shorts/", "/live/", "/embed/", "/v/")
ALLOWED_QUALITIES = frozenset({"max", "1080", "720", "480", "360", "240"})
YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,20}$")

STREAM_SECRET = os.environ.get("STREAM_SECRET") or secrets.token_hex(32)
TOKEN_TTL_SECONDS = int(os.environ.get("TOKEN_TTL_SECONDS", "900"))
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "10"))
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT_DOWNLOADS", "2"))
MAX_DURATION_SECONDS = int(os.environ.get("MAX_DURATION_SECONDS", "7200"))
MAX_FILESIZE_BYTES = int(os.environ.get("MAX_FILESIZE_BYTES", str(500 * 1024 * 1024)))
HAS_FFMPEG = shutil.which("ffmpeg") is not None

app = FastAPI(title="myvideoto yt-api", docs_url=None, redoc_url=None, openapi_url=None)


# --------------------------------------------------------------------------
# errors
# --------------------------------------------------------------------------


class ApiError(Exception):
    def __init__(self, code: str, status: int = 400, detail: str | None = None):
        super().__init__(code)
        self.code = code
        self.status = status
        self.detail = detail


def _sanitize_detail(raw: Any, limit: int = 300) -> str | None:
    """Bounded, control-char-stripped upstream message for diagnostics."""
    if not isinstance(raw, str) or not raw:
        return None
    text = re.sub(r"\s+", " ", raw).strip()
    text = "".join(ch for ch in text if ch.isprintable())
    return text[:limit] or None


def error_response(code: str, status: int, detail: str | None = None) -> JSONResponse:
    err: dict[str, Any] = {"code": code}
    clean = _sanitize_detail(detail)
    if clean:
        err["detail"] = clean
    return JSONResponse({"status": "error", "error": err}, status_code=status)


@app.exception_handler(ApiError)
async def _api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.code, exc.status, exc.detail)


@app.exception_handler(Exception)
async def _unhandled(_request: Request, exc: Exception) -> JSONResponse:
    # never leak internals/stack traces to callers
    traceback.print_exc()
    return error_response("yt.internal", 500)


# --------------------------------------------------------------------------
# input validation (SSRF guard)
# --------------------------------------------------------------------------


def validate_video_url(url: Any) -> str:
    if not isinstance(url, str) or not url or len(url) > 4096:
        raise ApiError("yt.invalid_url")
    try:
        parsed = urlparse(url)
        port = parsed.port
    except ValueError:
        raise ApiError("yt.invalid_url")

    if parsed.scheme != "https":
        raise ApiError("yt.invalid_url")
    if parsed.username or parsed.password:  # https://youtube.com@evil — host would be evil
        raise ApiError("yt.invalid_url")
    if port not in (None, 443):
        raise ApiError("yt.invalid_url")

    host = (parsed.hostname or "").lower().rstrip(".")
    if host not in ALLOWED_HOSTS:
        raise ApiError("yt.invalid_url")

    path = parsed.path or "/"
    if path.rstrip("/") == "" and host != "youtu.be":
        raise ApiError("yt.invalid_url")
    if path.rstrip("/") == "/playlist":
        raise ApiError("yt.playlist")
    if any(path.startswith(p) for p in ("/channel", "/results", "/@")):
        raise ApiError("yt.unsupported")

    if host == "youtu.be":
        seg = path.strip("/").split("/")[0]
        if not YOUTUBE_ID_RE.match(seg):
            raise ApiError("yt.invalid_url")
        return url

    if not path.startswith(VIDEO_PATH_PREFIXES):
        raise ApiError("yt.invalid_url")
    if path.startswith("/watch"):
        vid = parse_qs(parsed.query).get("v", [""])[0]
        if not YOUTUBE_ID_RE.match(vid):
            raise ApiError("yt.invalid_url")
    else:
        seg = path.strip("/").split("/")[1] if path.strip("/").count("/") >= 1 else ""
        # /shorts/<id>, /live/<id>, /embed/<id>, /v/<id>
        parts = [p for p in path.split("/") if p]
        seg = parts[1] if len(parts) >= 2 else ""
        if not YOUTUBE_ID_RE.match(seg):
            raise ApiError("yt.invalid_url")
    return url


def safe_filename(name: Any, max_len: int = 120) -> str:
    """Sanitize a video title for use in Content-Disposition (CRLF/path guard)."""
    name = re.sub(r"[\x00-\x1f\x7f]", "", str(name or ""))  # strips CR/LF/NUL
    name = re.sub(r'[<>:"/\\|?*]', "", name)  # windows-illegal + path seps
    name = re.sub(r"\s+", " ", name).strip(" .")
    if name.lower().endswith(".mp4"):
        name = name[:-4].strip(" .")
    if not name:
        name = "video"
    return name[:max_len].strip(" .") or "video"


# --------------------------------------------------------------------------
# rate limiting (per IP, fixed 60s window, in-memory / best-effort)
# --------------------------------------------------------------------------

_rate_lock = threading.Lock()
_rate_buckets: dict[str, tuple[int, int]] = {}


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(key: str) -> None:
    global _rate_buckets
    now_window = int(time.time() // 60)
    with _rate_lock:
        window, count = _rate_buckets.get(key, (now_window, 0))
        if window != now_window:
            window, count = now_window, 0
        count += 1
        if len(_rate_buckets) > 1000:  # purge expired entries occasionally
            _rate_buckets = {k: v for k, v in _rate_buckets.items() if v[0] == now_window}
        _rate_buckets[key] = (window, count)
    if count > RATE_LIMIT_PER_MIN:
        raise ApiError("yt.rate_limited", 429)


# --------------------------------------------------------------------------
# yt-dlp integration
# --------------------------------------------------------------------------


def _base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 2,
        "cachedir": "",  # no cache writes
    }


# YouTube bot-checks datacenter IPs with "Sign in to confirm you're not a bot"
# on the default web/visionos clients. `android` is the one InnerTube client
# that both avoids the bot-check and still serves downloadable formats for
# bot-checked videos (verified: only android/android_vr/visionos yield formats
# for such videos; the rest are PO-token-skipped).
SIGNIN_FALLBACK_CLIENTS = ["android", "visionos", "android_vr"]


def extract_with_fallback(url: str, opts: dict[str, Any], download: bool, allow_retry: bool = True) -> dict[str, Any]:
    """extract_info with one retry using alternate player clients on bot-check."""
    attempts = [opts]
    if allow_retry:
        fb = dict(opts)
        fb["extractor_args"] = {"youtube": {"player_client": SIGNIN_FALLBACK_CLIENTS}}
        attempts.append(fb)

    last_signin: ApiError | None = None
    for i, o in enumerate(attempts):
        try:
            with yt_dlp.YoutubeDL(o) as ydl:
                return ydl.extract_info(url, download=download)
        except yt_dlp.utils.DownloadError as e:
            err = map_download_error(e)
            if err.code == "yt.signin_required" and i < len(attempts) - 1:
                last_signin = err
                continue
            raise err
    raise last_signin or ApiError("yt.extraction_failed", 502)


def map_download_error(exc: Exception) -> ApiError:
    msg = str(exc).lower()
    raw = str(exc)
    if "larger than max-filesize" in msg or "filesize" in msg and "larger" in msg:
        return ApiError("yt.too_large", 413, raw)
    if "private video" in msg:
        return ApiError("yt.private", 403, raw)
    if "sign in to confirm" in msg or "confirm you" in msg:
        # YouTube bot-check (common for datacenter IPs) — not a real age restriction
        return ApiError("yt.signin_required", 403, raw)
    if any(s in msg for s in ("age-restricted", "age restricted", "log in to confirm your age")):
        return ApiError("yt.restricted", 403, raw)
    if "unsupported url" in msg or "not a valid url" in msg:
        return ApiError("yt.invalid_url", 400, raw)
    if any(s in msg for s in ("timed out", "timeout", "network", "connection", "temporary failure")):
        return ApiError("yt.upstream_unreachable", 502, raw)
    if any(s in msg for s in ("video unavailable", "is unavailable", "not available", "removed")):
        return ApiError("yt.unavailable", 404, raw)
    return ApiError("yt.extraction_failed", 502, raw)


def format_for(quality: str) -> str:
    caps: dict[str, int | None] = {
        "max": None,
        "1080": 1080,
        "720": 720,
        "480": 480,
        "360": 360,
        "240": 240,
    }
    cap = caps.get(quality)
    h = f"height<={cap}" if cap else None
    if HAS_FFMPEG:
        video = f"bv*[{h}][ext=mp4]+ba[ext=m4a]" if h else "bv*[ext=mp4]+ba[ext=m4a]"
        video_any = f"bv*[{h}]+ba" if h else "bv*+ba"
        prog = f"b[{h}][ext=mp4]" if h else "b[ext=mp4]"
        prog_any = f"b[{h}]" if h else "b"
        return f"{video}/{video_any}/{prog}/{prog_any}"
    # no ffmpeg: single-file formats only (progressive), never a merge pair
    prog = f"b[{h}][ext=mp4]" if h else "b[ext=mp4]"
    prog_any = f"b[{h}]" if h else "b"
    return f"{prog}/{prog_any}"


# extraction cache (avoids double extraction between POST and GET on retries)
_cache_lock = threading.Lock()
_extract_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL = 300.0


def extract_light(url: str, client: str | None = None) -> dict[str, Any]:
    now = time.time()
    if client is None:  # diagnostic requests bypass/serve outside the cache
        with _cache_lock:
            hit = _extract_cache.get(url)
            if hit and hit[0] > now:
                return hit[1]

    opts = _base_opts()
    if client:
        if client not in PLAYER_CLIENTS:
            raise ApiError("yt.invalid_client", 400)
        opts["extractor_args"] = {"youtube": {"player_client": [client]}}
        info = extract_with_fallback(url, opts, download=False, allow_retry=False)
    else:
        info = extract_with_fallback(url, opts, download=False)
    if not info:
        raise ApiError("yt.extraction_failed", 502)
    if info.get("_type") in ("playlist", "multi_video"):
        raise ApiError("yt.playlist")

    light = {
        "title": info.get("title"),
        "duration": info.get("duration"),
        "filesize": info.get("filesize") or info.get("filesize_approx"),
    }
    with _cache_lock:
        if len(_extract_cache) > 200:
            _extract_cache.clear()
        _extract_cache[url] = (now + _CACHE_TTL, light)
    return light


# --------------------------------------------------------------------------
# signed stream tokens
# --------------------------------------------------------------------------


def make_token(url: str, quality: str) -> str:
    payload = json.dumps(
        {"u": url, "q": quality, "e": int(time.time()) + TOKEN_TTL_SECONDS},
        separators=(",", ":"),
    ).encode()
    raw = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig = hmac.new(STREAM_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_token(token: str) -> tuple[str, str]:
    try:
        raw, sig = token.split(".", 1)
    except (ValueError, AttributeError):
        raise ApiError("yt.invalid_token")
    expected = hmac.new(STREAM_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise ApiError("yt.invalid_token")
    try:
        payload = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
        url = payload["u"]
        quality = payload["q"]
        expires = int(payload["e"])
    except Exception:
        raise ApiError("yt.invalid_token")
    if expires < time.time():
        raise ApiError("yt.expired")
    # defense in depth: re-validate whatever the token claims
    validate_video_url(url)
    if quality not in ALLOWED_QUALITIES:
        quality = "max"
    return url, quality


# --------------------------------------------------------------------------
# endpoints
# --------------------------------------------------------------------------


class DownloadRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    url: str | None = None
    videoQuality: str | None = None
    downloadMode: str | None = None  # accepted for cobalt compatibility, ignored
    filenameStyle: str | None = None  # accepted for cobalt compatibility, ignored
    # diagnostics: force a single InnerTube player client (allowlisted) to
    # isolate which clients YouTube bot-checks from this host's IP
    client: str | None = None


# names accepted by the `client` diagnostic field
PLAYER_CLIENTS = frozenset(
    {
        "web", "web_safari", "web_embedded", "web_music", "web_creator",
        "android", "android_vr", "ios", "visionos", "mweb",
        "tv", "tv_downgraded", "tv_samsung", "tv_simply",
    }
)

BUILD_REV = "r5-android-fallback"


@app.get("/")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "myvideoto-yt-api",
        "ffmpeg": HAS_FFMPEG,
        "maxConcurrent": MAX_CONCURRENT,
        "rateLimitPerMin": RATE_LIMIT_PER_MIN,
        "build": BUILD_REV,
        "signinFallback": list(SIGNIN_FALLBACK_CLIENTS),
    }


@app.post("/")
def create_download(req: DownloadRequest, request: Request) -> dict[str, Any]:
    check_rate_limit(f"ip:{client_ip(request)}")
    if not req.url:
        raise ApiError("yt.invalid_url")
    url = validate_video_url(req.url)

    quality = (req.videoQuality or "max").lower()
    if quality == "original":
        quality = "max"
    if quality not in ALLOWED_QUALITIES:
        quality = "max"

    info = extract_light(url, client=req.client)
    duration = info.get("duration")
    if duration and float(duration) > MAX_DURATION_SECONDS:
        raise ApiError("yt.too_long", 413)
    filesize = info.get("filesize")
    if filesize and int(filesize) > MAX_FILESIZE_BYTES:
        raise ApiError("yt.too_large", 413)

    token = make_token(url, quality)
    base = str(request.base_url).rstrip("/")
    filename = safe_filename(info.get("title")) + ".mp4"
    return {"status": "tunnel", "url": f"{base}/stream?token={token}", "filename": filename}


_download_slots = threading.Semaphore(MAX_CONCURRENT)


@app.get("/stream")
def stream(token: str) -> FileResponse:
    url, quality = verify_token(token)

    if not _download_slots.acquire(blocking=False):
        raise ApiError("yt.busy", 429)

    transferred = False
    tmp_path: str | None = None
    try:
        fd, tmp_path = tempfile.mkstemp(prefix="ytdl-", suffix=".mp4")
        os.close(fd)
        os.unlink(tmp_path)  # yt-dlp creates the file itself

        opts = _base_opts()
        opts.update(
            {
                "format": format_for(quality),
                "outtmpl": tmp_path,
                "socket_timeout": 30,
                "retries": 3,
                "concurrent_fragment_downloads": 4,
                "max_filesize": MAX_FILESIZE_BYTES,
            }
        )
        if HAS_FFMPEG:
            opts["merge_output_format"] = "mp4"

        info = extract_with_fallback(url, opts, download=True)

        if info.get("_type") in ("playlist", "multi_video"):
            entries = info.get("entries") or []
            info = entries[0] if entries else {}
        if not tmp_path or not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
            raise ApiError("yt.empty", 502)

        filename = safe_filename(info.get("title")) + ".mp4"

        def finish() -> None:
            try:
                _download_slots.release()
            finally:
                try:
                    os.unlink(tmp_path)  # type: ignore[arg-type]
                except OSError:
                    pass

        transferred = True
        return FileResponse(
            tmp_path,
            media_type="video/mp4",
            filename=filename,
            background=BackgroundTask(finish),
        )
    except ApiError:
        raise
    except yt_dlp.utils.DownloadError as e:
        raise map_download_error(e)
    except OSError:
        raise ApiError("yt.extraction_failed", 502)
    finally:
        if not transferred:
            _download_slots.release()
            if tmp_path:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
