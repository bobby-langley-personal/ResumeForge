/**
 * Collects all SSE events from a streaming Response.
 * Returns an array of parsed event objects in emission order.
 */
export async function collectSSE(response: Response): Promise<Array<{ type: string } & Record<string, unknown>>> {
  if (!response.body) return [];

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const events: Array<{ type: string } & Record<string, unknown>> = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE format: "data: {...}\n\n"
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(line.slice('data: '.length));
        events.push(json);
      } catch {
        // skip malformed lines
      }
    }
  }

  return events;
}

/** Returns all events of a given type from the collected SSE stream */
export function getEvents(events: ReturnType<typeof collectSSE> extends Promise<infer T> ? T : never, type: string) {
  return events.filter(e => e.type === type);
}
