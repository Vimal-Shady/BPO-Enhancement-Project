"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function LoginForm({ onLogin, darkMode }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please enter both email and password")
      return
    }
    setError("")
    onLogin(email, password)
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card
        className={`w-full max-w-md ${darkMode ? "bg-gray-800/80 text-white border-gray-700" : "bg-white/80"} backdrop-blur-md`}
      >
        <CardHeader>
          <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
          <CardDescription className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className={darkMode ? "text-gray-300" : ""}>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className={darkMode ? "text-gray-300" : ""}>
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSubmit}>
            Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

