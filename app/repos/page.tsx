import { ExternalLink, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"

import { installApp } from "@/app/actions"
import { InstallationSwitcher } from "@/components/installation-switcher"
import { RepoCard } from "@/components/repo-card"
import { UserMenu } from "@/components/user-menu"
import { Button, buttonVariants } from "@/components/ui/button"
import { getMe, listRepositories } from "@/lib/api"
import { buildManageInstallationUrl } from "@/lib/github"
import { requireSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import type { Me, Repository, User } from "@/lib/types"

export default async function ReposPage({
  searchParams,
}: {
  searchParams: Promise<{ installation?: string; refresh?: string }>
}) {
  await requireSession()
  const { installation, refresh } = await searchParams

  let me: Me
  try {
    me = await getMe()
  } catch {
    return (
      <Shell>
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load your account. Please try again.
        </p>
      </Shell>
    )
  }

  if (me.installations.length === 0) {
    return (
      <Shell user={me.user}>
        <div className="flex flex-col items-start gap-3 rounded-md border border-border p-6">
          <p className="text-sm font-medium">Revet isn&apos;t installed yet</p>
          <p className="text-sm text-muted-foreground">
            Install the Revet GitHub App on the repositories you want to index
            and chat with.
          </p>
          <form action={installApp}>
            <Button type="submit" size="sm">
              <Plus />
              Install Revet
            </Button>
          </form>
        </div>
      </Shell>
    )
  }

  const requested = installation ? Number(installation) : NaN
  const active =
    me.installations.find((i) => i.id === requested) ?? me.installations[0]

  let repos: Repository[] | null = null
  let reposError = false
  try {
    repos = await listRepositories(active.id, refresh === "1")
  } catch {
    reposError = true
  }

  return (
    <Shell
      user={me.user}
      switcher={
        <InstallationSwitcher
          installations={me.installations}
          activeId={active.id}
        />
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Repositories in{" "}
          <span className="font-medium">{active.account_login}</span>
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={`/repos?installation=${active.id}&refresh=1`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <RefreshCw />
            Refresh
          </Link>
          <a
            href={buildManageInstallationUrl(active.id)}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ExternalLink />
            Manage on GitHub
          </a>
        </div>
      </div>

      {reposError ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t load repositories. Try refreshing.
        </p>
      ) : repos && repos.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <li key={repo.full_name}>
              <RepoCard
                fullName={repo.full_name}
                initialStatus={repo.indexing_status}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-border p-6">
          <p className="text-sm font-medium">No repositories here yet</p>
          <p className="text-sm text-muted-foreground">
            Grant Revet access to repositories in this installation on GitHub,
            then refresh.
          </p>
          <a
            href={buildManageInstallationUrl(active.id)}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ExternalLink />
            Add repositories
          </a>
        </div>
      )}
    </Shell>
  )
}

function Shell({
  children,
  switcher,
  user,
}: {
  children: React.ReactNode
  switcher?: React.ReactNode
  user?: User
}) {
  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium">Revet</h1>
        {user ? (
          <UserMenu login={user.login} avatarUrl={user.avatar_url} />
        ) : null}
      </header>
      {switcher}
      {children}
    </main>
  )
}
