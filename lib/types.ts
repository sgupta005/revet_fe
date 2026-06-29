// Shared API/domain types. Shapes mirror the backend contract in
// `context/architecture.md` §Backend API contract — finalize with the backend.

export type User = {
  id: number
  github_id: number
  login: string
  avatar_url: string
}

export type InstallationAccountType = "User" | "Organization"

export type Installation = {
  id: number // GitHub installation id
  account_login: string
  account_type: InstallationAccountType
}

export type Me = {
  user: User
  installations: Installation[]
}

export type CreateSessionResponse = {
  session_token: string
  user: User
}

export type IndexingStatus = "NOT_STARTED" | "INDEXING" | "COMPLETED" | "FAILED"

export type Repository = {
  full_name: string
  indexing_status: IndexingStatus
}

export type IndexStatusResponse = {
  full_name: string
  indexing_status: IndexingStatus
  chunk_count: number
}

export type ChatRole = "user" | "assistant"

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

// Frames the backend `/chat` SSE stream emits as `data: {...}` lines: a leading
// `thread_id` (the conversation key), `delta` text chunks, then a terminal `done`.
// Citations are inline in the `delta` text, not a structured field.
export type ChatStreamFrame =
  | { thread_id: string }
  | { delta: string }
  | { done: true }
