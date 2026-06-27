# Revet Frontend — Project Overview

## Overview

The web frontend for **Revet**, an AI-powered GitHub assistant. The backend
(`revet_be`) is a self-hosted GitHub App that indexes repositories (Tree-sitter
chunking → pgvector embeddings) and exposes AI capabilities — chat with codebase,
PR review, issue analysis, auto-PR — orchestrated with LangGraph. The backend v1
ships headless (webhooks + a streaming `/chat` endpoint). This repo (`revet_fe`)
is the web UI that puts a human-facing surface on top of it.

The frontend's job is to let a user **sign in with GitHub, see their repos, index
them, and chat with their codebase** — all from the browser, on top of lightweight
GitHub OAuth (no passwords, no separate accounts system).

## Goals

1. Sign users in with GitHub (OAuth) and show the repositories they can act on —
   discovered via their installations, gated by a real session.
2. Let users trigger indexing of a repo and watch its status reach `COMPLETED`.
3. Let users chat with an indexed repo and get grounded, streamed answers that cite
   specific code locations (path, symbol, line range).
4. Stay thin: the frontend holds almost no business logic — it renders backend state
   and streams backend responses. All AI lives in `revet_be`.

## Core User Flow (v1)

1. User lands on the app and clicks **Sign in with GitHub**.
2. They authorize Revet (and, if it's their first time, install the Revet GitHub App on
   the repos they choose — one combined redirect).
3. GitHub redirects back with an OAuth `code`; the backend exchanges it for a user token
   and creates a server session, and the frontend stores only an opaque session cookie
   (see `github-integration.md`).
4. The frontend lists the user's installations and the repositories in the selected one,
   each showing its indexing status.
5. User clicks **Index** on a repo → the backend (session-gated) enqueues indexing → the
   UI polls status until `COMPLETED`.
6. User opens an indexed repo and **chats** with it; answers stream token-by-token
   and reference specific files and line ranges.

## Features (priority order)

### F1 — GitHub OAuth Sign-in — **Priority 1, enabler**
- "Sign in with GitHub" → OAuth authorize (combined with app installation for new users)
  → callback exchanges the `code` for a user token and creates a server session.
- The browser holds only an opaque, `httpOnly` session cookie; user tokens stay
  server-side. Identity comes from GitHub — no passwords or separate accounts.
- Detail, the dual-token model, and the flow in `github-integration.md`.

### F2 — Repository List & Indexing — **Priority 1**
- Show the user's installations and the repos in the selected one (discovered via the
  user token), each with indexing status badges
  (`NOT_STARTED · INDEXING · COMPLETED · FAILED`).
- "Index" / "Re-index" action triggers a session-gated backend job; UI polls and
  reflects status.
- Empty state ("app not installed for you yet" / few repos) links the user to install or
  expand repo access on GitHub.

### F3 — Chat with Codebase — **Priority 1**
- Per-repo chat page. Messages stream over SSE from the (session-gated) backend `/chat`
  endpoint.
- Render grounded citations (path · symbol · line range) the backend surfaces.
- Conversation memory is keyed by a `thread_id` the frontend manages per repo/session.

### F4 — Polish (loading / error / empty / theming) — **Priority 2**
- Consistent loading, error, and empty states; dark/light theming (`next-themes`);
  responsive layout; an installation switcher.

## Scope

### In scope (v1)
- GitHub OAuth sign-in (combined with app installation) + server session.
- Installation + repo discovery via the user token, with indexing status, and an
  index/re-index action.
- Streaming chat UI against the backend `/chat` SSE endpoint.
- A typed, credentialed backend API client and the env config to point at the backend.
- Theming, loading/error/empty states, responsive layout, installation switcher.

### Out of scope (v1)
- Passwords, email/password accounts, or any identity provider other than GitHub.
- PR review, issue analysis, auto-PR, and custom-rules UIs (backend features that
  don't yet need a frontend surface — add later).
- Billing, org/team management, fine-grained RBAC beyond per-installation access checks.
- Server-side persistence owned by the frontend (the frontend stores no data of its
  own beyond the opaque session cookie and per-repo `thread_id`s; user/refresh tokens
  live in the backend session store).

## Backend dependency (contract)

The frontend needs REST endpoints the backend does not yet expose (the backend v1 is
webhook-only plus `/chat`). These are a **cross-repo dependency** tracked in
`architecture.md` §Backend API contract:
- OAuth session exchange + logout, and a `/me` endpoint (user + their installations).
- List repositories for an installation (session-gated, ownership-checked).
- Trigger indexing for a repo + read its status (session-gated).
- `/chat` already exists (SSE) and is reused, now session-gated.
- CORS must allow the frontend origin **with credentials**.

## Success Criteria

1. Clicking "Sign in with GitHub", authorizing (and installing on first run), and
   returning lands the user on a list of their installations and repos — authenticated.
2. Clicking "Index" moves a repo's status to `INDEXING` and then `COMPLETED` in the UI
   without a manual refresh.
3. Asking a question on an indexed repo streams a grounded answer that cites at least
   one specific code location.
4. A second person cannot list, index, or chat an installation they don't have access to
   — every endpoint verifies the session user against the target installation.
