"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ChatInterface({ darkMode }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)
  const [currentResponse, setCurrentResponse] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !audioFile) return

    try {
      setIsLoading(true)

      if (audioFile) {
        await handleAudioUpload()
      } else {
        // Add user message to chat
        const userMessage = {
          id: Date.now(),
          content: input,
          role: "user",
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMessage])
        setInput("")

        // Process with AI
        const response = await processTextMessage(input)
        handleAIResponse(response, input)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setAudioFile(null)
    }
  }

  // Update the processTextMessage function to better handle the backend response
  const processTextMessage = async (text) => {
    try {
      // First try to use the chat API which might handle FAQs
      const formData = new FormData()
      formData.append("message", text)

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process message with chat API")
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Falling back to Gemini API:", error)

      // Fallback to Gemini API
      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: text,
          system: "You are a helpful customer service assistant. Be concise and friendly in your responses.",
        }),
      })

      if (!geminiResponse.ok) {
        throw new Error("Failed to process message with Gemini API")
      }

      const data = await geminiResponse.json()

      // Format the response to match the expected structure
      return {
        is_faq: false,
        response: data.text,
        schedule: null,
        sentiment: { label: "Neutral", score: 0.5 },
      }
    }
  }

  // Modify the handleAIResponse function to only show scheduling when explicitly requested
  const handleAIResponse = (response, originalQuery) => {
    // Add typing effect for AI responses
    const aiMessage = {
      id: Date.now() + 2,
      content: "",
      role: "assistant",
      typing: true,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, aiMessage])

    // Simulate typing effect
    const fullResponse = response.response
    let currentIndex = 0

    const typingInterval = setInterval(() => {
      if (currentIndex < fullResponse.length) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessage.id ? { ...msg, content: fullResponse.substring(0, currentIndex + 1) } : msg,
          ),
        )
        currentIndex++
      } else {
        clearInterval(typingInterval)
        // Mark message as complete (no longer typing)
        setMessages((prev) => prev.map((msg) => (msg.id === aiMessage.id ? { ...msg, typing: false } : msg)))

        // Only show scheduling if the user explicitly requested it
        const schedulingKeywords = [
          "schedule",
          "callback",
          "call me",
          "contact me",
          "talk to agent",
          "speak to someone",
        ]
        const needsScheduling = schedulingKeywords.some((keyword) => originalQuery.toLowerCase().includes(keyword))

        if (needsScheduling && response.schedule) {
          setCurrentResponse({
            originalQuery,
            response: response.response,
            schedule: response.schedule,
            sentiment: response.sentiment,
          })

          // Show confirmation dialog for email
          setShowEmailConfirm(true)
        }
      }
    }, 15)
  }

  // Update the handleAudioUpload function to better display transcription
  const handleAudioUpload = async () => {
    if (!audioFile) return

    const formData = new FormData()
    formData.append("file", audioFile)

    // Add user message to chat showing audio was uploaded
    const userMessage = {
      id: Date.now(),
      content: `🎤 Audio message uploaded`,
      role: "user",
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process audio")
      }

      const data = await response.json()

      // Update the user message with the transcription instead of adding a new message
      setMessages((prev) =>
        prev.map((msg) => (msg.id === userMessage.id ? { ...msg, content: data.transcription } : msg)),
      )

      // Process the transcribed text as a regular message
      handleAIResponse(data, data.transcription)
    } catch (error) {
      console.error("Error processing audio:", error)
      toast({
        title: "Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive",
      })

      // Remove the audio message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setAudioFile(null)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type.startsWith("audio/")) {
        setAudioFile(file)
        toast({
          title: "Audio Selected",
          description: `File "${file.name}" ready to upload.`,
        })
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an audio file.",
          variant: "destructive",
        })
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const clearAudioFile = () => {
    setAudioFile(null)
    fileInputRef.current.value = ""
  }

  const confirmSendEmail = async () => {
    // In a real app, this would send the confirmation to the backend
    // For now, we'll just add the AI response to the chat
    const aiMessage = {
      id: Date.now(),
      content: currentResponse.response,
      role: "assistant",
      timestamp: new Date().toISOString(),
    }

    // Add schedule info if available
    if (currentResponse.schedule) {
      const scheduleMessage = {
        id: Date.now() + 1,
        content: `📅 Callback scheduled for ${currentResponse.schedule.date} at ${currentResponse.schedule.time} (Priority: ${currentResponse.schedule.priority})`,
        role: "system",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMessage, scheduleMessage])
    } else {
      setMessages((prev) => [...prev, aiMessage])
    }

    setShowEmailConfirm(false)
    setCurrentResponse(null)

    toast({
      title: "Email Sent",
      description: "Your response has been sent and the callback has been scheduled.",
    })
  }

  const cancelSendEmail = () => {
    setShowEmailConfirm(false)
    setCurrentResponse(null)

    const cancelMessage = {
      id: Date.now(),
      content: "Email and callback scheduling canceled.",
      role: "system",
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  return (
    <div className="flex flex-col h-[80vh]">
      <Card className={`flex-1 flex flex-col ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle>Chat Assistant</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto pb-2">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                <p>No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? darkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-500 text-white"
                        : message.role === "system"
                          ? darkMode
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-200 text-gray-700"
                          : darkMode
                            ? "bg-gray-700 text-white"
                            : "bg-white border border-gray-200"
                    }`}
                  >
                    {message.content}
                    {message.typing && <span className="inline-block ml-1 animate-pulse">▋</span>}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <form onSubmit={handleSendMessage} className="w-full space-y-2">
            {audioFile && (
              <div className={`flex items-center p-2 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <span className={`flex-1 truncate text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {audioFile.name}
                </span>
                <Button type="button" variant="ghost" size="icon" onClick={clearAudioFile} className="h-6 w-6">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || !!audioFile}
                className={darkMode ? "bg-gray-700 border-gray-600 text-white" : ""}
              />

              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={triggerFileInput}
                disabled={isLoading || !!audioFile}
              >
                <Upload className="h-4 w-4" />
              </Button>

              <Button type="submit" disabled={isLoading || (!input.trim() && !audioFile)}>
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardFooter>
      </Card>

      {/* Email Confirmation Dialog */}
      {showEmailConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className={`w-full max-w-md ${darkMode ? "bg-gray-800 text-white border-gray-700" : ""}`}>
            <CardHeader>
              <CardTitle>Confirm Action</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Do you want to send an email and schedule a callback?</p>

              {currentResponse?.schedule && (
                <div className={`p-3 rounded-md mb-4 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <p className="font-medium">Callback Details:</p>
                  <p>Date: {currentResponse.schedule.date}</p>
                  <p>Time: {currentResponse.schedule.time}</p>
                  <p>Priority: {currentResponse.schedule.priority}</p>
                </div>
              )}

              <div className={`p-3 rounded-md ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <p className="font-medium">Sentiment Analysis:</p>
                <p>Rating: {currentResponse?.sentiment?.label || "N/A"}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelSendEmail}>
                Cancel
              </Button>
              <Button onClick={confirmSendEmail}>Confirm</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}

