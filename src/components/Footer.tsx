import { Link } from "react-router-dom"
import { Download } from "lucide-react"
import { GithubIcon } from "@/components/icons"

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <Download className="h-5 w-5" />
              <span>myvideoto</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Free, fast, and secure video downloader. Download from YouTube, Facebook, TikTok, and Instagram.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground transition-colors">Download Video</Link></li>
              <li><Link to="/help" className="hover:text-foreground transition-colors">User Guide</Link></li>
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Supported Platforms</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>YouTube</li>
              <li>Facebook</li>
              <li>TikTok</li>
              <li>Instagram</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} myvideoto. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <GithubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
