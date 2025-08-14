import { NextResponse } from "next/server"

// FastAPI backend URL
const API_URL = process.env.API_URL || "http://localhost:8000"

export async function POST(req) {
  try {
    // Forward the request to the FastAPI backend
    const formData = await req.formData()

    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error forwarding request to FastAPI:", error)
    return NextResponse.json(
      { error: "Failed to process message. Backend service may be unavailable." },
      { status: 500 },
    )
  }
}

