# GitHub Integration & Authentication Plan

This is the most important design decision for the frontend: **how a user connects their
GitHub, signs in, and sees the repositories they can act on.** The chosen approach is
**GitHub OAuth first**, using a GitHub App that issues both server-to-server and
user-to-server tokens.

## The decision

**Sign the user in with GitHub OAuth (GitHub App user-to-server tokens), backed by a
server session. Use the user token to discover installations and repos, and the existing
installation token to act on them. Every backend endpoint is session-gated and verifies
the user can access the installation/repo before doing anything.**

GitHub-only OAuth is **lightweight identity**, not a full accounts system: GitHub is the
identity provider, so there is no password storage, email verification, or reset flow.
The user record is essentially `(github_id, login, avatar, tokens)`.

## Why this is the right design — the dual-token model

A GitHub App has **two** kinds of token, and a correct UI uses **both**:

| Token | Represents | Used for | Owner |
| ----- | ---------- | -------- | ----- |
| **Installation token** (server-to-server) | *the app* | Read repo files, index, retrieve code for chat, post reviews | Backend — already implemented |
| **User access token** (user-to-server, via OAuth) | *the logged-in person* | "Which installations / repos can **this user** see?", and authorizing UI actions | Backend, obtained via OAuth, stored per session |

The install-only approach (a bare `installation_id` as a handle) used only the
installation token and had **no concept of who is looking** — which is exactly why it
leaked into an unauthenticated bearer capability. Adding the **user token** is the piece
that makes the integration correct: identity, ownership checks, and real repo discovery
all come from it.

## The flow (combined install + authorize)

The GitHub App is configured with **"Request user authorization (OAuth) during
installation"** so a first-time user installs the app *and* logs in with one redirect.
Returning users who already have it installed just authorize (log in).

```
[Sign in with GitHub]                         [Install / Add repositories]
  authorize URL (client_id, state)              github.com/apps/<slug>/installations/new
  github.com/login/oauth/authorize                (OAuth-during-install → same callback)
            │                                            │
            └───────────────┬────────────────────────────┘
                            ▼
        GitHub redirects to Callback URL → frontend /connected (Route Handler, server)
            ?code=...&installation_id=...(when installing)&state=...
                            │
                            │  validate `state` (CSRF)
                            │  POST {API}/auth/session { code }      ◀── backend owns the secret
                            ▼
        [revet_be] exchange code → user access token (+ refresh)
                    GET /user → identity; upsert user
                    create session in Redis → return { session_token, user }
                            │
                            ▼
        [frontend] set httpOnly session cookie (first-party) → redirect /repos
                            │
                            ▼
        [/repos]  GET {API}/me                → user + their installations
                  GET {API}/installations/{id}/repositories  (session-gated, ownership-checked)
                  index / chat                 (session-gated)
```

### Why the callback lands on the frontend, then forwards the code
- The OAuth **client secret** lives only on the backend, so the **code exchange happens
  on the backend** (`POST /auth/session`).
- The session **cookie is first-party to the frontend domain**, so Next.js Server
  Components can read it with `cookies()` without cross-origin cookie pain.
- The frontend `/connected` Route Handler runs server-side, so forwarding the `code` to
  the backend never exposes it to the browser.

Alternative (simpler if deployed under one parent domain, e.g. `app.` + `api.revet.app`):
point the GitHub Callback URL straight at the backend, let it set the session cookie on
the shared parent domain, and redirect to the frontend. Pick this only if the cookie
domain is shared; otherwise use the forward-the-code pattern above. **Deployment
decision — confirm before building the callback.**

## Sessions & tokens

- **Session store: Redis** (the backend already runs Redis). A session maps an opaque
  `session_token` → `{ github_user_id, user_access_token, refresh_token, expires_at }`.
  User tokens are stored server-side only — **never sent to the browser**. The browser
  holds only the opaque session cookie.
- **Session cookie:** `httpOnly`, `Secure`, `SameSite=Lax` (Lax works for the top-level
  GitHub redirect). Frontend Server Components read it to know "logged in?"; every backend
  request carries it; the backend validates it against Redis.
