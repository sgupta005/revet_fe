# Frontend Architecture

## Stack

| Layer            | Technology                                  | Role                                              |
| ---------------- | ------------------------------------------- | ------------------------------------------------- |
| Framework        | Next.js 16 (App Router, RSC) + React 19     | Routing, Server Components, streaming UI          |
| Language         | TypeScript (strict)                         | Typed throughout; no `any` at boundaries          |
| Styling          | Tailwind CSS v4 (CSS-first `@theme`)        | Utility styling; theme tokens in `app/globals.css`|
| Components       | shadcn (style `base-lyra`) on `@base-ui/react` | Primitives in `components/ui/` via the shadcn CLI |
| Theming          | `next-themes`                               | Dark/light mode (`components/theme-provider.tsx`) |
| Icons            | `lucide-react`                              | Icon set                                          |
| Package manager  | `pnpm`                                       | Lockfile is `pnpm-lock.yaml`                       |
| Backend          | `revet_be` (FastAPI) over HTTP/SSE          | All data + AI; the frontend is a client of it     |

> ⚠️ **This is Next.js 16, not the Next.js in your training data.** APIs, conventions,
> and file structure may differ. Per `AGENTS.md`, **read the relevant guide in
> `node_modules/next/dist/docs/` before writing Next-specific code** (routing, data
> fetching, route handlers, server actions, caching, `cookies()`/`headers()`).

## System position

```
            Browser (Next.js 16 frontend — revet_fe)
                 │  HTTPS / SSE
                 ▼
        revet_be (FastAPI)  ── installation token ──▶  GitHub REST
                 │
         Postgres + pgvector · Redis · OpenAI
```

The frontend owns **no database**. Its only persistent state is an opaque `httpOnly`
**session cookie** (issued by the backend) and per-repo `thread_id`s. User and refresh
tokens live in the backend's Redis session store, never in the browser. Everything else
is read from or streamed from the backend.

## Application structure (App Router)

```
app/
  layout.tsx              # root layout: <ThemeProvider>, fonts, globals.css
  page.tsx                # landing / "Sign in with GitHub"
  connected/             # OAuth callback Route Handler (server)
    route.ts              #   validate state, POST code→{API}/auth/session, set cookie, → /repos
  repos/
    page.tsx              # installations + repo list for the active installation (Server Component)
    [owner]/[repo]/
      page.tsx            # repo detail + chat (server shell + client chat island)
  api/                    # Route Handlers for cookie writes / SSE proxy if needed
components/
  ui/                     # shadcn/base-ui primitives — generated, not hand-edited
  theme-provider.tsx
  ...feature components   # repo-card, status-badge, chat-message, chat-composer, etc.
hooks/
  use-chat-stream.ts      # SSE consumption for chat
  use-indexing-status.ts  # poll a repo's indexing status
lib/
  api.ts                  # typed, credentialed backend client (base URL from env)
  github.ts               # build authorize + install URLs, parse callback params
  session.ts              # read session cookie (server), logged-in guard
  types.ts                # shared API/domain types
  utils.ts                # cn() etc.
```

Routes and filenames above are the intended shape; confirm exact App Router conventions
against the bundled Next 16 docs before implementing.

## Rendering & data-fetching strategy

- **Server Components by default.** The repo list and repo shell render on the server,
  reading the session cookie via `cookies()`, forwarding it to the backend, and fetching
  the initial data. No client JS for the first paint of static data. Unauthenticated
  requests redirect to the sign-in landing.
- **Client Components only where needed** (`"use client"`): the chat stream, the chat
  composer, indexing-status polling, theme toggle, and anything using hooks/interaction.
- **Streaming chat** is a client island: the backend `/chat` is a **POST that returns
  SSE**, so `EventSource` cannot be used. Consume it with `fetch()` + a
  `ReadableStream` reader, parsing `data: {...}` frames (`{"delta": "..."}` chunks then a
  terminal `{"done": true}`). See `code-standards.md` §Streaming.
- **Indexing status** is polled (interval) from a client hook until a terminal state
  (`COMPLETED`/`FAILED`); stop polling on terminal or unmount.
- **No data-fetching/cache library in v1** (no react-query/SWR). Server Components +
  a small typed `lib/api.ts` + the two hooks cover the needs. Revisit only if polling +
  cache invalidation gets unwieldy.

## State

- **Session cookie** — the identity. Opaque, `httpOnly`, issued by the backend, set by
  the `/connected` Route Handler. Sent automatically on every backend request. Server
  Components read it (presence = logged in); the browser cannot read its contents.
- **Active installation** — a UI selection (the user may have several). Remember the last
  choice in a readable cookie or the URL; default to the first installation. Not an
  identity — every backend call re-verifies access.
