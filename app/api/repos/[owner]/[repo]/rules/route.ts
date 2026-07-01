// Same-origin proxy for the custom-rules collection: the browser sends the
// httpOnly session cookie here and `lib/api` forwards it to the backend as a
// Bearer header (proxy method — see `context/progress-tracker.md`).

import { NextResponse } from "next/server"

import { ApiError, createRule, getRules } from "@/lib/api"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/rules">
) {
  const { owner, repo } = await ctx.params
  try {
    return NextResponse.json(await getRules(owner, repo))
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "rules_failed" }, { status })
  }
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/rules">
) {
  const { owner, repo } = await ctx.params
  try {
    const body = await request.json()
    if (typeof body?.name !== "string" || typeof body?.body !== "string") {
      return NextResponse.json({ error: "invalid" }, { status: 400 })
    }
    const rule = await createRule(owner, repo, {
      name: body.name,
      body: body.body,
    })
    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "create_failed" }, { status })
  }
}
