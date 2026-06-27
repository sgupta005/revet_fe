import { ChevronLeft } from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"

import { WorkspaceNav } from "@/components/workspace-nav"
import { buttonVariants } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { requireSession } from "@/lib/session"
import { cn } from "@/lib/utils"

export default async function RepoWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ owner: string; repo: string }>
}) {
  await requireSession()
  const { owner, repo } = await params
  const basePath = `/repos/${owner}/${repo}`

  // Persist the expanded/collapsed choice across navigations (shadcn convention).
  const sidebarOpen =
    (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Back to repositories"
                  render={<Link href="/repos" />}
                >
                  <ChevronLeft />
                  <span className="font-medium">Revet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <WorkspaceNav basePath={basePath} />
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="All repositories"
                  render={<Link href="/repos" />}
                >
                  <ChevronLeft />
                  <span>All repositories</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <div className="flex min-w-0 items-baseline gap-1 text-sm">
              <Link
                href="/repos"
                className="text-muted-foreground hover:text-foreground"
              >
                {owner}
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="truncate font-medium">{repo}</span>
            </div>
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "ml-auto"
              )}
            >
              View on GitHub
            </a>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
