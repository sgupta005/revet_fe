"use client"

import { useEffect, useRef } from "react"
import { Plus } from "lucide-react"

import { ChatComposer } from "@/components/chat-composer"
import { ChatMessage } from "@/components/chat-message"
import { Button } from "@/components/ui/button"
import { useChatStream } from "@/hooks/use-chat-stream"
import type { IndexingStatus } from "@/lib/types"

const EXAMPLE_PROMPTS = [
  "What does this repository do?",
  "How is the project structured?",
  "Where is authentication handled?",
]

// Client island for F3: owns the streaming conversation for one repo. The composer
// is gated on a COMPLETED index (chat needs an indexed repo); other states show a
// banner instead of silently failing.
export function ChatPanel({
  fullName,
  status,
}: {
  fullName: string
  status: IndexingStatus
}) {
  const { messages, streaming, error, send, stop, newThread } =
    useChatStream(fullName)
  const indexed = status === "COMPLETED"
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* {messages.length > 0 && (
        <div className="flex shrink-0 justify-end border-b border-border px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={newThread}
            disabled={streaming}
          >
            <Plus />
            New thread
          </Button>
        </div>
      )} */}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Ask a question about{" "}
                <span className="font-medium text-foreground">{fullName}</span>.
                Answers are grounded in the indexed code.
              </p>
              {indexed && (
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      onClick={() => send(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((message, i) => (
              <ChatMessage
                key={message.id}
                message={message}
                streaming={
                  streaming &&
                  message.role === "assistant" &&
                  i === messages.length - 1
                }
              />
            ))
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {!indexed && (
            <p className="mb-2 text-xs text-muted-foreground">
              This repository isn&apos;t indexed yet — index it from the
              repository list to start chatting.
            </p>
          )}
          <ChatComposer
            onSend={send}
            onStop={stop}
            streaming={streaming}
            disabled={!indexed}
          />
        </div>
      </div>
    </div>
  )
}
