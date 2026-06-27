import { cn } from "@/lib/utils"
import type { IndexingStatus } from "@/lib/types"

const STYLES: Record<IndexingStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  INDEXING: "bg-primary/10 text-primary",
  COMPLETED:
    "bg-[color-mix(in_oklch,var(--primary),transparent_85%)] text-primary",
  FAILED: "bg-destructive/10 text-destructive",
}

const LABELS: Record<IndexingStatus, string> = {
  NOT_STARTED: "Not started",
  INDEXING: "Indexing",
  COMPLETED: "Completed",
  FAILED: "Failed",
}

export function StatusBadge({ status }: { status: IndexingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  )
}