- **`thread_id`** — per repo (and per session) chat-memory key sent to `/chat`. Generate
  one when a repo chat starts; keep it stable for that conversation. Persist per-repo in
  localStorage so a conversation survives reload.
- **No global state manager** in v1. URL + cookies + local component state + the two
  hooks are enough. Don't add Redux/Zustand speculatively.

## Auth & access model

Summarized here; **full plan in `github-integration.md`.** The frontend signs the user in
with **GitHub OAuth** (GitHub App user-to-server tokens) via a combined
authorize+install redirect. The backend exchanges the `code` for a user token and creates
a Redis-backed session; the browser holds only an opaque session cookie. The frontend
owns the authorize/install URL construction (`lib/github.ts`, via
`NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` / `NEXT_PUBLIC_GITHUB_APP_SLUG`) and the `/connected`
callback Route Handler. Repo discovery uses the user token (`GET /user/installations`);
the backend acts on repos with the **installation token** but only after verifying the
session user can access the target installation. `installation_id` is a reference gated
by the session, **not** a secret.

## Backend API contract (cross-repo dependency)

The backend v1 is webhook-only plus `/chat` and has **no auth**. The frontend needs these
endpoints; they are **new backend work** tracked on the `revet_be` side. Shapes are
indicative — finalize with the backend.

| Method | Path | Purpose | Notes |
| ------ | ---- | ------- | ----- |
| `POST` | `/auth/session` | Exchange OAuth `code` → user token, upsert user, create session | Returns `{ session_token, user }`; client secret is backend-only |
| `POST` | `/auth/logout` | Invalidate the session | Frontend clears the cookie |
| `GET`  | `/me` | Current user + their installations | Backed by `GET /user/installations` with the user token |
| `GET`  | `/installations/{installation_id}/repositories` | Repos in an installation + indexing status | **Session-gated, ownership-checked.** Joins live repo list with stored status; `?refresh=1` re-pulls from GitHub |
| `POST` | `/repos/{owner}/{repo}/index` | Enqueue (re)indexing | **Session-gated.** Enqueues the existing `index_repo` task |
| `GET`  | `/repos/{owner}/{repo}/index-status` | Read current `indexing_status` (+ counts) | **Session-gated.** May fold into the repositories list |
| `POST` | `/chat` | Stream a grounded answer (SSE) | **Exists** — now **session-gated.** Needs `repo`, `thread_id`, message |

Cross-cutting backend requirements:
- **CORS** must allow the frontend origin **with credentials** (cookies).
- Every installation/repo endpoint resolves the session → user, **verifies the user can
  access the target installation/repo**, then acts with the installation token.
- New backend pieces: a user record, a Redis session store, OAuth client id/secret in
  config, `state`/CSRF handling, and the GitHub App configured for OAuth + a Callback URL
  + "request user authorization during installation".

## Configuration (env vars)

| Var | Scope | Purpose |
| --- | ----- | ------- |
| `NEXT_PUBLIC_API_BASE_URL` | public | Backend base URL for client fetches/SSE |
| `API_BASE_URL` | server | Backend base URL for Server Component fetches (may equal the public one; lets server traffic use an internal address) |
| `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` | public | OAuth client id — frontend builds the authorize URL (client id is not secret) |
| `NEXT_PUBLIC_GITHUB_APP_SLUG` | public | App slug used to build the install / "add repositories" link |

No secrets belong in `NEXT_PUBLIC_*`. The **OAuth client secret**, GitHub App private key,
webhook secret, OpenAI key, and all user/refresh tokens live **only in the backend**.

## Invariants

1. The frontend never talks to GitHub's API directly for app-scoped data and never holds
   GitHub App credentials or the OAuth secret — it goes through `revet_be`, which owns the
   installation token, the OAuth code exchange, and the user-token store.
2. The frontend stores no domain data of its own; its only persisted state is the opaque
   session cookie and per-repo `thread_id`s. User/refresh tokens stay in the backend.
3. Server Components read the session cookie via `cookies()` and forward it to the
   backend; never assume localStorage on the server; never read user tokens client-side.
4. Chat is consumed as SSE over a POST via `fetch` + `ReadableStream` — never
   `EventSource`, and never buffer the whole response before rendering.
5. `components/ui/` primitives are generated via the shadcn CLI and not hand-edited;
   compose feature components around them.
6. Secrets never appear in `NEXT_PUBLIC_*` or in client bundles (the OAuth **client id**
   is public and may; the **secret** may not).
7. Indexing-status polling stops on a terminal state (`COMPLETED`/`FAILED`) and on
   unmount — no unbounded intervals.
8. Every backend installation/repo call is access-checked against the session user;
   `installation_id` is never trusted as a bare capability.
9. Before writing Next-16-specific code, consult `node_modules/next/dist/docs/` (the
   `AGENTS.md` rule) — do not assume pre-16 App Router behavior.
