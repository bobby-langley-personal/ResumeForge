import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { PDFDocument } from 'pdf-lib'
import { stripBlankTrailingPages } from './strip-blank-pages'

/**
 * Render a PDF component and, if the result exceeds targetPages,
 * re-render with compact=true (0.85x spacing) as a safety net.
 *
 * The component must accept a `compact?: boolean` prop (e.g. ResumePDF).
 */
export async function renderWithAutoCompact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>,
  props: Record<string, unknown>,
  targetPages = 2
): Promise<Buffer> {
  // First pass: normal spacing
  const normalElement = createElement(Component, { ...props, compact: false })
  const normalRaw = await renderToBuffer(normalElement as React.ReactElement)
  const normalBuffer = await stripBlankTrailingPages(Buffer.from(normalRaw))

  const doc = await PDFDocument.load(normalBuffer)
  if (doc.getPageCount() <= targetPages) {
    return normalBuffer
  }

  // Second pass: compact spacing (0.85x margins/gaps)
  const compactElement = createElement(Component, { ...props, compact: true })
  const compactRaw = await renderToBuffer(compactElement as React.ReactElement)
  return stripBlankTrailingPages(Buffer.from(compactRaw))
}
