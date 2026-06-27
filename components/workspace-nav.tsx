"use client"

import {
  CircleDot,
  GitPullRequest,
  ListChecks,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
  { segment: "pulls", label: "PR Review", icon: GitPullRequest, available: false },
  { segment: "issues", label: "Issues", icon: CircleDot, available: false },
  { segment: "rules", label: "Rules", icon: ListChecks, available: false },
]

export function WorkspaceNav({ basePath }: { basePath: string }) {
  const segment = useSelectedLayoutSegment()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu>
        {TOOLS.map((tool) => {
          const Icon = tool.icon

          if (!tool.available) {
            return (
              <SidebarMenuItem key={tool.segment}>
                <SidebarMenuButton disabled tooltip={`${tool.label} — coming soon`}>
                  <Icon />
                  <span>{tool.label}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>Soon</SidebarMenuBadge>
              </SidebarMenuItem>
            )
          }

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
