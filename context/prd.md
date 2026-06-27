# Revet Frontend — PRD

This PRD scopes the **frontend** only. The product, AI engine, and backend behavior are
defined in `revet_be/context/prd.md`; this document covers the web UI that consumes it.
Read alongside `project-overview.md`, `architecture.md`, and `github-integration.md`.

## 1. Problem & intent

Revet's AI engine (indexing, chat, PR review, etc.) ships headless in v1 — there's no
human surface for an individual developer to use it directly. This frontend gives one: a
person can **sign in with GitHub, pick repos, index them, and chat with their
codebase**, all in the browser. Sign-in is **lightweight GitHub OAuth** (the GitHub App's
user-to-server tokens) combined with app installation — no passwords, no separate
accounts system — giving real identity and per-user access control from day one.

## 2. Users

- **Primary (v1):** developers who install Revet on their personal or org repos and sign
  in with GitHub to use it.
- Multiple users are supported from the start: every request is gated by a session and
  access-checked against the user's installations.

## 3. v1 feature requirements

### 3.1 Sign in with GitHub (F1)
- **US:** *As a user, I can sign in with GitHub so Revet knows who I am and which repos I
  can act on.*
- A **Sign in with GitHub** action starts OAuth (authorize URL built from
  `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` with a CSRF `state`); for a first-time user it is
  combined with installing the app (`NEXT_PUBLIC_GITHUB_APP_SLUG`) in one redirect.
- A `/connected` Route Handler receives the redirect, validates `state`, forwards the
  `code` to the backend `/auth/session` (which exchanges it and creates a session), sets
  the opaque `httpOnly` session cookie, and forwards to the repo list.
- A **Sign out** action invalidates the session and clears the cookie.
- **Acceptance:** after authorizing (and installing on first run) the user lands
  authenticated on their installations/repos; refresh keeps them signed in; user tokens
  never appear in the browser.

### 3.2 See installations & repositories (F2a)
- **US:** *As a user, I can see my installations and their repositories with indexing
  status.*
- The page (Server Component) lists the user's installations (from `/me`) and the repos
  in the selected one, each with a status badge:
  `NOT_STARTED · INDEXING · COMPLETED · FAILED`.
- An **installation switcher** lets the user move between personal/org installations.
- Empty list ("Revet isn't installed for you yet" or few repos) links to install / expand
  repo access on GitHub. A **Refresh** action re-pulls the live repo set.
- **Acceptance:** the list reflects exactly the repos the signed-in user can access and
  each repo's status; an empty state shows guidance, not a blank screen.

### 3.3 Index a repository (F2b)
- **US:** *As a user, I can index (or re-index) a repo and watch it complete.*
- An **Index / Re-index** action triggers the backend job for that repo.
- The UI reflects `INDEXING` and polls until a terminal state without a manual refresh;
  polling stops on `COMPLETED`/`FAILED` and on leaving the view.
- **Acceptance:** clicking Index moves the badge to `INDEXING` then `COMPLETED` on its
  own; a failure surfaces an error state with a retry affordance.

### 3.4 Chat with a repository (F3)
- **US:** *As a user, I can ask questions about an indexed repo and get a grounded,
  streamed answer.*
- A per-repo chat page sends the message, `repo`, and a `thread_id` to the backend
  `/chat` endpoint and streams the answer token-by-token.
- Answers render incrementally and show grounded **citations** (path · symbol · line
  range) the backend provides.
- `thread_id` is stable per repo/session and persists across reload so a conversation
  continues.
- **Acceptance:** asking a question on a `COMPLETED` repo streams a visible, incremental
  answer that cites at least one specific code location; reloading keeps the thread.

### 3.5 Cross-cutting UX (F4)
- Every data surface handles **loading, error, empty** states explicitly.
- Dark/light theming via `next-themes`; responsive on common viewport sizes; baseline
  accessibility (labels, keyboard, focus).

## 4. Non-functional requirements

- **Performance:** first paint of static data via Server Components (no client JS needed
  to see the repo list); chat renders deltas as they arrive (no full-response buffering).
- **Statelessness:** the frontend persists only the opaque session cookie and per-repo
  `thread_id`s; it owns no database. User/refresh tokens live in the backend session
  store.
- **Security:** no secrets in the client (OAuth client id is public, secret is not); the
  session cookie is `httpOnly`/`Secure`/`SameSite=Lax`; every installation/repo endpoint
  is session-gated and access-checked against the user — no bare-`installation_id`
  capability (`github-integration.md`).
- **Type safety:** strict TypeScript, typed backend responses, no `any` at boundaries.

## 5. Dependencies & assumptions

- **Auth backend doesn't exist yet.** The backend has no auth today; F1 needs
  `/auth/session`, `/auth/logout`, `/me`, a Redis session store, OAuth client id/secret in
  config, and the GitHub App configured for OAuth + Callback URL + "request user
  authorization during installation" (`github-integration.md`).
- **Repo/index endpoints don't exist yet** and must be session-gated and access-checked;
  required for F2 (`architecture.md` §Backend API contract). `/chat` exists and is reused
  for F3, now session-gated.
- **CORS** on the backend must allow the frontend origin **with credentials**.
- The OAuth Callback URL points at the frontend `/connected` route (or the backend, if
  deployed under a shared cookie domain — a deployment decision).

## 6. Out of scope (v1)

- Passwords, email/password accounts, or any identity provider other than GitHub.
- UIs for PR review, issue analysis, auto-PR, custom rules (backend features without a
  frontend surface yet).
- Billing, org/team management, fine-grained RBAC beyond per-installation access checks.
- Any data persistence the frontend owns beyond the session cookie and thread ids.

## 7. Success metrics (acceptance for the release)

1. Sign in → authorize/install → return lands the user authenticated on their
   installations/repos.
2. Index → `COMPLETED` is observable live in the UI.
3. Chat streams a grounded, cited answer on an indexed repo.
4. A user cannot list, index, or chat an installation they don't have access to — every
   endpoint verifies the session user against the target installation.
