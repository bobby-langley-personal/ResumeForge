import { PDFDocument, PDFName, PDFRef, PDFStream, PDFArray } from 'pdf-lib'

/**
 * Removes blank trailing pages from a PDF buffer.
 * @react-pdf/renderer occasionally creates a blank last page when content
 * barely overflows the previous page (e.g. a trailing margin crosses the
 * page boundary). This function detects and removes such pages.
 */
export async function stripBlankTrailingPages(buffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.load(buffer)
  const pageCount = doc.getPageCount()
  if (pageCount <= 1) return buffer

  const lastPage = doc.getPage(pageCount - 1)
  const contentSize = getContentStreamSize(doc, lastPage)

  // Blank pages from react-pdf have negligible content (< 200 bytes).
  // Real content pages are several KB. Use a conservative threshold.
  if (contentSize < 200) {
    doc.removePage(pageCount - 1)
    return Buffer.from(await doc.save())
  }

  return buffer
}

function getContentStreamSize(doc: PDFDocument, page: ReturnType<PDFDocument['getPage']>): number {
  try {
    const node = (page as any).node
    const contentsEntry = node.get(PDFName.of('Contents'))
    if (!contentsEntry) return 0

    const resolved = doc.context.lookup(contentsEntry)

    if (resolved instanceof PDFStream) {
      return resolved.getContents().length
    }

    if (resolved instanceof PDFArray) {
      let total = 0
      for (let i = 0; i < resolved.size(); i++) {
        const ref = resolved.get(i)
        if (ref instanceof PDFRef) {
          const stream = doc.context.lookup(ref)
          if (stream instanceof PDFStream) {
            total += stream.getContents().length
          }
        }
      }
      return total
    }
  } catch {
    // If we can't read the content stream, assume the page has content
    return Infinity
  }

  return 0
}
