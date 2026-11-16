import { useState } from "react"
import { ChevronDown, ChevronUp, Copy, Download, Scissors, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

const faqs = [
  {
    question: "How do I download a video?",
    answer: "Copy the URL of the video you want to download from YouTube, Facebook, TikTok, or Instagram. Paste it into the input field on our homepage. Select your preferred quality using the slider, then click 'Download MP4'. The video will be saved to your device.",
  },
  {
    question: "What video formats are supported?",
    answer: "Currently, we support MP4 format for all downloads. MP4 is the most widely compatible video format and works on virtually all devices and media players.",
  },
  {
    question: "Can I trim videos before downloading?",
    answer: "Yes! Click the 'Trim Video' option below the quality slider. Enter the start time and end time in the format MM:SS or HH:MM:SS. The trimmed portion will be downloaded as a separate file. Note: Trimming requires your browser to support WebAssembly (all modern browsers do).",
  },
  {
    question: "Is there a file size limit?",
    answer: "For direct downloads, there's no strict file size limit. However, for video trimming, files over 500MB may cause issues due to browser memory limitations. We recommend trimming smaller clips for the best experience.",
  },
  {
    question: "Is my data safe?",
    answer: "Absolutely. We don't collect, store, or track any of your data. Video trimming happens entirely in your browser using WebAssembly - your video never leaves your device. Downloads are processed through secure, encrypted connections.",
  },
  {
    question: "Which platforms are supported?",
    answer: "Currently supported platforms include YouTube, Facebook, TikTok, and Instagram. We're working on adding support for more platforms including Twitter/X, Reddit, Vimeo, and Dailymotion.",
  },
  {
    question: "Why is the download not starting?",
    answer: "Several things could cause this: 1) Make sure the URL is valid and the video is publicly accessible. 2) Check your internet connection. 3) Try a different browser. 4) Disable ad blockers that might interfere. 5) The video might be private or region-locked.",
  },
  {
    question: "Can I use this on mobile?",
    answer: "Yes! myvideoto works on all modern browsers on both desktop and mobile devices. You can also install it as a Progressive Web App (PWA) for a native app-like experience.",
  },
  {
    question: "How do I install the PWA?",
    answer: "On Chrome/Edge: Click the install icon in the address bar. On Safari (iOS): Tap the Share button, then 'Add to Home Screen'. On Firefox: Click the three-dot menu, then 'Install'. The app will appear on your home screen.",
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 text-left font-medium hover:bg-muted/50 transition-colors"
      >
        {question}
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  )
}

const steps = [
  {
    step: 1,
    title: "Copy the Video URL",
    description: "Go to YouTube, Facebook, TikTok, or Instagram and find the video you want to download. Copy the URL from the address bar or use the share button to copy the link.",
    icon: Copy,
  },
  {
    step: 2,
    title: "Paste the URL",
    description: "Return to myvideoto and paste the URL into the input field on the homepage. You can also click the 'Paste' button to paste from your clipboard.",
    icon: Download,
  },
  {
    step: 3,
    title: "Choose Quality & Options",
    description: "Use the quality slider to select from Original down to 240p. Optionally, click 'Trim Video' to set start and end times for a specific clip.",
    icon: Scissors,
  },
  {
    step: 4,
    title: "Download",
    description: "Click the 'Download MP4' button. Your video will be processed and downloaded to your device. Check your downloads folder for the file.",
    icon: CheckCircle,
  },
]

export default function Help() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Help & User Guide</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know about using myvideoto
        </p>
      </div>

      {/* Step-by-step Guide */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">How to Download Videos</h2>
        <div className="space-y-4">
          {steps.map(({ step, title, description, icon: Icon }) => (
            <Card key={step}>
              <CardContent className="flex gap-4 p-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                    {step}
                  </div>
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Supported Platforms</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["YouTube", "Facebook", "TikTok", "Instagram"].map((platform) => (
                <div key={platform} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {platform}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Troubleshooting</h2>
        <Card>
          <CardContent className="p-6 space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Download not starting</p>
                <p>Check that the URL is valid and the video is publicly accessible. Try disabling ad blockers or using a different browser.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Video trimming not working</p>
                <p>Ensure your browser supports WebAssembly (Chrome, Firefox, Edge, Safari 15+). Large files over 500MB may not work for trimming.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Slow download speed</p>
                <p>Download speed depends on your internet connection and the source platform's servers. Try selecting a lower quality for faster downloads.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
