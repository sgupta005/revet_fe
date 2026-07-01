"use client"

import {
  ChevronRight,
  CircleDot,
  GitPullRequest,
  ListChecks,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { ChatThread } from "@/lib/types"
import { relativeTime } from "@/lib/utils"

type Tool = {
  /** Route segment under /repos/[owner]/[repo]; null for the index (chat) route. */
  segment: string
  label: string
  icon: LucideIcon
  /** Built in v1; future tools are shown but disabled until their route exists. */
  available: boolean
}

// The per-repo tools. Adding a future feature = flip `available` and create the
// matching route at app/repos/[owner]/[repo]/<segment>/page.tsx — no nav rework.
const TOOLS: Tool[] = [
  { segment: "chat", label: "Chat", icon: MessageSquare, available: true },
  {
    segment: "pulls",
    label: "Reviews",
    icon: GitPullRequest,
    available: true,
  },
  { segment: "issues", label: "Issues", icon: CircleDot, available: true },
  { segment: "rules", label: "Rules", icon: ListChecks, available: true },
]

export function WorkspaceNav({
  basePath,
  fullName,
}: {
  basePath: string
  fullName?: string
}) {
  const segment = useSelectedLayoutSegment()
  const searchParams = useSearchParams()
  const activeThreadId = searchParams.get("thread")

  // null = not yet fetched, [] = fetched but no threads, [...] = existing threads
  const [threads, setThreads] = useState<ChatThread[] | null>(null)

  const fetchThreads = useCallback(async () => {
    if (!fullName) return
    try {
      const res = await fetch(`/api/repos/${fullName}/chat/threads`)
      if (!res.ok) {
        setThreads([])
        return
      }
      setThreads((await res.json()) as ChatThread[])
    } catch {
      setThreads([])
    }
  }, [fullName])

  // Fetch threads proactively when on the chat route so we know whether to show
  // the chevron. Re-fetch when activeThreadId changes to pick up newly-created threads.
  useEffect(() => {
    if (segment === "chat" && fullName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchThreads()
    }
  }, [segment, fullName, activeThreadId, fetchThreads])

  const hasThreads = threads !== null && threads.length > 0

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const isChat = tool.segment === "chat"

          if (!tool.available) {
            return (
              <SidebarMenuItem key={tool.segment}>
                <SidebarMenuButton
                  disabled
                  tooltip={`${tool.label} — coming soon`}
                >
                  <Icon />
                  <span>{tool.label}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>Soon</SidebarMenuBadge>
              </SidebarMenuItem>
            )
          }

          // Chat with existing threads — collapsible sub-list.
          // CollapsibleTrigger renders AS the SidebarMenuButton (via render prop) so
          // the chevron lives inside one unified element — no split backgrounds.
          if (isChat && hasThreads) {
            return (
              <SidebarMenuItem key={tool.segment}>
                <Collapsible
                  className="group/collapsible w-full"
                  defaultOpen={hasThreads}
                >
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        isActive={
                          segment === tool.segment &&
                          (!activeThreadId || activeThreadId === "new")
                        }
                        tooltip={tool.label}
                      />
                    }
                  >
                    <Icon />
                    <span>{tool.label}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="max-h-48 overflow-y-auto">
                      {threads.map((t) => (
                        <SidebarMenuSubItem key={t.thread_id}>
                          <SidebarMenuSubButton
                            isActive={activeThreadId === t.thread_id}
                            render={
                              <Link
                                href={`${basePath}/chat?thread=${t.thread_id}`}
                              />
                            }
                          >
                            <span className="flex-1 truncate">{t.title}</span>
                            <span className="ml-auto shrink-0 text-[10px] opacity-60">
                              {relativeTime(t.updated_at)}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            )
          }

          // Plain nav item (no threads, or non-chat tools).
          return (
            <SidebarMenuItem key={tool.segment}>
              <SidebarMenuButton
                isActive={segment === tool.segment}
                tooltip={tool.label}
                render={<Link href={`${basePath}/${tool.segment}`} />}
              >
                <Icon />
                <span>{tool.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
