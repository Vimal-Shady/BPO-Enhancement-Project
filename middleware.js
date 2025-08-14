import { NextResponse } from "next/server"

export function middleware(request) {
  // This is where you would add authentication middleware
  // For demo purposes, we'll just pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: ["/bpo/:path*"],
}

