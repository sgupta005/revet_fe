"use client"

import { useCallback, useState } from "react"

import type { ChatMessage, ChatRole } from "@/lib/types"

// Shared localStorage key — also used by useChatStream for send/newThread.
export const threadKey = (fullName: string) => `revet:thread:${fullName}`

// Owns the message list and the history-loading state for a single repo chat.
// Exposed setMessages lets useChatStream optimistically append streaming turns.
export function useLoadHistory(fullName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = useCallback(
    async (threadId: string) => {
      setLoadingHistory(true)
      try {
        const res = await fetch(`/api/chat/threads/${threadId}`)
        if (res.status === 401) {
          window.location.href = "/"
          return
        }
        if (!res.ok) return
        const raw = (await res.json()) as Array<{ role: ChatRole; content: string }>
        setMessages(
          raw.map((m) => ({ id: crypto.randomUUID(), role: m.role, content: m.content }))
        )
        localStorage.setItem(threadKey(fullName), threadId)
      } catch {
        // Silently degrade — the user can still send messages.
      } finally {
        setLoadingHistory(false)
      }
    },
    [fullName]
  )

  return { messages, setMessages, loadingHistory, loadHistory }
}
