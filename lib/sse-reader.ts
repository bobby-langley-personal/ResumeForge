/**
 * Shared SSE stream reader utility
 * Handles buffering and parsing of Server-Sent Events
 */

export async function readSSEStream<T>(
  stream: ReadableStream<Uint8Array>,
  onChunk: (data: T) => void,
  onError?: (error: Error) => void
): Promise<void> {
  const reader = stream.getReader();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data) as T;
            onChunk(parsed);
          } catch (error) {
            onError?.(new Error(`Failed to parse SSE data: ${data}`));
          }
        }
      }
    }
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  } finally {
    reader.releaseLock();
  }
}