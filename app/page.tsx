import { GitBranch } from "lucide-react"
import { redirect } from "next/navigation"

import { signIn } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { isLoggedIn } from "@/lib/session"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await isLoggedIn()) redirect("/repos")
  const { error } = await searchParams

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Sign in with GitHub to index your repositories and chat with your
            codebase.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        ) : null}
        <form action={signIn}>
          <Button type="submit" size="lg" className="w-full">
            <GitBranch />
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </main>
  )
}
