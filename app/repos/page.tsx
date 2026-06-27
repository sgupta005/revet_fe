// Minimal authenticated landing for Phase 1 (sign-in). Phase 2 replaces this
// with the installation switcher + repo list with indexing status.

import { LogOut } from "lucide-react"

import { signOut } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { getMe } from "@/lib/api"
import { requireSession } from "@/lib/session"
import type { Me } from "@/lib/types"

export default async function ReposPage() {
  await requireSession()

  let me: Me | null = null
  let error = false
  try {
    me = await getMe()
  } catch {
    error = true
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Repositories</h1>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut />
            Sign out
          </Button>
        </form>
      </header>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load your account. Please try again.
        </p>
      ) : me ? (
        <section className="flex flex-col gap-2 text-sm">
          <p>
            Signed in as <span className="font-medium">{me.user.login}</span>.
          </p>
          <p className="text-muted-foreground">
            {me.installations.length} installation
            {me.installations.length === 1 ? "" : "s"} available. The repository
            list arrives in Phase 2.
          </p>
        </section>
      ) : null}
    </main>
  )
}
