import { NextRequest, NextResponse } from "next/server"
import { sleep } from "./helpers/utils"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    request.method !== "GET" ||
    pathname.includes("undefined")
  ) {
    return NextResponse.next()
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  const res = NextResponse.next()
  console.log("setting nonce", nonce, pathname)
  res.cookies.set({ name: "nonce", value: nonce, path: "/" })

  return res
}

export const config = {
  // matcher solution for public, api, assets and _next exclusion
  matcher: "/((?!api|static|.*\\..*|_next).*)",
}
