// Typed, credentialed client for the backend (`revet_be`). The only place that
// talks to the backend — components receive typed data, never raw `Response`.
// Server requests forward the session cookie; client requests send it with
// `credentials: "include"` (`context/code-standards.md` §Data fetching).

import { SESSION_COOKIE } from "@/lib/session"
import type { CreateSessionResponse, Me } from "@/lib/types"

function baseUrl(): string {
  const url =
    typeof window === "undefined"
      ? (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL)
      : process.env.NEXT_PUBLIC_API_BASE_URL
  if (!url) {
    throw new Error(
      "Missing API base URL (API_BASE_URL / NEXT_PUBLIC_API_BASE_URL)"
    )
  }
  return url.replace(/\/+$/, "")
}

// Server-side: read the session cookie and forward the opaque token as a Bearer
// header (the backend accepts `Authorization: Bearer` or a `session` cookie —
// Bearer avoids any cross-origin cookie-domain coupling). Imported lazily so
// this module stays usable from Client Components too.
async function serverAuthHeader(): Promise<Record<string, string>> {
  if (typeof window !== "undefined") return {}
  const { cookies } = await import("next/headers")
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? { authorization: `Bearer ${token}` } : {}
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  // Whether the request carries the session (skip for the session-creation call,
  // which authenticates with the OAuth `code` instead).
  auth?: boolean
}

async function request<T>(
  path: string,
  { method = "GET", body, auth = true }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["content-type"] = "application/json"
  if (auth) Object.assign(headers, await serverAuthHeader())

  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  })

  if (res.status === 401 && auth && typeof window === "undefined") {
    const { redirect } = await import("next/navigation")
    redirect("/")
  }
  if (!res.ok) {
    throw new ApiError(res.status, `${method} ${path} failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// POST /auth/session — exchange the OAuth `code` for a server session.
export function createSession(code: string): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>("/auth/session", {
    method: "POST",
    auth: false,
    body: { code },
  })
}

// POST /auth/logout — invalidate the current session (cookie still present).
export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" })
}

// GET /me — current user and their installations.
export function getMe(): Promise<Me> {
  return request<Me>("/me")
}
