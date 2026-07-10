"use client"

import { useCallback, useEffect, useState } from "react"

import type { Rule } from "@/lib/types"

// Owns the rule list and all CRUD state for one repo's Rules tool (Phase 11).
// Every mutation goes through the same-origin proxy Route Handlers under
// /api/repos/{owner}/{repo}/rules (httpOnly cookie → Bearer); a 401 bounces to
// sign-in. The list is updated optimistically from each response so the UI never
// has to refetch. Mutations resolve to a boolean so callers can react to success
// (e.g. clear a form / close an inline editor).
export function useRules(owner: string, repo: string) {
  const base = `/api/repos/${owner}/${repo}/rules`
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Redirect to sign-in on 401; otherwise report whether the response is usable.
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

  const createRule = useCallback(
    async (name: string, body: string) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(base, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, body }),
        })
        if (!guard(res)) {
          if (res.status !== 401) setError("Failed to create rule.")
          return false
        }
        const rule = (await res.json()) as Rule
        setRules((prev) => [...prev, rule])
        return true
      } catch {
        setError("Failed to create rule.")
        return false
      } finally {
        setBusy(false)
      }
    },
    [base, guard]
  )

  const updateRule = useCallback(
    async (id: number, name: string, body: string) => {
      setBusy(true)
      setError(null)
      try {
        const res = await fetch(`${base}/${id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, body }),
        })
        if (!guard(res)) {
          if (res.status !== 401) setError("Failed to update rule.")
          return false
        }
        const updated = (await res.json()) as Rule
        setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
        return true
      } catch {
        setError("Failed to update rule.")
        return false
      } finally {
        setBusy(false)
      }
    },
    [base, guard]
  )

  const deleteRule = useCallback(
    async (id: number) => {
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
    },
    [base, guard]
  )

  return { rules, loading, error, busy, createRule, updateRule, deleteRule }
}
