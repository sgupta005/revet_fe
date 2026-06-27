# Frontend Code Standards

## General

- The frontend is a thin client of `revet_be`. Keep business/AI logic on the backend;
  the UI renders backend state and streams backend responses.
- Fix root causes; no workarounds or compatibility shims layered on top.
- One concern per file/component. Don't mix data fetching, layout, and unrelated state.
- No comments explaining *what* the code does — add one only when the *why* is
  non-obvious (a Next 16 quirk, an SSE parsing edge case, a hydration constraint).
- No features, abstractions, or error handling beyond what the current task needs. No
  speculative state managers, data-fetching libraries, or generic "frameworks".
- Validate/normalize data only at the boundary (backend responses, URL/query params,
  GitHub callback params); trust internal typed values.

## Next.js 16 (read first)

- **This is not the Next.js in your training data.** Per `AGENTS.md`, **read the relevant
  guide in `node_modules/next/dist/docs/` before writing** routing, data-fetching,
  route-handler, server-action, caching, or `cookies()`/`headers()` code. Heed
  deprecation notices.
- **Server Components by default.** Add `"use client"` only for interactivity, hooks,
  browser APIs, or streaming. Keep client components as leaf "islands"; don't mark a
  whole page client just to make one button work.
- Read request state (`cookies()`, `headers()`, params) with the framework's current
  async conventions — confirm against the bundled docs rather than assuming.
- Keep `app/` files focused: `page.tsx`/`layout.tsx` compose; move logic into
  `components/`, `hooks/`, and `lib/`.

## TypeScript

- `strict` is on. **No `any`** — type every API response and component prop.
- Centralize shared/domain and API types in `lib/types.ts`; import, don't redeclare.
- Parse backend responses into typed shapes in `lib/api.ts`; components receive typed
  data, never raw `Response`/`unknown`.
- Prefer `type` aliases for props and API shapes; reserve `interface` for extension.

## Data fetching & the API client

- All backend calls go through **`lib/api.ts`** — a small typed client reading the base
  URL from env (`API_BASE_URL` on the server, `NEXT_PUBLIC_API_BASE_URL` on the client)
  and sending credentials (the session cookie: `credentials: "include"` client-side,
  forwarded `cookie` header server-side). No raw `fetch` to the backend scattered in
  components. On `401`, redirect to sign-in.
- Server Components fetch initial data (repo list, repo shell). Client components handle
  mutations (index trigger), polling (status), and streaming (chat).
- No react-query/SWR in v1. If caching/invalidation pressure appears, raise it in
  `progress-tracker.md` before adding a dependency.
- Handle the three non-happy states explicitly everywhere data loads: **loading,
  error, empty**. An empty repo list links the user to grant repos on GitHub.

## Streaming (chat SSE)

- The backend `/chat` is a **POST that returns SSE** → use `fetch()` + a
  `ReadableStream` reader. **Never `EventSource`** (it's GET-only).
- Parse `data: {...}` frames line-by-line; append `{"delta": "..."}` chunks to the
  in-progress message and stop on the terminal `{"done": true}`. Buffer partial lines
  across reads — a frame can split across chunks.
- Render incrementally as deltas arrive; never wait for the full response.
- Always handle stream abort/unmount (cancel the reader) and network errors mid-stream.

## Components & styling

- **Primitives in `components/ui/` come from the shadcn CLI** (style `base-lyra`, base
  `@base-ui/react`) — generate/update them via the CLI; **don't hand-edit** them. Build
  feature components by composing these primitives.
- Tailwind v4: theme tokens live in `app/globals.css` (`@theme`). Use utility classes;
  use the `cn()` helper (`lib/utils.ts`) for conditional/merged classes. Avoid ad-hoc
  inline styles and one-off CSS files.
- Theming via `next-themes` (`components/theme-provider.tsx`); respect the token
  variables — don't hardcode hex colors that bypass the theme.
- Icons from `lucide-react`.
- Accessibility is not optional: semantic elements, labels on inputs, keyboard-usable
  interactive elements, visible focus.

## Naming & files

- Files in `components/`, `hooks/`, `lib/` are **kebab-case** (`repo-card.tsx`,
  `use-chat-stream.ts`). React components are **PascalCase**; hooks are `useThing`.
- Co-locate a component's small helpers; promote to `lib/` only when shared.
- Use the `@/*` path alias (configured in `tsconfig.json`) — no deep relative chains.

## Security & secrets

- **No secrets in `NEXT_PUBLIC_*`** or anywhere in the client bundle. The frontend holds
  no GitHub App private key, webhook secret, OAuth **client secret**, or model API keys —
  those are backend-only. (The OAuth **client id** is public and may be a `NEXT_PUBLIC_*`.)
- **User and refresh tokens never reach the browser** — the backend keeps them in its
  session store; the browser holds only the opaque `httpOnly` session cookie.
- The session cookie is `httpOnly` + `Secure` + `SameSite=Lax` and is set by the backend
  (via the `/connected` Route Handler). Don't try to read it from client JS.
- Generate and validate the `state` (CSRF) param on the OAuth `/connected` callback
  before forwarding the `code` for exchange.

## State

- Identity lives in the **session cookie** (backend-issued, `httpOnly`). Server Components
  read it via `cookies()` and forward it; client code relies on the browser sending it.
  Don't store identity in localStorage.
- **Active installation** is a UI selection (the user may have several) — remember the
  last choice in a readable cookie or the URL; it's not identity, so the backend
  re-verifies access on every call.
- `thread_id` per repo persists in localStorage so a conversation survives reload.
- No global store in v1. Lift state only as far as needed; prefer URL/route state for
  navigable selections (active installation, active repo).

## Quality gates

- `pnpm typecheck`, `pnpm lint`, and `pnpm format` must pass before a change is "done".
- Keep components renderable in isolation (clear props, no hidden globals).

## File organization

- `app/` — routes, layouts, route handlers (composition only).
- `components/` — feature components; `components/ui/` — generated primitives.
- `hooks/` — reusable client hooks (`use-chat-stream`, `use-indexing-status`).
- `lib/` — `api.ts` (credentialed backend client), `github.ts` (authorize/install URL +
  callback parsing), `session.ts` (server-side session-cookie read / logged-in guard),
  `types.ts`, `utils.ts`.
