export async function readSSEStream(
  response: Response,
  onData: (data: string) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<void> {
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') {
            onComplete?.();
            return;
          }
          try {
            onData(data);
          } catch (error) {
            onError?.(error as Error);
          }
        }
      }
    }
  } catch (error) {
    onError?.(error as Error);
  } finally {
    reader.releaseLock();
  }
}