"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { logout } from "@/lib/api"
import { buildAuthorizeUrl, buildInstallUrl, generateState } from "@/lib/github"
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/lib/session"

async function setStateCookie(state: string) {
  const cookieStore = await cookies()
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
}

// Begin sign-in: set a short-lived CSRF `state` cookie, then redirect to GitHub.
export async function signIn() {
  const state = generateState()
  await setStateCookie(state)
  redirect(buildAuthorizeUrl(state))
}

// Begin install (+ authorize): for a signed-in user with no installation, or to
// install on another account. Lands back on `/connected` with a fresh session.
export async function installApp() {
  const state = generateState()
  await setStateCookie(state)
  redirect(buildInstallUrl(state))
}

// Invalidate the backend session (best-effort) and clear the local cookie.
export async function signOut() {
  try {
    await logout()
  } catch {
    // Always clear the cookie even if the backend call fails.
  }
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/")
}
