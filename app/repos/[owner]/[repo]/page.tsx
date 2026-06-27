import { redirect } from "next/navigation"

// The workspace opens on Chat (the first tool). Other tools live at sibling routes.
export default async function RepoWorkspacePage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params
  redirect(`/repos/${owner}/${repo}/chat`)
}
