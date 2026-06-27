"use client"

import { useCallback, useEffect, useState } from "react"

import type { IndexStatusResponse, IndexingStatus } from "@/lib/types"

const POLL_INTERVAL_MS = 3000

// Owns a repo's live indexing status: triggers indexing and polls the same-origin
// proxy while INDEXING, stopping on a terminal state or unmount (invariant #7).
export function useIndexingStatus(
  fullName: string,
  initialStatus: IndexingStatus
) {
  const [status, setStatus] = useState<IndexingStatus>(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "INDEXING") return

    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/repos/${fullName}/index-status`, {
          cache: "no-store",
        })
        if (res.status === 401) {
          window.location.href = "/"
          return
        }
        if (!res.ok) throw new Error()
        const data: IndexStatusResponse = await res.json()
        if (!cancelled) setStatus(data.indexing_status)
      } catch {
        if (!cancelled) setError("Couldn't fetch status")
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [status, fullName])

  const triggerIndex = useCallback(async () => {
    setError(null)
    setPending(true)
    try {
      const res = await fetch(`/api/repos/${fullName}/index`, {
        method: "POST",
      })
      if (res.status === 401) {
        window.location.href = "/"
        return
      }
      if (!res.ok) throw new Error()
      setStatus("INDEXING")
    } catch {
      setError("Couldn't start indexing")
    } finally {
      setPending(false)
    }
  }, [fullName])

  return { status, pending, error, triggerIndex }
}
