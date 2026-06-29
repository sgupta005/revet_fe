"use client"

import { useCallback, useRef, useState } from "react"

import type { ChatMessage, ChatStreamFrame } from "@/lib/types"

// Per-repo chat-memory key; persisted so a conversation continues across reload.
const threadKey = (fullName: string) => `revet:thread:${fullName}`

// Consumes the same-origin `/api/.../chat` SSE proxy via `fetch` + a
// `ReadableStream` reader (never `EventSource` — POST-only; invariant #4). Frames
// are `data: {...}\n\n`; a frame can split across reads, so we buffer partial
// lines. The leading `thread_id` frame is persisted; `delta`s append to the live
// assistant message; `done` ends the turn.
export function useChatStream(fullName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let sep: number
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            const line = frame.split("\n").find((l) => l.startsWith("data:"))
            if (!line) continue
            const payload = JSON.parse(line.slice(5).trim()) as ChatStreamFrame
            if ("thread_id" in payload) {
              localStorage.setItem(threadKey(fullName), payload.thread_id)
            } else if ("delta" in payload) {
              appendDelta(payload.delta)
            }
          }
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
    [fullName, streaming]
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const newThread = useCallback(() => {
    abortRef.current?.abort()
    localStorage.removeItem(threadKey(fullName))
    setMessages([])
    setError(null)
  }, [fullName])

  return { messages, streaming, error, send, stop, newThread }
}
