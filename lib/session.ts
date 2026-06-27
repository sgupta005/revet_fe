import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// The opaque, backend-issued session token. The browser only ever holds this
// cookie; user/refresh tokens stay in the backend session store.
export const SESSION_COOKIE = "revet_session"

// Short-lived CSRF token set before redirecting to GitHub and verified on the
// `/connected` callback.
export const OAUTH_STATE_COOKIE = "revet_oauth_state"

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value
}

// Presence of the session cookie means "logged in" (the backend re-validates it
// on every request).
export async function isLoggedIn(): Promise<boolean> {
  return Boolean(await getSessionToken())
}

// Server-side guard for authenticated pages: returns the session token or
// redirects unauthenticated visitors to the sign-in landing.
export async function requireSession(): Promise<string> {
  const token = await getSessionToken()
  if (!token) redirect("/")
  return token
}
