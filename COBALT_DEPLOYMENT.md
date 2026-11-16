# myvideoto — Backend Deployment Guide

## Architecture

```
Browser (Cloudflare Pages: https://myvideoto.pages.dev)
  └─ POST → Cloudflare Worker (myvideoto-api.sashtekapps.workers.dev)
              URL allowlist · origin check · per-IP rate limit
              ├─ YouTube hosts → yt-api (Render, yt-dlp)          ← YouTube downloads
              └─ Facebook / TikTok / Instagram → Cobalt (Render)  ← other platforms
```

All services run on **free tiers** (Cloudflare Workers/Pages free, Render free web service).

---

## 1. yt-api — YouTube backend (yt-dlp)

Code lives in `yt-api/`. Render blueprint files are at the repo root:
`render.yaml` (service definition) and `apt.txt` (installs `ffmpeg` + `nodejs`).

### Deploy on Render (free)

1. Push this repo to GitHub (the repo root must contain `render.yaml` and `apt.txt`).
2. On [Render](https://dashboard.render.com): **New → Web Service → connect the repo**.
   Render reads `render.yaml` automatically (Blueprint).
3. After the first deploy, copy the service URL, e.g. `https://myvideoto-yt-api.onrender.com`.

> If you prefer the dashboard over the blueprint, create a **Native environment (Python)**
> service with:
> - Build command: `pip install -r yt-api/requirements.txt`
> - Start command: `cd yt-api && uvicorn app:app --host 0.0.0.0 --port $PORT`

### Environment variables (set automatically by render.yaml)

| Key | Default | Purpose |
|-----|---------|---------|
| `STREAM_SECRET` | generated | HMAC secret for signed `/stream` links — set explicitly to keep links valid across restarts |
| `RATE_LIMIT_PER_MIN` | `10` | per-IP POST limit |
| `MAX_CONCURRENT_DOWNLOADS` | `2` | protects the 512 MB free instance |
| `MAX_DURATION_SECONDS` | `7200` | reject videos longer than 2 h |
| `MAX_FILESIZE_BYTES` | `524288000` | 500 MB cap |
| `TOKEN_TTL_SECONDS` | `900` | stream-link expiry |

### Local development

```powershell
cd yt-api
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app:app --port 8000
# test: POST {"url":"https://www.youtube.com/watch?v=...","videoQuality":"max"} to http://127.0.0.1:8000/
# security regression tests: .venv\Scripts\python test_security.py
```

---

## 2. Cobalt — Facebook / TikTok / Instagram backend

- **URL:** https://cobalt-api-ogz5.onrender.com
- **Dashboard:** https://dashboard.render.com
- **Docker Image:** `ghcr.io/imputnet/cobalt:latest`
- Runs cobalt v11.x; configured in the Render dashboard:

| Key | Value |
|-----|-------|
| `PORT` | `9000` |
| `API_URL` | `https://cobalt-api-ogz5.onrender.com` |
| `API_NAME` | `myvideoto-cobalt` |
| `CORS_WILDCARD` | `1` |

**Known limitation:** cobalt's *YouTube* extraction is broken upstream for self-hosters
([cobalt#1475](https://github.com/imputnet/cobalt/issues/1475), open since Nov 2025) — this
is why YouTube is routed to yt-dlp instead. TikTok extraction currently also fails upstream
(`error.api.content.post.unavailable`).

---

## 3. Cloudflare Worker (router / gateway)

Configured in `wrangler.toml`:

| Var | Purpose |
|-----|---------|
| `YT_BACKEND_URL` | yt-api URL (YouTube) — **update after Render deploy** |
| `COBALT_API_URL` | Cobalt URL (other platforms) |
| `ALLOWED_ORIGINS` | comma-separated browser origins allowed to call the worker (Pages production + previews + localhost dev) |
| `RATE_LIMIT_PER_MIN` | per-IP POST limit (default 15) |

Deploy:

```powershell
# requires CLOUDFLARE_API_TOKEN with Workers Scripts:Edit
npx wrangler deploy
```

Local testing:

```powershell
npx wrangler dev --var YT_BACKEND_URL:http://127.0.0.1:8000
```

**Rollback:** point `YT_BACKEND_URL` back at any working backend (or remove the var to
disable YouTube downloads) and re-run `npx wrangler deploy`.

---

## 4. Frontend (Cloudflare Pages)

```powershell
npm run build
# requires CLOUDFLARE_API_TOKEN with Pages:Edit
npx wrangler pages deploy dist --project-name=<your-pages-project>
```

---

## Troubleshooting

**First request is slow (30–60 s):** Render free services sleep after ~15 min idle.
This is normal; subsequent requests are fast.

**`yt.rate_limited` / worker `rate_limited`:** you exceeded the per-minute limit — wait a
minute. Limits are best-effort and per-server-instance.

**`yt.busy`:** both download slots are occupied — retry in a few seconds.

**`upstream_timeout`:** the backend took >120 s (usually a cold start + slow extraction) —
retry.

**YouTube error codes:** `yt.unavailable` / `yt.private` / `yt.restricted` are content
restrictions (not fixable); `yt.extraction_failed` / `yt.upstream_unreachable` are
transient — retry later.

**Testing the worker directly:**

```powershell
curl -X POST https://myvideoto-api.sashtekapps.workers.dev `
  -H "Content-Type: application/json" `
  -H "Origin: https://myvideoto.pages.dev" `
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","videoQuality":"720"}'
```

A successful response looks like:
```json
{"status":"tunnel","url":"https://myvideoto-yt-api.onrender.com/stream?token=...","filename":"....mp4"}
```
