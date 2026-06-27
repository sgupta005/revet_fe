# Frontend Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

Phase 1 — GitHub OAuth Sign-in (complete; backend endpoints implemented and contract
reconciled).

## Current Goal

Phase 2 — Repo List & Indexing.

## Completed

- **Phase 1 — GitHub OAuth Sign-in** (2026-06-27)
  - `lib/types.ts`: `User`, `Installation`, `Me`, `CreateSessionResponse` (mirrors the
    backend contract; finalize shapes with the backend).
  - `lib/github.ts`: `generateState`, `buildAuthorizeUrl`, `buildInstallUrl`,
    `parseCallbackParams`. The sign-in button uses the **authorize URL** (`client_id` +
    `state`); the install URL builder is ready for Phase 2 empty/expand-repos states.
  - `lib/session.ts`: `SESSION_COOKIE` (`revet_session`), `OAUTH_STATE_COOKIE`
    (`revet_oauth_state`), `getSessionToken`, `isLoggedIn`, `requireSession` guard.
  - `lib/api.ts`: typed credentialed client — `createSession`, `logout`, `getMe`.
    Server requests forward the session cookie (lazy `next/headers` import so the module
    is client-safe); `401` on an authed server call redirects to `/`. `ApiError` for
    non-OK responses. Base URL: `API_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL`.
  - `app/actions.ts`: `signIn` (sets the short-lived `state` cookie, redirects to GitHub)
    and `signOut` (best-effort `/auth/logout`, clears the cookie) server actions.
  - `app/connected/route.ts`: validates `state`, exchanges `code` via `POST /auth/session`,
    sets the `httpOnly`/`SameSite=Lax`/`Secure`(prod) session cookie, redirects to `/repos`;
    any failure clears `state` and returns to `/?error=oauth`.
  - `app/page.tsx`: landing with "Sign in with GitHub" (`<form action={signIn}>`),
    redirects logged-in users to `/repos`, surfaces `?error=oauth`.
  - `app/repos/page.tsx`: **minimal** authenticated landing (`requireSession` + `getMe`,
    sign-out) — placeholder; the full installation switcher + repo list is Phase 2.
  - `.env.example` (+ `.gitignore` exception) documents the four env vars; no secrets.
  - Note: `lucide-react` (this pinned version) has **no GitHub brand icon** — used
    `GitBranch` on the sign-in button.
  - Gates pass: `pnpm typecheck`, `pnpm lint` (one pre-existing scaffold warning in
    `app/layout.tsx`), `pnpm build`.
