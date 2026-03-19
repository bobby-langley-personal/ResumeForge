// Shared SSE stream reader utility
// Critical: Single data: lines can span multiple TCP chunks
// Never implement inline line splitting - use this buffered approach

export async function* readSSEStream(response: Response): AsyncGenerator<string, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ') && !line.includes('[DONE]')) {
              yield line.substring(6); // Remove 'data: ' prefix
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last line in buffer (might be incomplete)
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ') && !line.includes('[DONE]')) {
          yield line.substring(6); // Remove 'data: ' prefix
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}