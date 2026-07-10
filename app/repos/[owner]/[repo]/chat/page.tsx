import { redirect } from "next/navigation"

import { ChatPanel } from "@/components/chat-panel"
import { getIndexStatus, getThreads } from "@/lib/api"
import type { IndexingStatus } from "@/lib/types"

// Server shell for F3: resolves the repo's indexing status (the composer is gated
// on COMPLETED) and hands the conversation to the client streaming island. A
// missing/unreadable status (e.g. no stored row yet) degrades to NOT_STARTED so
// the page still renders with the "index first" banner.
//
// `searchParams.thread` drives history loading in the client island:
//   - "<uuid>"  → load that thread's messages
//   - "new"     → blank new thread (skips auto-load of most recent)
//   - absent    → server redirects to the most recent thread (if any)
export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ owner: string; repo: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { owner, repo } = await params
  const { thread } = await searchParams
  const fullName = `${owner}/${repo}`

  // No thread selected — redirect to the most recent one server-side so the
  // client doesn't need a round-trip to discover it. redirect() must stay
  // outside the try/catch: it throws internally and catching it swallows it.
  if (!thread) {
    let threads: Awaited<ReturnType<typeof getThreads>> = []
    try {
      threads = await getThreads(owner, repo)
    } catch {
      // Fall through to empty state if the fetch fails.
    }
    if (threads.length > 0) {
      redirect(`?thread=${threads[0].thread_id}`)
    }
  }

  const initialThreadId = typeof thread === "string" ? thread : undefined

  let status: IndexingStatus = "NOT_STARTED"
  try {
    status = (await getIndexStatus(owner, repo)).indexing_status
  } catch {
    // Leave NOT_STARTED — the panel shows the "index first" banner.
  }

  return (
    <ChatPanel
      fullName={fullName}
      status={status}
      initialThreadId={initialThreadId}
    />
  )
}