- **Backend contract reconciled against `revet_be` (`app/api.py`, `app/auth/dependencies.py`)**
  (2026-06-27) — the backend implemented `/auth/session`, `/auth/logout`, `/me` (+ repo
  endpoints for Phase 2). FE adjustments to match the real shapes:
  - **Auth header, not cookie name.** Backend reads `Authorization: Bearer <token>` or a
    cookie literally named `session`; our cookie is `revet_session`. `lib/api.ts` now
    forwards the token as **`Authorization: Bearer`** server-side (decoupled from cookie
    name / cross-origin cookie domain). Backend sets no cookie — the FE `/connected` route
    owns the cookie; backend returns `{ session_token, user }` as JSON.
  - `SessionRequest` is `{ code }` only → `createSession(code)` drops `installation_id`.
  - `UserOut` = `{ id, github_id, login, avatar_url }` (added `id`); `InstallationOut` =
    `{ id, account_login, account_type }` (no `avatar_url`) → `lib/types.ts` updated.
  - `exchange_code` sends no `redirect_uri` (GitHub uses the app's configured callback) —
    our authorize URL sends none either, so no mismatch. `frontend_origin` defaults to
    `http://localhost:3000`; CORS allows it with credentials.


- **Context folder authored** (2026-06-27)
  - `project-overview.md`, `prd.md`, `architecture.md`, `code-standards.md`,
    `workflow-rules.md`, `github-integration.md`, this tracker — mirroring the
    `revet_be/context` structure, scoped to the frontend.
  - **Direction set: GitHub OAuth first** (2026-06-27, supersedes the initial install-only
    draft). Sign in with GitHub via the GitHub App's user-to-server tokens, combined with
    app installation; a Redis-backed server session; the browser holds only an opaque
    `httpOnly` session cookie. The **dual-token model** (installation token = app acts;
    user token = who's looking) is the core idea; every installation/repo endpoint is
    session-gated and access-checked. Full plan in `github-integration.md`.
- **Phase 0 — Scaffold** (pre-existing in the repo)
  - Next.js 16.2.6 + React 19.2.4 (App Router, RSC), TypeScript strict, `@/*` alias.
  - Tailwind CSS v4; `app/globals.css`; PostCSS config.
  - shadcn configured (style `base-lyra`, base color `mist`, `@base-ui/react`,
    `lucide` icons); `components/ui/button.tsx` present.
  - `next-themes` provider (`components/theme-provider.tsx`); `lib/utils.ts` (`cn`).
  - `pnpm` workspace; prettier + eslint (next config) set up.
  - `AGENTS.md` warns: this is Next.js 16 with breaking changes — read
    `node_modules/next/dist/docs/` before writing Next-specific code.

## In Progress

- None.

## Next Up

1. **Phase 2 — Repo List & Indexing.** Backend endpoints now exist:
   `GET /installations/{installation_id}/repositories` (`?refresh=1`),
   `POST /repos/{owner}/{repo}/index` (202), `GET /repos/{owner}/{repo}/index-status`
   (`{ full_name, indexing_status, chunk_count }`). Replace the placeholder
   `app/repos/page.tsx`; add `RepositoryOut`/`IndexStatusResponse` types, the installation
   switcher, status badges, index action, and `use-indexing-status` polling.
2. **Phase 3 — Chat** (reuses backend `/chat` SSE, now session-gated). Note: client-side
   calls can't read the `httpOnly` cookie for a Bearer header — wire client→backend auth
   via a route-handler proxy or a shared cookie domain (the deferred deployment decision).
3. **Phase 4 — Polish**.

## Open Questions / Pending Decisions

- ~~**Auth backend doesn't exist yet.**~~ **Resolved** — `revet_be` implemented
  `/auth/session`, `/auth/logout`, `/me`, the user record, Redis session store, OAuth
  config, and the GitHub App OAuth setup. Contract reconciled (see Completed → backend
  contract reconciled). Backend reads `Authorization: Bearer` or a `session` cookie; the FE
  forwards Bearer.
- **Client→backend auth (Phase 3).** Server Components forward the token as a Bearer
  header, but client-side fetches (chat SSE) can't read the `httpOnly` cookie. Resolve via
  a route-handler proxy that injects Bearer, or a shared cookie domain so the browser sends
  the `session` cookie directly. Tied to the callback-placement/deployment decision below.
- **Callback placement (deployment).** Frontend `/connected` Route Handler forwards the
  code to the backend (keeps the session cookie first-party) vs. backend owns the callback
  and sets a cookie on a shared parent domain. Decide based on deployment topology —
  `github-integration.md` §"Why the callback lands on the frontend".
- **User-token lifetime.** Expiring (8h) + refresh token (6mo) vs. non-expiring GitHub App
  user tokens. Backend supports refresh (`call_with_refresh` in `app/auth/dependencies.py`).
- **Repo-list source.** Backend joins live installation repos with stored `Repository`
  rows and offers `?refresh=1`. `RepositoryOut` = `{ full_name, indexing_status }`. Wire in
  Phase 2.
- **Citation shape.** Confirm how the backend `/chat` stream surfaces grounded citations
  (inline in text vs. a structured field) so the chat UI can render them.
- **`thread_id` scheme.** Generation (client UUID) + per-repo localStorage persistence —
  proposed in `architecture.md` §State; confirm against backend chat-memory-key needs.

## Architecture Decisions

- **GitHub OAuth first; dual-token model.** Identity is GitHub OAuth (user-to-server
  token) backed by a Redis server session; the browser holds only an opaque `httpOnly`
  session cookie. The app acts on repos with the **installation token**, but only after a
  per-request access check of the session user against the target installation. Combined
  install+authorize flow means signing in and installing happen in one redirect. Full
  rationale (and the rejected install-only handle): `github-integration.md`.
- **Frontend is a thin client; owns no database.** Only persisted state is the opaque
  session cookie and per-repo `thread_id`s; user/refresh tokens live in the backend. All
  data/AI lives in `revet_be`.
- **Server Components by default; client islands for chat/polling/theme.** First paint of
  static data needs no client JS.
- **Chat is SSE-over-POST via `fetch`/`ReadableStream`** — not `EventSource` (GET-only).
- **No state manager / data-fetching library in v1** — Server Components + a typed
  `lib/api.ts` + two hooks. Revisit only on demonstrated need.
- **`components/ui/` primitives are shadcn-CLI-generated**, not hand-edited.

## Session Notes

- Backend lives at `../revet_be`; its context is in `revet_be/context/` and it is
  currently at Phase 4 (Chat) complete, Phase 5 (PR Review) next — i.e. `/chat` SSE
  exists and is ready to consume.
- This is Next.js 16 (not training-data Next.js): consult
  `node_modules/next/dist/docs/` before writing framework-specific code (`AGENTS.md`).
