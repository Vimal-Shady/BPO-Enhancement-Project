"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon } from "lucide-react"
import LoginForm from "@/components/login-form"
import ChatInterface from "@/components/chat-interface"

export default function Home() {
  const [darkMode, setDarkMode] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loggedInStatus = localStorage.getItem("isLoggedIn")
    if (loggedInStatus === "true") {
      setIsLoggedIn(true)
    }

    const darkModePreference = localStorage.getItem("darkMode")
    if (darkModePreference === "true") {
      setDarkMode(true)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (!darkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    }
  }

  const handleLogin = (email, password) => {
    localStorage.setItem("isLoggedIn", "true")
    localStorage.setItem("userEmail", email)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userEmail")
  }

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-100"}`}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-800"}`}>AI Chat Assistant</h1>
          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <main>
          {isLoggedIn ? <ChatInterface darkMode={darkMode} /> : <LoginForm onLogin={handleLogin} darkMode={darkMode} />}
        </main>
      </div>
    </div>
  )
}

