import type { ChatMessage as ChatMessageType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MarkdownContent } from "@/components/markdown-content"

// Pure message row. User turns are right-aligned chips; assistant turns are full
// width with rendered markdown. A blinking cursor marks the live turn.
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
          "text-sm leading-relaxed break-words",
          isUser
            ? ":rounded-none max-w-[85%] border border-border bg-muted px-3 py-2 whitespace-pre-wrap"
            : "w-full pl-2 sm:max-w-[85%] sm:pl-0"
        )}
      >
        {isUser ? (
          <>
            {message.content}
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary" />
            )}
          </>
        ) : (
          <MarkdownContent content={message.content} streaming={streaming} />
        )}
      </div>
    </div>
  )
}
