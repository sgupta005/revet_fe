import { NextResponse } from "next/server"

import { ApiError, getThreadMessages } from "@/lib/api"

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/chat/threads/[threadId]">
) {
  const { threadId } = await ctx.params
  try {
    const messages = await getThreadMessages(threadId)
    return NextResponse.json(messages)
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "thread_messages_failed" }, { status })
  }
}
