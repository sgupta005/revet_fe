"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import type { ChatStreamFrame } from "@/lib/types"
import { readSSEFrames } from "@/lib/sse"
import { threadKey, useLoadHistory } from "@/hooks/use-load-history"

// Consumes the same-origin `/api/.../chat` SSE proxy via `fetch` + a
// `ReadableStream` reader (never `EventSource` — POST-only; invariant #4). Frames
// are `data: {...}\n\n`; a frame can split across reads, so we buffer partial
// lines. The leading `thread_id` frame is persisted; `delta`s append to the live
// assistant message; `done` ends the turn.
//
// initialThreadId controls which thread to load on mount:
//   - undefined  → auto-load most recent thread from API; blank if none
//   - "new"      → blank state (user explicitly started a new conversation)
//   - "<uuid>"   → load that thread's history
export function useChatStream(fullName: string, initialThreadId?: string) {
  const { messages, setMessages, loadingHistory, loadHistory } = useLoadHistory(fullName)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  // When we create a new thread via streaming, we set this ref to the new
  // thread_id before calling router.replace. The useEffect checks it to skip
  // loadHistory — the messages are already in state from the stream.
  const streamedThreadIdRef = useRef<string | null>(null)
  const router = useRouter()

  // On mount: resolve which thread to show.
  useEffect(() => {
    setError(null)

    if (initialThreadId === "new") {
      // Explicit new-thread request — clear any stored thread and show blank.
      // Messages are already cleared by newThread() before navigation; just
      // ensure localStorage is clean so the next send starts a fresh thread.
      localStorage.removeItem(threadKey(fullName))
      return
    }

    if (initialThreadId) {
      // This thread was just created by our own stream — messages are already
      // in state, so skip the fetch that would wipe them.
      if (streamedThreadIdRef.current === initialThreadId) {
        streamedThreadIdRef.current = null
        return
      }

      loadHistory(initialThreadId)
      return
    }

    // No URL param: try localStorage first, then fall back to the most recent
    // thread from the API so the page never opens blank when history exists.
    const stored = localStorage.getItem(threadKey(fullName))
    if (stored) {
      loadHistory(stored)
      return
    }

    // Fresh visit — check the API for existing threads.
    ;(async () => {
      try {
        const res = await fetch(`/api/repos/${fullName}/chat/threads`)
        if (!res.ok) return
        const threads = (await res.json()) as Array<{ thread_id: string }>
        if (threads.length > 0) {
          // Navigate to the most recent thread — this also triggers a re-render
          // with the correct initialThreadId so history loads cleanly.
          router.replace(`?thread=${threads[0].thread_id}`)
        }
      } catch {
        // Silently degrade to blank state.
      }
    })()
    
  }, [fullName, initialThreadId])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || streaming) return
      setError(null)

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content },
        { id: assistantId, role: "assistant", content: "" },
      ])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller
      const threadId = localStorage.getItem(threadKey(fullName)) ?? undefined
      const isNewThread = !threadId
      let createdThreadId: string | undefined

      const appendDelta = (delta: string) =>
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m
          )
        )

      try {
        const res = await fetch(`/api/repos/${fullName}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: content, thread_id: threadId }),
          signal: controller.signal,
        })
        if (res.status === 401) {
          window.location.href = "/"
          return
        }
        if (!res.ok || !res.body) throw new Error()

        for await (const payload of readSSEFrames<ChatStreamFrame>(res.body)) {
          if ("thread_id" in payload) {
            localStorage.setItem(threadKey(fullName), payload.thread_id)
            if (isNewThread) createdThreadId = payload.thread_id
          } else if ("delta" in payload) {
            appendDelta(payload.delta)
          }
        }

        // Update the URL only after the stream finishes. Moving this out of the
        // frame loop prevents a mid-stream re-render that triggers loadHistory
        // and wipes the in-progress assistant message.
        if (createdThreadId) {
          streamedThreadIdRef.current = createdThreadId
          router.replace(`?thread=${createdThreadId}`)
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("The chat stream failed. Try again.")
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [fullName, streaming, router, setMessages]
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const newThread = useCallback(() => {
    abortRef.current?.abort()
    localStorage.removeItem(threadKey(fullName))
    setMessages([])
    setError(null)
    router.replace("?thread=new")
  }, [fullName, router, setMessages])

  return { messages, streaming, loadingHistory, error, send, stop, newThread }
}
