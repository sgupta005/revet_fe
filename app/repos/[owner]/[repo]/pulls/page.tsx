import { ExternalLink, GitPullRequest } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getPullReviews } from "@/lib/api"
import type { PullReview } from "@/lib/types"
import { cn, relativeTime } from "@/lib/utils"

// Server shell for the "Reviews" tool: a read-only activity feed of the PRs Revet
// has reviewed for this repo. The review itself lives on the GitHub PR — each row
// deep-links there. The backend stores only the activity row (no findings/title),
// so the feed is deliberately thin (see `context/architecture.md`). A failed fetch
// (repo not installed / no access) degrades to the empty state so the page renders.
export default async function PullsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params

  let reviews: PullReview[] = []
  try {
    reviews = await getPullReviews(owner, repo)
  } catch {
    // Leave empty — the page shows the "no reviews yet" state.
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-lg font-medium">
          <GitPullRequest className="h-5 w-5 text-primary" />
          Reviews
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pull requests Revet has reviewed in {owner}/{repo}. The full review is
          posted on the pull request — open it on GitHub to read it.
        </p>
      </div>

      {reviews.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitPullRequest />
            </EmptyMedia>
            <EmptyTitle>No reviews yet</EmptyTitle>
            <EmptyDescription>
              Revet hasn&apos;t reviewed any pull requests in this repository
              yet. Open a PR and the review will appear.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {reviews.map((r) => (
            <li key={r.pr_number} className="flex items-center gap-3 px-4 py-3">
              <span className="font-medium">#{r.pr_number}</span>
              {/* state-driven tone: open=primary, merged=muted primary, else neutral */}
              <Badge
                className={cn(
                  "capitalize",
                  r.state === "open"
                    ? "bg-primary/10 text-primary"
                    : r.state === "merged"
                      ? "bg-[color-mix(in_oklch,var(--primary),transparent_85%)] text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {r.state}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                reviewed · {relativeTime(r.updated_at)}
              </span>
              <a
                href={r.github_url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "gap-1.5"
                )}
              >
                View on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
