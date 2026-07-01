"use client"

import { useCallback, useEffect, useState } from "react"
import { ListChecks, Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { Rule } from "@/lib/types"
import { cn } from "@/lib/utils"

const textareaClass =
  "flex min-h-20 w-full rounded-none border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

// Client island for the per-repo Rules tool (Phase 11): list + create + inline
// edit + delete of the custom review rules the bot enforces in PR review, issue
// analysis, and auto-PR. All mutations go through same-origin proxy Route Handlers
// under /api/repos/{owner}/{repo}/rules (httpOnly cookie → Bearer). A 401 bounces
// to sign-in.
export function RulesManager({ owner, repo }: { owner: string; repo: string }) {
  const base = `/api/repos/${owner}/${repo}/rules`
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState("")
  const [body, setBody] = useState("")

  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editBody, setEditBody] = useState("")

  const guard = useCallback((res: Response) => {
    if (res.status === 401) {
      window.location.href = "/"
      return false
    }
    return res.ok
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(base)
      if (!guard(res)) {
        if (res.status !== 401) setError("Failed to load rules.")
        return
      }
      setRules((await res.json()) as Rule[])
    } catch {
      setError("Failed to load rules.")
    } finally {
      setLoading(false)
    }
  }, [base, guard])

  useEffect(() => {
    // load() only setStates after an await; safe to run on mount (same pattern
    // as WorkspaceNav's thread fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const create = async () => {
    if (!name.trim() || !body.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), body: body.trim() }),
      })
      if (!guard(res)) {
        if (res.status !== 401) setError("Failed to create rule.")
        return
      }
      const rule = (await res.json()) as Rule
      setRules((prev) => [...prev, rule])
      setName("")
      setBody("")
    } catch {
      setError("Failed to create rule.")
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (rule: Rule) => {
    setEditId(rule.id)
    setEditName(rule.name)
    setEditBody(rule.body)
  }

  const saveEdit = async () => {
    if (editId === null || !editName.trim() || !editBody.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${base}/${editId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), body: editBody.trim() }),
      })
      if (!guard(res)) {
        if (res.status !== 401) setError("Failed to update rule.")
        return
      }
      const updated = (await res.json()) as Rule
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setEditId(null)
    } catch {
      setError("Failed to update rule.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" })
      if (!guard(res)) {
        if (res.status !== 401) setError("Failed to delete rule.")
        return
      }
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError("Failed to delete rule.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-lg font-medium">
          <ListChecks className="h-5 w-5 text-primary" />
          Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guidelines Revet enforces in PR reviews, issue analysis, and auto-PRs
          for {owner}/{repo}.
        </p>
      </div>

      {/* Create form */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 pt-6">
          <Input
            placeholder="Rule name (e.g. No console.log in production code)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
          <textarea
            className={textareaClass}
            placeholder="What the bot should enforce…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
          />
          <div className="flex justify-end">
            <Button
              onClick={create}
              disabled={busy || !name.trim() || !body.trim()}
            >
              Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : rules.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>No rules yet</EmptyTitle>
            <EmptyDescription>
              Add a rule above and Revet will enforce it across reviews, issue
              analysis, and auto-PRs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Card>
                <CardContent className="pt-6">
                  {editId === rule.id ? (
                    <div className="flex flex-col gap-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={busy}
                      />
                      <textarea
                        className={textareaClass}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        disabled={busy}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditId(null)}
                          disabled={busy}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={saveEdit}
                          disabled={
                            busy || !editName.trim() || !editBody.trim()
                          }
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{rule.name}</p>
                        <p
                          className={cn(
                            "mt-1 text-sm whitespace-pre-wrap text-muted-foreground"
                          )}
                        >
                          {rule.body}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit rule"
                          onClick={() => startEdit(rule)}
                          disabled={busy}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete rule"
                          onClick={() => remove(rule.id)}
                          disabled={busy}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
