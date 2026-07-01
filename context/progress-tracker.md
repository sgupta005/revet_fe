# Frontend Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

Phase 3 — Chat (complete).

## Current Goal

Phase 4 — Polish.

## Completed

- **Reviews tool — PR-review activity feed** (2026-07-01)
  - Decision: don't rebuild GitHub's PR review UI in-app and don't go CodeRabbit-complex —
    the review is GitHub-native; the web surface adds *visibility that the agent ran*. So the
    "PR Review" nav placeholder becomes a thin, read-only **"Reviews"** feed.
  - `components/workspace-nav.tsx`: `pulls` tool flipped `available: true`, relabeled
    "PR Review" → "Reviews" (dropped the "Soon" badge).
  - `app/repos/[owner]/[repo]/pulls/page.tsx`: Server Component fetching
    `getPullReviews(owner, repo)`; renders a list (PR #, GitHub state badge, relative time,
    "View on GitHub" deep-link) with an empty state. No client JS / polling / proxy handler;
    a fetch failure degrades to empty. Matches the base-lyra aesthetic (sharp corners, mono).
  - `lib/types.ts`: `PullReview` type. `lib/api.ts`: `getPullReviews()` (server fetch,
    forwards the session as Bearer like the other reads).
  - Backend dependency (built in tandem): `GET /repos/{owner}/{repo}/pulls` — access-checked
    list of `kind=review` PR rows + constructed `github_url`. No new persistence.
  - Deferred: in-app rendering of findings/severity (needs the backend to persist the review
    body/findings); proxy handler + polling (only if a live-refresh feed is wanted later).

- **Phase 6 (frontend) — Chat History** (2026-06-29)
  - **URL scheme:** `?thread={uuid}` loads a specific thread, `?thread=new` starts a
    blank conversation (skips auto-load), no param auto-loads the most recent thread from
    the API (falls back to localStorage, then API `/chat/threads` list, then blank).
  - `lib/types.ts`: added `ChatThread` type `{thread_id, title, created_at, updated_at}`.
  - `lib/api.ts`: added `getThreads(owner, repo)` and `getThreadMessages(threadId)` —
    same auth pattern as other credentialed server-side calls.
  - `app/api/repos/[owner]/[repo]/chat/threads/route.ts`: GET proxy → `getThreads`.
  - `app/api/chat/threads/[threadId]/route.ts`: GET proxy → `getThreadMessages`.
  - `hooks/use-chat-stream.ts`: added `initialThreadId` param; history loading
    (`loadHistory` via `/api/chat/threads/{id}`); `loadingHistory` state; `newThread()`
    now navigates to `?thread=new`; after the leading SSE `thread_id` frame on a new
    thread, calls `router.replace('?thread={id}')` to canonicalise the URL and trigger
    sidebar refresh.
  - `components/workspace-nav.tsx`: added `fullName` prop; when the active segment is
    `chat`, shows a chevron toggle to the right of the Chat label; expanded list fetches
    threads and re-fetches on `activeThreadId` change; max-h-48 scrollable thread list
    with "New thread" button at top, skeleton rows while loading, and per-thread title +
    relative time; active thread highlighted.
  - `app/repos/[owner]/[repo]/layout.tsx`: passes `fullName` to `WorkspaceNav`.
  - `app/repos/[owner]/[repo]/chat/page.tsx`: reads `searchParams.thread` (Next 16 async
    pattern) and passes as `initialThreadId` to `ChatPanel`.
  - `components/chat-panel.tsx`: accepts `initialThreadId`, shows skeleton while
    `loadingHistory`, uncommented "New Thread" header button.
  - Gates: `pnpm typecheck`, `pnpm lint` (0 errors, 2 pre-existing warnings), `pnpm build` pass.

