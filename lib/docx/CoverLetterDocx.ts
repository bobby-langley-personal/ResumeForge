import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx'

// Half-points (docx size unit): 1pt = 2 half-points
const pt = (n: number) => n * 2

const CLOSING_RE =
  /^(best|sincerely|regards|warm regards|kind regards|best regards|thank you|thanks|yours truly|yours sincerely|with appreciation|with regards|respectfully)[,.]?\s*$/i

export async function generateCoverLetterDocx(
  coverLetterText: string,
  candidateName: string,
  company: string,
  jobTitle: string
): Promise<Buffer> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Mirror the same stripping logic as CoverLetterPDF
  const rawParagraphs = coverLetterText
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .filter(p => !/^dear\b/i.test(p))

  const paragraphs = [...rawParagraphs]
  if (paragraphs.length >= 2) {
    const secondLastFirstLine = paragraphs[paragraphs.length - 2].split('\n')[0].trim()
    const lastLineCount = paragraphs[paragraphs.length - 1].split('\n').length
    if (CLOSING_RE.test(secondLastFirstLine) && lastLineCount <= 2) {
      paragraphs.splice(paragraphs.length - 2, 2)
    }
  }
  if (paragraphs.length >= 1) {
    const lastFirstLine = paragraphs[paragraphs.length - 1].split('\n')[0].trim()
    if (CLOSING_RE.test(lastFirstLine)) {
      paragraphs.pop()
    }
  }

  const children: Paragraph[] = [
    // Date (right-aligned)
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: pt(12) },
      children: [new TextRun({ text: today, size: pt(12) })],
    }),

    // Address block
    new Paragraph({
      spacing: { after: pt(4) },
      children: [new TextRun({ text: company, size: pt(12) })],
    }),
    new Paragraph({
      spacing: { after: pt(12) },
      children: [new TextRun({ text: jobTitle, size: pt(12) })],
    }),

    // Greeting
    new Paragraph({
      spacing: { after: pt(12) },
      children: [new TextRun({ text: 'Dear Hiring Manager,', size: pt(12) })],
    }),

    // Body paragraphs
    ...paragraphs.map(
      p =>
        new Paragraph({
          spacing: { after: pt(12) },
          children: [new TextRun({ text: p, size: pt(12) })],
        })
    ),

    // Closing
    new Paragraph({
      spacing: { after: pt(48) },
      children: [new TextRun({ text: 'Sincerely,', size: pt(12) })],
    }),

    // Candidate name
    new Paragraph({
      children: [new TextRun({ text: candidateName, size: pt(12) })],
    }),
  ]

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1"
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}
