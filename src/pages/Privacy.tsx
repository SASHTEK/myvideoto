import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-6">
            <p className="font-semibold text-success flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy-First by Design
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              myvideoto is built with privacy as a core principle. We do not collect, store, sell, or share any personal data. Your downloads are completely private.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p className="font-medium text-foreground">We collect: Nothing.</p>
            <p>
              myvideoto does not collect any personal information, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Name, email address, or contact information</li>
              <li>IP addresses or location data</li>
              <li>Browser fingerprinting data</li>
              <li>Cookies or tracking identifiers</li>
              <li>Video URLs you download</li>
              <li>Download history or preferences</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. How Your Data Is Processed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Video Trimming:</strong> All video trimming operations happen entirely in your browser using WebAssembly. Your video files are never uploaded to any server. They stay on your device at all times.
            </p>
            <p>
              <strong className="text-foreground">Video Downloads:</strong> When you paste a URL, it is sent to our API proxy (Cloudflare Worker) which forwards it to the Cobalt API service. The URL is processed in memory and the download link is returned. No URLs are stored or logged.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Cookies & Local Storage</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              myvideoto uses local storage only to save your theme preference (dark/light/system). No cookies are set. No tracking cookies, analytics cookies, or advertising cookies are used.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong className="text-foreground">Cloudflare:</strong> For CDN hosting and API proxying. Cloudflare may collect standard server logs (IP addresses, user agents) as part of their infrastructure service.</li>
              <li><strong className="text-foreground">Cobalt API:</strong> For video download processing. Cobalt is privacy-first and does not log or store any data.</li>
            </ul>
            <p>
              We do not use Google Analytics, Facebook Pixel, or any other tracking or analytics services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              We implement appropriate security measures to protect the limited data we handle. All communications are encrypted using HTTPS. However, no method of transmission over the Internet is 100% secure.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated "Last updated" date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              If you have any questions about this Privacy Policy, please contact us through our website or email us at privacy@myvideoto.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
