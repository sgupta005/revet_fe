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
