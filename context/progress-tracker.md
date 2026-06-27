# Frontend Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

Phase 0 — Scaffold (complete). Context folder authored.

## Current Goal

Phase 1 — GitHub OAuth Sign-in.

## Completed

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

1. **Phase 1 — GitHub OAuth Sign-in**: "Sign in with GitHub" (authorize URL via
   `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID`, combined install via `NEXT_PUBLIC_GITHUB_APP_SLUG`,
   `state`), `/connected` Route Handler (validate `state` → `POST` code to
   `{API}/auth/session` → set session cookie), `lib/session.ts` guard, credentialed
   `lib/api.ts` skeleton, sign-out.
2. **Phase 2 — Repo List & Indexing** (needs session-gated backend endpoints + CORS).
3. **Phase 3 — Chat** (reuses backend `/chat` SSE, now session-gated).
4. **Phase 4 — Polish**.

## Open Questions / Pending Decisions

- **Auth backend doesn't exist yet.** `/auth/session`, `/auth/logout`, `/me`, a user
  record, a Redis session store, OAuth client id/secret config, and the GitHub App's OAuth
  setup are **new `revet_be` work** blocking Phase 1. Finalize shapes with the backend.
- **Callback placement (deployment).** Frontend `/connected` Route Handler forwards the
  code to the backend (keeps the session cookie first-party) vs. backend owns the callback
  and sets a cookie on a shared parent domain. Decide based on deployment topology —
  `github-integration.md` §"Why the callback lands on the frontend".
- **User-token lifetime.** Expiring (8h) + refresh token (6mo) vs. non-expiring GitHub App
  user tokens. Default to expiring+refresh (more secure); confirm with the backend.
- **Repo/index endpoints don't exist yet** and must be session-gated + access-checked
  (`architecture.md` §Backend API contract). Required for Phase 2.
- **Repo-list source.** Default to stored `Repository` rows joined with the user's live
  installation repos (fast, has status); offer a `?refresh=1` live pull. Confirm shapes.
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
