import { useState, useCallback, useRef } from "react"
import {
  Download,
  Scissors,
  CheckCircle,
  AlertCircle,
  Loader2,
  Video,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { isValidVideoUrl, detectPlatform, downloadVideo, isApiConfigured } from "@/lib/api"
import { YoutubeIcon, FacebookIcon, TiktokIcon, InstagramIcon } from "@/components/icons"
import type { SVGProps } from "react"

const PLATFORM_ICONS: Record<string, React.ComponentType<SVGProps<SVGSVGElement>>> = {
  youtube: YoutubeIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  instagram: InstagramIcon,
}

const QUALITY_LABELS: Record<number, string> = {
  100: "Original",
  75: "High (720p)",
  50: "Medium (480p)",
  25: "Low (360p)",
  0: "Minimum (240p)",
}

function getQualityValue(quality: number): string {
  if (quality >= 90) return "original"
  if (quality >= 60) return "720"
  if (quality >= 35) return "480"
  if (quality >= 10) return "360"
  return "240"
}

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoInfo, setVideoInfo] = useState<{ title: string; platform: string } | null>(null)
  const [quality, setQuality] = useState([100])
  const [trimEnabled, setTrimEnabled] = useState(false)
  const [trimStart, setTrimStart] = useState("0:00")
  const [trimEnd, setTrimEnd] = useState("0:00")
  const [downloadComplete, setDownloadComplete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const platform = detectPlatform(url)
  const PlatformIcon = platform ? PLATFORM_ICONS[platform] || Video : Video
  const isValid = url.length > 0 && isValidVideoUrl(url)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError(null)
    setVideoInfo(null)
    setDownloadComplete(false)

    try {
      const info = await downloadVideo({ url, quality: getQualityValue(quality[0]) })

      const link = document.createElement("a")
      link.href = info
      link.download = ""
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setVideoInfo({ title: "Download started", platform: platform || "unknown" })
      setDownloadComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download video. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [url, quality, isValid, platform])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (isValidVideoUrl(text)) {
        setUrl(text)
      }
    } catch {
      inputRef.current?.focus()
    }
  }, [])

  const apiReady = isApiConfigured()

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* API Configuration Warning */}
      {!apiReady && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
          <p className="font-medium text-warning flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Cobalt API not configured
          </p>
          <p className="mt-1 text-muted-foreground">
            Video downloads require a Cobalt API instance. See <code className="bg-muted px-1 rounded">COBALT_DEPLOYMENT.md</code> for free deployment instructions on Koyeb.
          </p>
        </div>
      )}

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Download Videos
          <span className="text-primary block">Instantly</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Paste a video URL from YouTube, Facebook, TikTok, or Instagram.
          Choose quality, trim, and download as MP4. Fast, secure, and free.
        </p>
      </div>

      {/* Download Form */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Video
          </CardTitle>
          <CardDescription>
            Paste a video URL and click download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <PlatformIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  type="url"
                  placeholder="Paste video URL here..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setError(null)
                    setDownloadComplete(false)
                    setVideoInfo(null)
                  }}
                  className="pl-10"
                  aria-label="Video URL"
                />
              </div>
              <Button type="button" variant="outline" onClick={handlePaste}>
                Paste
              </Button>
            </div>

            {url && !isValid && url.length > 5 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Please enter a valid YouTube, Facebook, TikTok, or Instagram URL
              </p>
            )}

            {platform && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PlatformIcon className="h-4 w-4" />
                <span className="capitalize">{platform}</span> video detected
              </div>
            )}

            {/* Quality Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Video Quality</label>
                <span className="text-sm text-muted-foreground">
                  {QUALITY_LABELS[quality[0]] || "Original"}
                </span>
              </div>
              <Slider
                value={quality}
                onValueChange={setQuality}
                min={0}
                max={100}
                step={25}
                aria-label="Video quality"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>240p</span>
                <span>360p</span>
                <span>480p</span>
                <span>720p</span>
                <span>Original</span>
              </div>
            </div>

            {/* Trim Controls */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setTrimEnabled(!trimEnabled)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  trimEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Scissors className="h-4 w-4" />
                {trimEnabled ? "Trim Enabled" : "Trim Video"}
              </button>

              {trimEnabled && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                    <Input
                      type="text"
                      placeholder="0:00"
                      value={trimStart}
                      onChange={(e) => setTrimStart(e.target.value)}
                      aria-label="Trim start time"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">End Time</label>
                    <Input
                      type="text"
                      placeholder="0:00"
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(e.target.value)}
                      aria-label="Trim end time"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : downloadComplete ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Download Started
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Download MP4
                </>
              )}
            </Button>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {videoInfo && downloadComplete && (
            <div className="p-3 rounded-lg bg-success/10 text-success text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Download started! Check your downloads folder.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Platforms */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-8">Supported Platforms</h2>
        <div className="flex flex-wrap justify-center gap-6 md:gap-12">
          {[
            { icon: YoutubeIcon, name: "YouTube", color: "text-red-500" },
            { icon: FacebookIcon, name: "Facebook", color: "text-blue-500" },
            { icon: TiktokIcon, name: "TikTok", color: "text-foreground" },
            { icon: InstagramIcon, name: "Instagram", color: "text-pink-500" },
          ].map(({ icon: Icon, name, color }) => (
            <div key={name} className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-muted">
                <Icon className={cn("h-8 w-8", color)} />
              </div>
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {[
          {
            icon: Download,
            title: "Fast Downloads",
            description: "Download videos in seconds with our optimized pipeline.",
          },
          {
            icon: Scissors,
            title: "Trim Videos",
            description: "Cut and trim videos directly in your browser. No server needed.",
          },
          {
            icon: Sparkles,
            title: "Choose Quality",
            description: "Select from original quality down to 240p. Full control over file size.",
          },
        ].map(({ icon: Icon, title, description }) => (
          <Card key={title} className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AdSense Placeholder */}
      <div className="mt-16 max-w-4xl mx-auto">
        <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center text-muted-foreground text-sm">
          Advertisement Space — Google AdSense
        </div>
      </div>
    </div>
  )
}
