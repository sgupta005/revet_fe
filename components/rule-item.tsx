"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"

import { RuleForm } from "@/components/rule-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Rule } from "@/lib/types"

// One rule in the list: read-only display with edit/delete actions, swapping to
// an inline RuleForm while editing. Owns only its own `editing` flag so the list
// stays free of per-row edit state.
export function RuleItem({
  rule,
  busy,
  onUpdate,
  onDelete,
}: {
  rule: Rule
  busy: boolean
  onUpdate: (id: number, name: string, body: string) => Promise<boolean>
  onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <Card>
      <CardContent>
        {editing ? (
          <RuleForm
            initialName={rule.name}
            initialBody={rule.body}
            submitLabel="Save"
            busy={busy}
            onSubmit={async (name, body) => {
              const ok = await onUpdate(rule.id, name, body)
              if (ok) setEditing(false)
              return ok
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{rule.name}</p>
              <p className="mt-1 text-sm/relaxed whitespace-pre-wrap text-muted-foreground">
                {rule.body}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit rule"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete rule"
                onClick={() => onDelete(rule.id)}
                disabled={busy}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
