// Yields parsed JSON payloads from an SSE response body.
// Handles partial reads: buffers bytes and slices on the \n\n event terminator
// before extracting the `data:` line from each frame.
export async function* readSSEFrames<T = unknown>(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      const line = frame.split("\n").find((l) => l.startsWith("data:"))
      if (line) yield JSON.parse(line.slice(5).trim()) as T
    }
  }
}
