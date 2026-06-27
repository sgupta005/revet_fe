// Same-origin proxy for client-side indexing-status polling. See the sibling
// `index/route.ts` for the auth rationale.

import { NextResponse } from "next/server"

import { ApiError, getIndexStatus } from "@/lib/api"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/index-status">
) {
  const { owner, repo } = await ctx.params
  try {
    const data = await getIndexStatus(owner, repo)
    return NextResponse.json(data)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "status_failed" }, { status })
  }
}
