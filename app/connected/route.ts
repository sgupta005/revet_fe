// OAuth callback. GitHub redirects here after authorize/install. We validate the
// CSRF `state`, forward the `code` to the backend for exchange (the client secret
// is backend-only), set the first-party session cookie, and continue to /repos.
// See `context/github-integration.md` §"Why the callback lands on the frontend".

import { NextResponse, type NextRequest } from "next/server"

import { createSession } from "@/lib/api"
import { parseCallbackParams } from "@/lib/github"
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/session"

export async function GET(request: NextRequest) {
  const params = parseCallbackParams(request.nextUrl.searchParams)
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value

  const fail = () => {
    const res = NextResponse.redirect(new URL("/?error=oauth", request.url))
    res.cookies.delete(OAUTH_STATE_COOKIE)
    return res
  }

  if (!params || !expectedState || params.state !== expectedState) {
    return fail()
  }

  let session
  try {
    session = await createSession(params.code)
  } catch {
    return fail()
  }

  const res = NextResponse.redirect(new URL("/repos", request.url))
  res.cookies.delete(OAUTH_STATE_COOKIE)
  res.cookies.set(SESSION_COOKIE, session.session_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
  return res
}
