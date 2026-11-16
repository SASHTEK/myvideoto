import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Terms & Conditions</h1>
        <p className="text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              By accessing and using myvideoto (the "Service"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service.
            </p>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              myvideoto provides a web-based tool that enables users to download publicly available videos from third-party platforms including YouTube, Facebook, TikTok, and Instagram. The Service also provides video trimming capabilities using client-side WebAssembly technology.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>You agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the Service only for lawful purposes</li>
              <li>Download only videos that you have the legal right to download</li>
              <li>Respect the intellectual property rights of content creators</li>
              <li>Comply with the terms of service of the source platforms</li>
              <li>Not use the Service for any commercial purposes without explicit permission</li>
              <li>Not attempt to abuse, overload, or disrupt the Service</li>
              <li>Not use automated tools or bots to access the Service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The Service itself, including its design, code, and content, is the intellectual property of myvideoto. Videos downloaded through the Service remain the property of their respective owners and content creators.
            </p>
            <p>
              You are solely responsible for ensuring that your use of downloaded content complies with applicable copyright laws and the terms of service of the source platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The Service will be uninterrupted, timely, secure, or error-free</li>
              <li>The results obtained from the Service will be accurate or reliable</li>
              <li>The quality of any content downloaded will meet your expectations</li>
              <li>The Service will work with all browsers or devices</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              In no event shall myvideoto, its operators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your use of or inability to use the Service</li>
              <li>Any content downloaded through the Service</li>
              <li>Unauthorized access to your data</li>
              <li>Any errors or omissions in the Service</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Third-Party Platforms</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The Service interacts with third-party platforms (YouTube, Facebook, TikTok, Instagram) through their publicly available interfaces. We are not affiliated with, endorsed by, or connected to these platforms. Each platform has its own terms of service that apply to your use of their services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Your privacy is important to us. Please review our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              {" "}to understand how we handle your data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Termination</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              We reserve the right to terminate or restrict your access to the Service at our sole discretion, without notice, for any conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              If you have any questions about these Terms, please contact us through our website or email us at support@myvideoto.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
