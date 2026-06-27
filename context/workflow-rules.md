# Frontend Workflow Rules

## Approach

Build the frontend incrementally with a phase-driven workflow, the same way the backend
(`revet_be`) is built. The context files define what to build, how to build it, and the
current state. Always implement against these specs — do not infer or invent product
behavior not described here or in `project-overview.md` / `github-integration.md`. Each
phase must be working end-to-end before the next begins.

The frontend depends on the backend: some phases require **new backend endpoints**
(`architecture.md` §Backend API contract). Where a phase needs an endpoint the backend
doesn't expose yet, that backend work is a prerequisite — note it and coordinate, or
stub against an agreed shape, but don't silently invent a contract.

## Build order (phases)

| Phase | Deliverable |
| ----- | ----------- |
| **0. Scaffold** ✅ | Next 16 + React 19 app; Tailwind v4; shadcn (`base-lyra` / `@base-ui/react`); `next-themes` provider; `lib/utils`. Already in place. |
| **1. GitHub OAuth Sign-in** | "Sign in with GitHub" (authorize URL via `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID`, combined with install via `NEXT_PUBLIC_GITHUB_APP_SLUG`); `/connected` callback Route Handler (validate `state`, `POST` code → `{API}/auth/session`, set the session cookie); `lib/session.ts` guard; credentialed `lib/api.ts` skeleton; logout. **Needs backend: `/auth/session`, `/auth/logout`, `/me`, Redis session store, OAuth config, CORS-with-credentials.** |
| **2. Repo List & Indexing** | `/repos` Server Component: installations (from `/me`) + the selected installation's repos with status badges; index/re-index action; `use-indexing-status` polling to a terminal state; installation switcher; loading/error/empty states. **Needs backend: session-gated list-repos + index + status endpoints.** |
| **3. Chat** | `/repos/[owner]/[repo]` chat page; `use-chat-stream` (POST→SSE via `fetch`/`ReadableStream`); message list + composer; `thread_id` management; grounded-citation rendering. Reuses existing backend `/chat` (now session-gated). |
| **4. Polish** | Consistent loading/error/empty states, theme toggle, responsive layout, accessibility pass, refined installation switcher. |

Phase 1 (sign-in) precedes 2–3 (every endpoint is session-gated). Phase 2 (indexing)
precedes meaningful use of Phase 3 (chat needs an indexed repo). The combined
install+authorize flow means installing the app and signing in happen together — there is
no separate "connect" step.

## Scoping rules

- Work one phase unit at a time; complete it end-to-end before moving on.
- Prefer small, verifiable increments over large speculative changes.
- Keep client/server boundaries clean — don't mark a page `"use client"` to dodge a
  Server Component constraint; restructure instead.
- Don't add a state manager or data-fetching library unless a phase clearly needs it
  (raise it in `progress-tracker.md` first).

## When to split work

Split an implementation step if it combines:

- A new backend endpoint contract **and** the UI consuming it (agree the contract first).
- Two unrelated features (e.g., the repo list and the chat stream in one step).
- Behavior not clearly defined in the context files.
- A change that can't be verified end-to-end quickly.

## Handling missing requirements

- Do not invent product behavior not in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before coding.
- If a backend endpoint shape is undecided, record the proposed shape in
  `architecture.md` §Backend API contract and flag it as pending in `progress-tracker.md`
  before building against it.

## Protected patterns

Do not change these without explicit instruction:

- **GitHub OAuth is the only identity** — no passwords, no email/password accounts, no
  other identity provider. Lightweight GitHub-only sign-in (`github-integration.md`).
- **User/refresh tokens never reach the browser** — they live in the backend session
  store; the browser holds only the opaque `httpOnly` session cookie.
- **Every installation/repo backend call is access-checked against the session user** —
  `installation_id` is never trusted as a bare capability.
- **Frontend never holds GitHub App credentials or the OAuth secret, or talks to GitHub's
  app-scoped API directly** — it goes through `revet_be` (`architecture.md` invariant #1).
- **No secrets in `NEXT_PUBLIC_*`** or the client bundle (the OAuth client id is public).
- **Chat is SSE-over-POST via `fetch`/`ReadableStream`**, not `EventSource`.
- **`components/ui/` primitives are CLI-generated**, not hand-edited.

## Keeping docs in sync

Update the relevant context file whenever implementation changes:

- App structure, rendering strategy, or the backend contract → `architecture.md`
- The connection/auth approach → `github-integration.md`
- Code conventions → `code-standards.md`
- Feature scope or success criteria → `project-overview.md`
- Always update `progress-tracker.md` after completing any meaningful step.

## Before moving to the next phase

1. The current phase works end-to-end within its defined scope.
2. No invariant in `architecture.md` was violated.
3. `pnpm typecheck`, `pnpm lint`, and `pnpm format` pass.
4. `progress-tracker.md` is updated to reflect the completed phase.
5. The feature can be exercised by hand in the browser and produces the expected result
   (sign in → list installations/repos → index → chat).
