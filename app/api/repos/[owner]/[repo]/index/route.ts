// Same-origin proxy so Client Components can trigger indexing: the browser sends
// the httpOnly session cookie here, and `lib/api` forwards it to the backend as a
// Bearer header (`context/progress-tracker.md` — client→backend auth, proxy method).

import { NextResponse } from "next/server"

import { ApiError, indexRepository } from "@/lib/api"

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/index">
) {
  const { owner, repo } = await ctx.params
  try {
    const data = await indexRepository(owner, repo)
    return NextResponse.json(data, { status: 202 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "index_failed" }, { status })
  }
}