- **Phase 3 (complete) — Streaming chat** (2026-06-28)
  - **Confirmed the backend `/chat` SSE contract** against `revet_be/app/chat.py`: a POST
    returning `text/event-stream`; frames are `data: {json}\n\n` in order —
    `{"thread_id": "…"}` (leading), then `{"delta": "…"}` text chunks, then
    `{"done": true}`. **Citations are inline in the `delta` markdown** (the generate
    prompt tells the model to "cite specific file paths and line ranges"); there is **no
    structured citation field**. This resolves the "Citation shape" open question — chips /
    code-peek are deferred until the backend emits structured citations.
  - `lib/types.ts`: `ChatRole`, `ChatMessage`, `ChatStreamFrame` (union of the three frames).
  - `lib/api.ts`: `chatStream({repo,message,thread_id})` returns the **raw streaming
    `Response`** (not parsed JSON like `request`) so the proxy can pipe the body through
    unbuffered (invariant #4); Bearer auth added server-side like every other call.
  - `app/api/repos/[owner]/[repo]/chat/route.ts`: same-origin streaming proxy (proxy
    method, like the index routes) — validates the body, forwards to the backend via
    `chatStream`, and returns `new Response(upstream.body, …)` with `text/event-stream`.
  - `hooks/use-chat-stream.ts`: client SSE consumer via `fetch` + `ReadableStream` reader
    (never `EventSource`); buffers partial frames across reads (`\n\n` split); persists
    `thread_id` in `localStorage` (`revet:thread:<full_name>`) for cross-reload continuity;
    `send`/`stop` (AbortController)/`newThread`; `401` → `/`.
  - Components: `components/chat-message.tsx` (pure bubble — user chip right, assistant
    full-width `whitespace-pre-wrap` + streaming cursor), `components/chat-composer.tsx`
    (auto-grow `<textarea>`, Enter sends / Shift+Enter newline, Stop mid-stream, disabled
    until indexed), `components/chat-panel.tsx` (client island: message list + auto-scroll,
    empty-state example prompts, "index first" banner when status ≠ COMPLETED, New thread).
  - `app/repos/[owner]/[repo]/chat/page.tsx`: server shell — fetches index status via
    `getIndexStatus` to gate the composer (degrades to `NOT_STARTED` on error), renders
    `ChatPanel`. Replaces the Phase 3 placeholder.
  - Gates: `pnpm typecheck`, `pnpm build` pass; `pnpm lint` clean except the pre-existing
    `Geist_Mono` scaffold warning; `pnpm format` applied. Ran `next typegen` after adding
    the route handler so `RouteContext` resolves.

- **Phase 4 (partial) — Repo list as cards** (2026-06-28)
  - `components/repo-card.tsx` (client island) replaces `repo-row.tsx`: shadcn `Card`
    (title links to `…/chat`, `StatusBadge` in `CardAction`, status-derived description,
    error in `text-destructive`). Footer action by status — `COMPLETED` → "Open chat"
    (primary `Link` via `buttonVariants`) + "Re-index" (ghost); else Index / Indexing… /
    Retry. Reuses `useIndexingStatus` unchanged.
  - `app/repos/page.tsx`: `<ul>` list → responsive card grid
    (`grid gap-3 sm:grid-cols-2 lg:grid-cols-3`); `Shell` widened `max-w-2xl` → `max-w-5xl`.
  - `card` added via shadcn CLI; `components/repo-row.tsx` deleted (no remaining refs).
  - **Refinements:** equal card heights (`Card h-full` + `CardContent flex-1` so footers
    bottom-align in the stretch grid); single-installation `InstallationSwitcher` now renders
    `null` (account already in the heading); header sign-out button replaced by
    `components/user-menu.tsx` — shadcn `Avatar` (GitHub `avatar_url`, initials fallback) +
    login as a `DropdownMenu` trigger, menu shows login + a destructive **Sign out** item
    (calls the `signOut` server action via `onClick`). `Shell` takes an optional `user`.
    `avatar`/`dropdown-menu` added via shadcn CLI.
  - Gates: `typecheck`/`build` pass; `lint` clean except the pre-existing `Geist_Mono` warning.

- **Phase 3 (start) — Per-repo workspace shell + nav** (2026-06-27)
  - **Decision: the repo route is a workspace, not a chat page.** Future tools (PR
    review, issue analysis, auto-PR/rules) are per-repo, so `/repos/[owner]/[repo]` is a
    shell with a left tool nav; adding a feature = flip `available` + create the sibling
    route. No redesign.
  - `app/repos/[owner]/[repo]/layout.tsx`: Server Component shell — `requireSession`,
    `SidebarProvider` (defaultOpen from the `sidebar_state` cookie) + shadcn `Sidebar`
    (`collapsible="icon"`), `SidebarInset` with a header (`SidebarTrigger` + owner/repo
    breadcrumb + "View on GitHub"). Wrapped in `TooltipProvider` (SidebarProvider doesn't
    include it) for collapsed-rail tooltips.
  - `components/workspace-nav.tsx`: client island — `useSelectedLayoutSegment()` drives
    `isActive`; static `TOOLS` list (Chat available; PR Review/Issues/Rules/Settings shown
    disabled with a "Soon" `SidebarMenuBadge`). Nav links via the Base UI **`render` prop**
    (`render={<Link/>}`) — this shadcn variant has no `asChild`.
  - `app/repos/[owner]/[repo]/page.tsx`: redirects to `./chat` (workspace opens on Chat).
  - `app/repos/[owner]/[repo]/chat/page.tsx`: placeholder; real streaming chat is the rest
    of Phase 3.
  - `components/repo-row.tsx`: repo name now links to `/repos/<full_name>/chat` (workspace
    reachable from the list).
  - **shadcn sidebar added via CLI** (`pnpm dlx shadcn add sidebar`): pulled
    `components/ui/{sidebar,sheet,tooltip,input,separator,skeleton}.tsx` + `hooks/use-mobile.ts`.
  - `eslint.config.mjs`: ignore CLI-generated surfaces (`components/ui/**`,
    `hooks/use-mobile.ts`) — `use-mobile.ts` trips `react-hooks/set-state-in-effect`; not
    hand-edited (invariant #5).
  - Gates: `pnpm typecheck`, `pnpm build` pass; `pnpm lint` clean except the pre-existing
    `Geist_Mono` scaffold warning. **Run `next typegen` (or build) after adding routes** —
    stale `.next/dev/types` otherwise fails typecheck on `params`.

- **Phase 2 — Repo List & Indexing** (2026-06-27)
  - `lib/types.ts`: `IndexingStatus`, `Repository`, `IndexStatusResponse`.
  - `lib/api.ts`: `listRepositories(installationId, refresh?)`, `indexRepository`,
    `getIndexStatus`. Added a `redirectOnAuthError` request option — the proxy-facing
    calls (`indexRepository`/`getIndexStatus`) set it `false` so a `401` surfaces to the
    client instead of redirecting an XHR; `listRepositories`/`getMe` keep the redirect.
  - **Client→backend auth via the proxy method** (chosen over shared-cookie-domain).
    Same-origin Route Handlers `app/api/repos/[owner]/[repo]/index/route.ts` (POST → 202)
    and `.../index-status/route.ts` (GET): the browser sends the `httpOnly` cookie to the
    Next server, which forwards it to the backend as a Bearer header via `lib/api`.
  - `hooks/use-indexing-status.ts`: owns a repo's live status; `triggerIndex` POSTs the
    proxy and polls the status proxy every 3s **only while `INDEXING`**, stopping on a
    terminal state / unmount (invariant #7); redirects to `/` on a `401`.
  - `components/status-badge.tsx` (pure), `components/repo-row.tsx` (client island:
    badge + Index/Re-index button + polling), `components/installation-switcher.tsx`
    (Server Component; links per installation, URL state `?installation=<id>`).
  - `app/repos/page.tsx`: Server Component — `requireSession` + `getMe`; installation
    switcher; per-installation repo list via `listRepositories`; **Refresh** (`?refresh=1`)
    and **Manage on GitHub** links; explicit empty states (no installations →
    `installApp`; no repos → `buildManageInstallationUrl`) and error states.
  - `app/actions.ts`: added `installApp` (sets `state`, redirects to the install URL);
    `lib/github.ts`: added `buildManageInstallationUrl`.
  - Link-styled actions use `buttonVariants` (the shadcn/base-ui `Button` here has **no
    `asChild`**). Gates pass: `pnpm typecheck`, `pnpm lint` (one pre-existing scaffold
    warning), `pnpm build`. Note: route `RouteContext` types need `next typegen`/build
    after adding Route Handlers.
  - **Gap 1 (webhook-populated `Repository` rows)** handled by the user via **ngrok**
    forwarding so installation webhooks reach the backend; no on-demand-upsert change made.

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

- **Phase 6 (partial) — Chat History frontend** (2026-06-29)
  - Awaiting backend Phase 6 (ChatThread DB model + new endpoints) to be fully testable end-to-end.
  - Frontend changes are complete and build cleanly; see Completed below.

## Next Up

1. **Phase 8 (frontend) — Issues activity feed** (near-term; tracks backend Phase 8 —
   Issue Analysis). See "Planned frontend surfaces" below.
2. **Phase 11 (frontend) — Rules CRUD UI** (before Polish; tracks backend Phase 11 —
   Custom Rules CRUD API). See "Planned frontend surfaces" below.
3. **Phase 4 — Polish** (loading/error/empty consistency, theme toggle, responsive,
   accessibility pass, refined installation switcher).
4. **Rich answer rendering (deferred from Phase 3).** Assistant text currently renders as
   `whitespace-pre-wrap` plain text — faithful to the inline-citation stream but no
   markdown/code-block formatting. Adding a markdown renderer is a **dependency**; raise it
   here before adding (workflow rule). Structured citation **chips + code-peek panel**
   (architecture §Chat page) wait on the backend emitting a structured citation field.
5. **Phase 14 (frontend) — Install / uninstall repos from the repos page** (post-v1;
   tracks backend Phase 14). See "Planned frontend surfaces" below.

## Planned frontend surfaces (backend-driven)

These are frontend counterparts to specific backend phases; labelled by their backend
phase number to match the existing convention ("Phase 6 (frontend) — Chat History", the
Reviews feed for backend Phase 7). Each waits on its backend dependency.

- **Phase 8 (frontend) — Issues activity feed** *(tracks backend Phase 8 — Issue
  Analysis; near-term)* — a thin, read-only **"Issues"** feed that mirrors the existing
  **"Reviews"** feed exactly. The issue analysis itself is GitHub-native (the bot comments
  on the issue); the web surface only adds *visibility that the agent ran*.
  - `components/workspace-nav.tsx`: flip the disabled `issues` tool `available: true`,
    drop its "Soon" badge (keep the "Issues" label).
  - `app/repos/[owner]/[repo]/issues/page.tsx`: Server Component fetching
    `getIssueAnalyses(owner, repo)`; renders a list (issue #, GitHub state badge, relative
    time, "View on GitHub" deep-link) with an empty state. No client JS / polling / proxy;
    a fetch failure degrades to empty. base-lyra aesthetic (sharp corners, mono).
  - `lib/types.ts`: `IssueAnalysis` type. `lib/api.ts`: `getIssueAnalyses()` (server
    fetch, forwards the session as Bearer like the other reads).
  - **Backend dependency (cross-repo):** needs `GET /repos/{owner}/{repo}/issues` —
    access-checked list of `Issue` activity rows + constructed `github_url` (the mirror of
    `GET /repos/{owner}/{repo}/pulls`). This endpoint is **not** in backend Phase 8 as
    currently scoped — flag it, exactly as the Reviews feed endpoint was added separately
    after backend Phase 7.
  - Deferred: in-app rendering of the analysis (suggested files / approach) — needs the
    backend to persist the analysis body; polling / live refresh.

- **Phase 11 (frontend) — Rules CRUD UI** *(tracks backend Phase 11 — Custom Rules CRUD
  API; before Polish)* — a **per-repo** workspace tool to create/read/update/delete the
  repo's custom review rules (the guidelines the bot enforces in PR review, issue analysis,
  and auto-PR). Rules are **per-repo** (decision 2026-07-02; backend `Rule` moved to a
  `repository_id` FK) — the existing per-repo "Rules" nav placeholder now matches the data
  scope exactly, no cross-installation caveat needed.
  - `components/workspace-nav.tsx`: flip the disabled `rules` tool `available: true`, drop
    its "Soon" badge.
  - `app/repos/[owner]/[repo]/rules/page.tsx`: server shell (`requireSession`) + a client
    island for the CRUD form/list (create, inline edit, delete). This is a **mutating** tool,
    so it needs same-origin proxy Route Handlers under `app/api/repos/[owner]/[repo]/rules/...`
    (the proxy method — `httpOnly` cookie → Bearer), unlike the read-only Reviews/Issues feeds.
  - `lib/types.ts`: `Rule` type `{id, content, created_at, updated_at}`. `lib/api.ts`:
    `getRules` / `createRule` / `updateRule` / `deleteRule`.
  - **Backend dependency:** backend Phase 11 endpoints (`GET`/`POST /repos/{owner}/{repo}/rules`,
    `PUT`/`DELETE /repos/{owner}/{repo}/rules/{rule_id}`, access-checked).

- **Phase 14 (frontend) — Install / uninstall repos from the repos page** *(tracks backend
  Phase 14; post-v1)* — let the user add/remove repos directly from the repos page
  (`/repos`, the post-sign-in home) instead of bouncing to GitHub each time. Today
  `app/repos/page.tsx` only offers "Manage on GitHub" / "Refresh" / `installApp` links.
  - Add a per-repo **Remove** action and an **Add repo** affordance on `app/repos/page.tsx`.
    After add → reuse the existing index action to enqueue indexing; after remove → drop the
    repo from the list.
  - New `lib/api.ts` calls + same-origin proxy Route Handlers under `app/api/...` (the proxy
    method, like the index routes) so the `httpOnly` cookie is forwarded to the backend as
    Bearer. These wrap the backend Phase 13 endpoints (which call GitHub
    `PUT`/`DELETE /user/installations/{id}/repositories/{repo_id}` via `call_with_refresh`).
  - **Feasibility limits the UI must handle** (confirmed with backend): in-app add/remove
    only works when the installation is in **"only selected repositories"** mode and the user
    has admin access. Creating the **first** installation on an account, and switching an
    installation between "all repos" ↔ "selected repos" mode, still require the GitHub
    redirect. So: in-app add/remove for existing selected-repos installations, and fall back
    to the existing "Manage on GitHub" / `installApp` links for first-time install / all-repos
    installations.
  - **Backend dependency (cross-repo):** backend Phase 14 endpoints (post-v1).

## Open Questions / Pending Decisions

- ~~**Auth backend doesn't exist yet.**~~ **Resolved** — `revet_be` implemented
  `/auth/session`, `/auth/logout`, `/me`, the user record, Redis session store, OAuth
  config, and the GitHub App OAuth setup. Contract reconciled (see Completed → backend
  contract reconciled). Backend reads `Authorization: Bearer` or a `session` cookie; the FE
  forwards Bearer.
- ~~**Client→backend auth.**~~ **Resolved (proxy method).** Client-side calls go through
  same-origin Next Route Handlers under `app/api/...` that read the `httpOnly` cookie and
  forward a Bearer header to the backend (Phase 2: index + status). Phase 3 chat SSE reuses
  this via an `/api/chat` streaming proxy. Shared-cookie-domain rejected.
- **Callback placement (deployment).** Frontend `/connected` Route Handler forwards the
  code to the backend (keeps the session cookie first-party) vs. backend owns the callback
  and sets a cookie on a shared parent domain. Decide based on deployment topology —
  `github-integration.md` §"Why the callback lands on the frontend".
- **User-token lifetime.** Expiring (8h) + refresh token (6mo) vs. non-expiring GitHub App
  user tokens. Backend supports refresh (`call_with_refresh` in `app/auth/dependencies.py`).
- ~~**Repo-list source.**~~ **Resolved & wired (Phase 2).** Backend joins live installation
  repos with stored `Repository` rows; `?refresh=1` re-pulls. `Repository` =
  `{ full_name, indexing_status }`. Caveat: index/index-status 404 without a stored row
  (webhook-created) — accepted, handled via ngrok webhook forwarding in dev.
- ~~**Citation shape.**~~ **Resolved (inline).** The `/chat` stream emits only
  `thread_id`/`delta`/`done`; citations are **inline in the `delta` markdown** (the model
  is prompted to cite file paths + line ranges), not a structured field. The chat UI
  renders assistant text verbatim. Structured chips/code-peek are deferred until the
  backend surfaces a structured citation field.
- ~~**`thread_id` scheme.**~~ **Resolved & wired.** The **backend** mints the `thread_id`
  (returns it in the leading SSE frame); the client persists it per-repo in localStorage
  (`revet:thread:<full_name>`) and replays it on the next turn. New thread = clear the key.

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
