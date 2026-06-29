"use client"

import { useRef, useState } from "react"
import { ArrowUp, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Message input: Enter sends, Shift+Enter inserts a newline. Disabled until the
// repo is indexed (the parent gates this); a Stop control replaces Send mid-stream.
export function ChatComposer({
  onSend,
  onStop,
  streaming,
  disabled = false,
}: {
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
}) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const text = value.trim()
    if (!text || streaming || disabled) return
    onSend(text)
    setValue("")
    if (ref.current) ref.current.style.height = "auto"
  }

  return (
    <div className="flex items-end gap-2 border border-input bg-transparent p-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={
          disabled ? "Indexing required to chat" : "Ask about this repository…"
        }
        onChange={(e) => {
          setValue(e.target.value)
          e.target.style.height = "auto"
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        className={cn(
          "max-h-48 flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none",
          "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      {streaming ? (
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={onStop}
          aria-label="Stop"
        >
          <Square />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon-sm"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send"
        >
          <ArrowUp />
        </Button>
      )}
    </div>
  )
}
