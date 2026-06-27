"use client"

import { LoaderCircle } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { useIndexingStatus } from "@/hooks/use-indexing-status"
import type { IndexingStatus } from "@/lib/types"

export function RepoRow({
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
  const isIndexing = status === "INDEXING"

  return (
    <li className="flex items-center justify-between gap-4 border-b border-border py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-medium">{fullName}</span>
        <StatusBadge status={status} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={triggerIndex}
          disabled={pending || isIndexing}
        >
          {isIndexing ? <LoaderCircle className="animate-spin" /> : null}
          {isIndexing
            ? "Indexing…"
            : status === "NOT_STARTED"
              ? "Index"
              : "Re-index"}
        </Button>
      </div>
    </li>
  )
}
