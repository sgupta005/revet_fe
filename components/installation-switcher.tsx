import Link from "next/link"

import { cn } from "@/lib/utils"
import type { Installation } from "@/lib/types"

export function InstallationSwitcher({
  installations,
  activeId,
}: {
  installations: Installation[]
  activeId: number
}) {
  // A single installation needs no switcher UI; the active account is already
  // shown in the "Repositories in …" heading.
  if (installations.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Installations" className="flex flex-wrap gap-1">
      {installations.map((inst) => (
        <Link
          key={inst.id}
          href={`/repos?installation=${inst.id}`}
          aria-current={inst.id === activeId ? "page" : undefined}
          className={cn(
            "rounded-sm px-2.5 py-1 text-sm transition-colors",
            inst.id === activeId
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {inst.account_login}
        </Link>
      ))}
    </nav>
  )
}
