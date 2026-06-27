import { MessageSquare } from "lucide-react"

// Placeholder — the streaming chat UI (message list, composer, citations) lands in
// Phase 3. This exists so the workspace shell + nav resolve and Chat is the default tool.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <MessageSquare className="size-6 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">Chat</p>
        <p className="text-sm text-muted-foreground">
          Ask questions about{" "}
          <span className="font-medium">
            {owner}/{repo}
          </span>
          . Streaming chat arrives in Phase 3.
        </p>
      </div>
    </div>
  )
}
