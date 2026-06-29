import { ChatPanel } from "@/components/chat-panel"
import { getIndexStatus } from "@/lib/api"
import type { IndexingStatus } from "@/lib/types"

// Server shell for F3: resolves the repo's indexing status (the composer is gated
// on COMPLETED) and hands the conversation to the client streaming island. A
// missing/unreadable status (e.g. no stored row yet) degrades to NOT_STARTED so
// the page still renders with the "index first" banner.
export default async function ChatPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  const fullName = `${owner}/${repo}`

  let status: IndexingStatus = "NOT_STARTED"
  try {
    status = (await getIndexStatus(owner, repo)).indexing_status
  } catch {
    // Leave NOT_STARTED — the panel shows the "index first" banner.
  }

  return <ChatPanel fullName={fullName} status={status} />
}
