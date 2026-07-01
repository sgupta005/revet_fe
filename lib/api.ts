// Typed, credentialed client for the backend (`revet_be`). The only place that
// talks to the backend — components receive typed data, never raw `Response`.
// Server requests forward the session cookie; client requests send it with
// `credentials: "include"` (`context/code-standards.md` §Data fetching).

import { SESSION_COOKIE } from "@/lib/session"
import type {
  ChatRole,
  ChatThread,
  CreateSessionResponse,
  IndexStatusResponse,
  IssueAnalysis,
  Me,
  PullReview,
  Repository,
  Rule,
} from "@/lib/types"

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
  // Server-side 401 → redirect to sign-in. Disable for proxy Route Handlers,
  // which should surface the status to the client instead of redirecting an XHR.
  redirectOnAuthError?: boolean
}

async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    auth = true,
    redirectOnAuthError = true,
  }: RequestOptions = {}
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

  if (
    res.status === 401 &&
    auth &&
    redirectOnAuthError &&
    typeof window === "undefined"
  ) {
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

// GET /installations/{id}/repositories — the user's repos for an installation
// with indexing status. Called from the Server Component repo list.
export function listRepositories(
  installationId: number,
  refresh = false
): Promise<Repository[]> {
  const query = refresh ? "?refresh=1" : ""
  return request<Repository[]>(
    `/installations/${installationId}/repositories${query}`
  )
}

// POST /repos/{owner}/{repo}/index — enqueue (re)indexing. Used by the proxy
// Route Handler, so it surfaces a 401 rather than redirecting.
export function indexRepository(
  owner: string,
  repo: string
): Promise<{ status: string; full_name: string }> {
  return request(`/repos/${owner}/${repo}/index`, {
    method: "POST",
    redirectOnAuthError: false,
  })
}

// GET /repos/{owner}/{repo}/index-status — current indexing status. Used by the
// proxy Route Handler for client-side polling.
export function getIndexStatus(
  owner: string,
  repo: string
): Promise<IndexStatusResponse> {
  return request<IndexStatusResponse>(`/repos/${owner}/${repo}/index-status`, {
    redirectOnAuthError: false,
  })
}

// GET /repos/{owner}/{repo}/chat/threads — list the authed user's threads for a
// repo, ordered by updated_at desc. Used server-side (chat/page.tsx) and by the
// proxy Route Handler for client calls from WorkspaceNav.
export function getThreads(owner: string, repo: string): Promise<ChatThread[]> {
  return request<ChatThread[]>(`/repos/${owner}/${repo}/chat/threads`, {
    redirectOnAuthError: false,
  })
}

// GET /repos/{owner}/{repo}/pulls — the PRs Revet has reviewed for a repo, most
// recent first. Read-only activity feed; rendered server-side (pulls/page.tsx).
export function getPullReviews(
  owner: string,
  repo: string
): Promise<PullReview[]> {
  return request<PullReview[]>(`/repos/${owner}/${repo}/pulls`)
}

// GET /repos/{owner}/{repo}/issues — the issues Revet has analyzed for a repo,
// most recent first. Read-only activity feed; rendered server-side
// (issues/page.tsx). Mirrors getPullReviews.
export function getIssueAnalyses(
  owner: string,
  repo: string
): Promise<IssueAnalysis[]> {
  return request<IssueAnalysis[]>(`/repos/${owner}/${repo}/issues`)
}

// Custom-rules CRUD (Phase 11). All go through same-origin proxy Route Handlers
// (mutating tool → httpOnly cookie forwarded as Bearer), so they surface a 401
// rather than redirecting an XHR.
export function getRules(owner: string, repo: string): Promise<Rule[]> {
  return request<Rule[]>(`/repos/${owner}/${repo}/rules`, {
    redirectOnAuthError: false,
  })
}

export function createRule(
  owner: string,
  repo: string,
  input: { name: string; body: string }
): Promise<Rule> {
  return request<Rule>(`/repos/${owner}/${repo}/rules`, {
    method: "POST",
    body: input,
    redirectOnAuthError: false,
  })
}

export function updateRule(
  owner: string,
  repo: string,
  ruleId: number,
  input: { name: string; body: string }
): Promise<Rule> {
  return request<Rule>(`/repos/${owner}/${repo}/rules/${ruleId}`, {
    method: "PUT",
    body: input,
    redirectOnAuthError: false,
  })
}

export function deleteRule(
  owner: string,
  repo: string,
  ruleId: number
): Promise<void> {
  return request<void>(`/repos/${owner}/${repo}/rules/${ruleId}`, {
    method: "DELETE",
    redirectOnAuthError: false,
  })
}

// GET /chat/threads/{thread_id} — fetch full message history for a thread.
// Used by the proxy Route Handler; the client calls the proxy, never this directly.
export function getThreadMessages(
  threadId: string
): Promise<Array<{ role: ChatRole; content: string }>> {
  return request<Array<{ role: ChatRole; content: string }>>(
    `/chat/threads/${threadId}`,
    { redirectOnAuthError: false }
  )
}

// POST /chat — stream a grounded answer as SSE. Returns the raw streaming
// `Response` (not parsed JSON like `request`) so the proxy Route Handler can pipe
// the body straight through to the browser unbuffered (invariant #4). Bearer auth
// is added server-side exactly like every other call.
export async function chatStream(body: {
  repo: string
  message: string
  thread_id?: string
}): Promise<Response> {
  return fetch(`${baseUrl()}/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(await serverAuthHeader()),
    },
    body: JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  })
}
