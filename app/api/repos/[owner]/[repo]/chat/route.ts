// Same-origin streaming proxy for chat: the browser sends the httpOnly session
// cookie here, `lib/api` forwards it to the backend `/chat` as a Bearer header
// (proxy method, like the index routes), and the backend's SSE body is piped
// straight through to the client unbuffered (invariant #4 — no buffering).

import { NextResponse } from "next/server"

import { ApiError, chatStream } from "@/lib/api"

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/repos/[owner]/[repo]/chat">
) {
  const { owner, repo } = await ctx.params

  let body: { message?: unknown; thread_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }
  if (typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }
  const thread_id =
    typeof body.thread_id === "string" ? body.thread_id : undefined

  let upstream: Response
  try {
    upstream = await chatStream({
      repo: `${owner}/${repo}`,
      message: body.message,
      thread_id,
    })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502
    return NextResponse.json({ error: "chat_failed" }, { status })
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "chat_failed" },
      { status: upstream.status || 502 }
    )
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    },
  })
}
