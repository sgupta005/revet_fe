// Same-origin proxy for a single custom rule (update / delete). Forwards the
// httpOnly session cookie to the backend as a Bearer header (proxy method).

import { NextResponse } from "next/server"

import { ApiError, deleteRule, updateRule } from "@/lib/api"

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/rules/[ruleId]">
) {
  const { owner, repo, ruleId } = await ctx.params
  try {
    const body = await request.json()
    if (typeof body?.name !== "string" || typeof body?.body !== "string") {
      return NextResponse.json({ error: "invalid" }, { status: 400 })
    }
    const rule = await updateRule(owner, repo, Number(ruleId), {
      name: body.name,
      body: body.body,
    })
    return NextResponse.json(rule)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "update_failed" }, { status })
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/rules/[ruleId]">
) {
  const { owner, repo, ruleId } = await ctx.params
  try {
    await deleteRule(owner, repo, Number(ruleId))
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "delete_failed" }, { status })
  }
}
