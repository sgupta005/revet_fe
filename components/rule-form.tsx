"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const textareaClass =
  "flex min-h-20 w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"

// Name + body editor shared by the create form and each rule's inline edit mode.
// Owns its own field state and submits trimmed values; onSubmit resolves to a
// success boolean. In create mode (resetOnSubmit) it clears for the next rule; in
// edit mode the parent unmounts it on success, so no reset is needed.
export function RuleForm({
  initialName = "",
  initialBody = "",
  submitLabel,
  namePlaceholder,
  bodyPlaceholder = "What the bot should enforce…",
  busy,
  onSubmit,
  onCancel,
  resetOnSubmit = false,
}: {
  initialName?: string
  initialBody?: string
  submitLabel: string
  namePlaceholder?: string
  bodyPlaceholder?: string
  busy: boolean
  onSubmit: (name: string, body: string) => Promise<boolean>
  onCancel?: () => void
  resetOnSubmit?: boolean
}) {
  const [name, setName] = useState(initialName)
  const [body, setBody] = useState(initialBody)
  const valid = name.trim() !== "" && body.trim() !== ""

  const submit = async () => {
    if (!valid || busy) return
    const ok = await onSubmit(name.trim(), body.trim())
    if (ok && resetOnSubmit) {
      setName("")
      setBody("")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder={namePlaceholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy}
      />
      <textarea
        className={textareaClass}
        placeholder={bodyPlaceholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={busy}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button
          size={onCancel ? "sm" : "default"}
          onClick={submit}
          disabled={busy || !valid}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
