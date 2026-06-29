import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function MarkdownContent({
  content,
  streaming,
}: {
  content: string
  streaming: boolean
}) {
  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-3 last:mb-0">{children}</p>
          },
          h1({ children }) {
            return (
              <h1 className="mb-3 mt-5 text-base font-semibold first:mt-0">
                {children}
              </h1>
            )
          },
          h2({ children }) {
            return (
              <h2 className="mb-2 mt-4 text-sm font-semibold first:mt-0">
                {children}
              </h2>
            )
          },
          h3({ children }) {
            return (
              <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">
                {children}
              </h3>
            )
          },
          ul({ children }) {
            return (
              <ul className="mb-3 list-disc space-y-1 pl-4 last:mb-0">
                {children}
              </ul>
            )
          },
          ol({ children }) {
            return (
              <ol className="mb-3 list-decimal space-y-1 pl-4 last:mb-0">
                {children}
              </ol>
            )
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>
          },
          code({ children, className }) {
            const lang = className?.replace("language-", "") ?? ""
            // Fenced blocks with no language have no className but do have newlines
            const content = String(children)
            const isBlock = className?.startsWith("language-") || content.includes("\n")
            if (isBlock) {
              return (
                <div className="mb-3 last:mb-0">
                  {lang && (
                    <div className="border border-b-0 border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {lang}
                    </div>
                  )}
                  <pre className="overflow-x-auto border border-border bg-muted p-3 text-xs leading-relaxed">
                    <code>{children}</code>
                  </pre>
                </div>
              )
            }
            return (
              <code className="rounded-none border border-border bg-muted px-1 py-0.5 text-xs">
                {children}
              </code>
            )
          },
          pre({ children }) {
            // Block rendering is handled inside the code component above
            return <>{children}</>
          },
          blockquote({ children }) {
            return (
              <blockquote className="mb-3 border-l-2 border-primary pl-3 text-muted-foreground last:mb-0">
                {children}
              </blockquote>
            )
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            )
          },
          hr() {
            return <hr className="my-4 border-border" />
          },
          table({ children }) {
            return (
              <div className="mb-3 overflow-x-auto last:mb-0">
                <table className="w-full border-collapse border border-border text-xs">
                  {children}
                </table>
              </div>
            )
          },
          th({ children }) {
            return (
              <th className="border border-border bg-muted px-3 py-1.5 text-left font-semibold">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="border border-border px-3 py-1.5">{children}</td>
            )
          },
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-primary" />
      )}
    </>
  )
}
