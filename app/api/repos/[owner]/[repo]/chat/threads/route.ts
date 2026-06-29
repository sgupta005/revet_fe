import { NextResponse } from "next/server"

import { ApiError, getThreads } from "@/lib/api"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/chat/threads">
) {
  const { owner, repo } = await ctx.params
  try {
    const threads = await getThreads(owner, repo)
    return NextResponse.json(threads)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "threads_failed" }, { status })
  }
}
