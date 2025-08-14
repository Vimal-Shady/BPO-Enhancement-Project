import { NextResponse } from "next/server"

// FastAPI backend URL
const API_URL = process.env.API_URL || "http://localhost:8000"

export async function POST(req) {
  try {
    const { prompt, system } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 })
    }

    // Forward the request to the FastAPI backend's Gemini endpoint
    const formData = new FormData()
    formData.append("message", prompt)
    formData.append("skip_schedule", "true") // Tell backend not to schedule automatically

    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Return just the text response for the Gemini API route
    return NextResponse.json({ text: data.response })
  } catch (error) {
    console.error("Error generating text:", error)
    return NextResponse.json({
      text: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
    })
  }
}

