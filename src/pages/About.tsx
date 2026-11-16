import { Download, Shield, Zap, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About myvideoto</h1>
        <p className="text-lg text-muted-foreground">
          A free, fast, and secure way to download videos from your favorite platforms.
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>What is myvideoto?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              myvideoto is a free web application that allows you to download videos from popular social media platforms including YouTube, Facebook, TikTok, and Instagram.
            </p>
            <p>
              Our mission is to provide a simple, fast, and secure way to save videos for offline viewing. We believe everyone should have access to their favorite content without needing expensive subscriptions or dealing with intrusive ads.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Our optimized download pipeline ensures you get your videos in seconds, not minutes.",
            },
            {
              icon: Shield,
              title: "Secure & Private",
              description: "No data collection, no tracking, no logs. Your downloads stay private.",
            },
            {
              icon: Globe,
              title: "Multiple Platforms",
              description: "Support for YouTube, Facebook, TikTok, Instagram, and more platforms coming soon.",
            },
            {
              icon: Download,
              title: "Free Forever",
              description: "No hidden fees, no premium plans. Everything is completely free.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>Copy the URL of the video you want to download</li>
              <li>Paste the URL into the input field on our homepage</li>
              <li>Select your preferred video quality using the slider</li>
              <li>Optionally, set start and end times to trim the video</li>
              <li>Click "Download MP4" and your video will be saved</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              myvideoto is built with modern web technologies to ensure the best possible experience:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>React + Vite for a fast, responsive UI</li>
              <li>Tailwind CSS for beautiful, consistent design</li>
              <li>Cloudflare Workers for secure API proxying</li>
              <li>FFmpeg.wasm for client-side video trimming</li>
              <li>Progressive Web App (PWA) for installability</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
