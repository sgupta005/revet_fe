import { CircleDot, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getIssueAnalyses } from "@/lib/api"
import type { IssueAnalysis } from "@/lib/types"
import { cn, relativeTime } from "@/lib/utils"

// Server shell for the "Issues" tool: a read-only activity feed of the issues Revet
// has analyzed for this repo. The analysis itself lives on the GitHub issue (the bot
// comments there) — each row deep-links to it. The backend stores only the activity
// row (no analysis body), so the feed is deliberately thin, mirroring "Reviews". A
// failed fetch (repo not installed / no access) degrades to the empty state.
export default async function IssuesPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params

  let issues: IssueAnalysis[] = []
  try {
    issues = await getIssueAnalyses(owner, repo)
  } catch {
    // Leave empty — the page shows the "no analyses yet" state.
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-lg font-medium">
          <CircleDot className="h-5 w-5 text-primary" />
          Issues
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issues Revet has analyzed in {owner}/{repo}. The full analysis is
          posted as a comment on the issue — open it on GitHub to read it.
        </p>
      </div>

      {issues.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleDot />
            </EmptyMedia>
            <EmptyTitle>No analyses yet</EmptyTitle>
            <EmptyDescription>
              Revet hasn&apos;t analyzed any issues in this repository yet. Open
              an issue and the analysis will appear.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {issues.map((i) => (
            <li
              key={i.issue_number}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span className="font-medium">#{i.issue_number}</span>
              {/* state-driven tone: open=primary, closed=neutral */}
              <Badge
                className={cn(
                  "capitalize",
                  i.state === "open"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i.state}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                analyzed · {relativeTime(i.updated_at)}
              </span>
              <a
                href={i.github_url}
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
