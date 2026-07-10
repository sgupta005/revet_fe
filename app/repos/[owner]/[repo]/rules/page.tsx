import { requireSession } from "@/lib/session"

import { RulesManager } from "@/components/rules-manager"

// Server shell for the per-repo Rules tool (Phase 11): ensures a session, then
// hands the CRUD to the client island (which talks to the backend through the
// same-origin proxy Route Handlers under /api/repos/{owner}/{repo}/rules).
export default async function RulesPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  await requireSession()
  const { owner, repo } = await params
  return <RulesManager owner={owner} repo={repo} />
}
