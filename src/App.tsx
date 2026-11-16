import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import Home from "@/pages/Home"
import About from "@/pages/About"
import Help from "@/pages/Help"
import Terms from "@/pages/Terms"
import Privacy from "@/pages/Privacy"

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/help" element={<Help />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}
