import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { cn } from "@/lib/utils"

// Pure message row. User turns are right-aligned chips; assistant turns are full
// width with `whitespace-pre-wrap` so the model's inline citations (path · line
// range) and code keep their formatting. A blinking cursor marks the live turn.
export function ChatMessage({
  message,
  streaming = false,
}: {
  message: ChatMessageType
  streaming?: boolean
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] text-sm leading-relaxed break-words whitespace-pre-wrap",
          isUser
            ? "rounded-none border border-border bg-muted px-3 py-2"
            : "w-full"
        )}
      >
        {message.content}
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary" />
        )}
      </div>
    </div>
  )
}