- **User-token expiry:** GitHub App user tokens can be **expiring (8h) + refresh token
  (6mo)** or **non-expiring**. Default to expiring + refresh (refresh on the backend when
  a `GET /user/...` call 401s). Simpler non-expiring tokens are an option — **decision to
  confirm** (`progress-tracker.md`).
- **`state` / CSRF:** the frontend generates a random `state`, stores it in a short-lived
  cookie before redirecting to GitHub, and verifies it on `/connected` before forwarding
  the code. The OAuth **client id is public** (`NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID`) so the
  frontend can build the authorize URL; only the **secret** stays backend-side.
- **Logout:** `POST {API}/auth/logout` invalidates the Redis session and the frontend
  clears the cookie.

## Repo discovery (the better experience the user token unlocks)

With a user token the backend can answer real questions about *this user*:

- **`GET /user/installations`** → every installation the user can access (their personal
  account + any orgs where the app is installed). Surfaced via `GET {API}/me`.
  - **Empty** → the app isn't installed for this user yet → show **"Install Revet"**
    (the install URL). For brand-new users the combined install+authorize flow handles
    install and login together.
- **`GET /user/installations/{id}/repositories`** → the repos in that installation the
  user can access (paginated). These are the candidates to index/chat.
- The backend joins this live list with its stored `Repository` rows to attach each
  repo's **indexing status**.

So "see all your repos" now means: list the user's installations, let them pick one (an
**installation switcher** is natural here, not a later add-on), and show that
installation's repos with status. To add repos, link the user to the installation's
GitHub settings (built from `NEXT_PUBLIC_GITHUB_APP_SLUG`).

## Authorization (no more bearer hole)

Every backend endpoint that touches an installation or repo:
1. Resolves the session cookie → user (401 if missing/invalid).
2. Verifies the user can access the target installation/repo (via their installations
   list) — 403 otherwise.
3. Then acts using the **installation token** (the app's server-to-server identity).

`installation_id` is now just a reference gated by the session + ownership check — not a
secret that grants access on its own. This closes the v1 security gap from day one.

## Backend work this requires (cross-repo dependency)

The backend currently has **no auth at all**. This plan adds (tracked on the `revet_be`
side; shapes indicative — finalize with the backend):

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/auth/session` | Exchange OAuth `code` → user token, upsert user, create session, return `{ session_token, user }` |
| `POST` | `/auth/logout` | Invalidate the session |
| `GET`  | `/me` | Current user + their installations (`GET /user/installations`) |
| `GET`  | `/installations/{id}/repositories` | Session-gated, ownership-checked; repos + indexing status |
| `POST` | `/repos/{owner}/{repo}/index` | Session-gated; enqueue the existing `index_repo` task |
| `GET`  | `/repos/{owner}/{repo}/index-status` | Session-gated; current `indexing_status` |
| `POST` | `/chat` | **Exists** — now session-gated |

Plus: a **user** table/record (`github_id`, `login`, tokens), a **Redis session store**,
`state`/CSRF handling, the OAuth **client id/secret** in backend config, **CORS** allowing
the frontend origin **with credentials**, and the GitHub App configured with OAuth, a
Callback URL, and "request user authorization during installation".

## What stays the same

- The **installation token** path (minting, caching, all repo actions) is unchanged — the
  backend already has it. We're adding the user-token/session layer *around* it.
- Indexing and `/chat` graph logic are untouched; they just gain a session gate.

## Rejected / superseded alternatives

- **Install-only `installation_id` handle (no auth)** — the original draft. Superseded:
  it has no identity, leaks an unauthenticated bearer capability, and offers weaker repo
  discovery (one opaque installation, no "not installed" detection, no switcher).
- **OAuth *then* a separate install step** — avoided by enabling OAuth-during-install, so
  first-time users get one combined redirect instead of an "authorize then install" dance.
- **Storing user tokens in the browser** — never. The browser holds only the opaque
  session cookie; user/refresh tokens stay server-side in Redis.
