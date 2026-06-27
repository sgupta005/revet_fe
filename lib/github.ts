// Builds the GitHub OAuth authorize / install URLs and parses callback params.
// The OAuth *client id* is public; the *secret* lives only on the backend
// (`context/github-integration.md`).

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export function generateState(): string {
  return crypto.randomUUID()
}

// "Sign in with GitHub": authorize the logged-in person (user-to-server token).
// With the app's "request user authorization during installation" setting, a
// first-time user is funnelled through install in the same redirect.
export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv(
    "NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID",
    process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID
  )
  const url = new URL(GITHUB_AUTHORIZE_URL)
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("state", state)
  return url.toString()
}

// "Install / Add repositories": send the user to the app's installation page
// (used by the empty/expand-repos states in Phase 2).
export function buildInstallUrl(state?: string): string {
  const slug = requireEnv(
    "NEXT_PUBLIC_GITHUB_APP_SLUG",
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG
  )
  const url = new URL(`https://github.com/apps/${slug}/installations/new`)
  if (state) url.searchParams.set("state", state)
  return url.toString()
}

export type CallbackParams = {
  code: string
  state: string
  installationId: string | null
}

// Validates and normalizes the GitHub redirect query into a typed shape.
// `installation_id` is only present when the user just installed the app.
export function parseCallbackParams(
  searchParams: URLSearchParams
): CallbackParams | null {
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code || !state) return null
  return { code, state, installationId: searchParams.get("installation_id") }
}
