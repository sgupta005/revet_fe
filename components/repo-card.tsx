"use client"

import { LoaderCircle, MessageSquare } from "lucide-react"
import Link from "next/link"

import { StatusBadge } from "@/components/status-badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useIndexingStatus } from "@/hooks/use-indexing-status"
import { cn } from "@/lib/utils"
import type { IndexingStatus } from "@/lib/types"

const DESCRIPTIONS: Record<IndexingStatus, string> = {
  NOT_STARTED: "Not indexed yet — index it to start chatting.",
  INDEXING: "Indexing… this can take a moment.",
  COMPLETED: "Indexed and ready to chat.",
  FAILED: "Indexing failed.",
}

export function RepoCard({
  fullName,
  initialStatus,
}: {
  fullName: string
  initialStatus: IndexingStatus
}) {
  const { status, pending, error, triggerIndex } = useIndexingStatus(
    fullName,
    initialStatus
  )
  const [owner, repo] = fullName.split("/")
  const isIndexing = status === "INDEXING"
  const isCompleted = status === "COMPLETED"
  const chatHref = `/repos/${fullName}/chat`

  return (
    <Card className="h-full gap-3">
      <CardHeader>
        <CardTitle className="min-w-0 truncate text-sm font-normal">
          <Link href={chatHref} className="hover:underline">
            <span className="text-muted-foreground">{owner}/</span>
            <span className="font-medium">{repo}</span>
          </Link>
        </CardTitle>
        <CardAction>
          <StatusBadge status={status} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        <p
          className={cn(
            "text-xs",
            error ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {error ?? DESCRIPTIONS[status]}
        </p>
      </CardContent>

      <CardFooter className="gap-2">
        {isCompleted ? (
          <>
            <Link
              href={chatHref}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              <MessageSquare />
              Open chat
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={triggerIndex}
              disabled={pending}
            >
              Re-index
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant={status === "FAILED" ? "outline" : "default"}
            onClick={triggerIndex}
            disabled={pending || isIndexing}
          >
            {isIndexing ? <LoaderCircle className="animate-spin" /> : null}
            {isIndexing
              ? "Indexing…"
              : status === "FAILED"
                ? "Retry"
                : "Index"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
