export function parseStageJSON(content: string): any {
  // Remove markdown code fences if present
  let cleanedContent = content.trim();
  
  // Remove ```json and ``` if present
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.slice(3);
  }
  
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  
  cleanedContent = cleanedContent.trim();
  
  try {
    return JSON.parse(cleanedContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}