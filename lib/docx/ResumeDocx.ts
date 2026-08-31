import {
  Document,
  Paragraph,
  TextRun,
  Packer,
  AlignmentType,
  BorderStyle,
  TabStopType,
} from 'docx'
import { parseResumeText, type ParsedResume } from '@/lib/pdf/parse-resume-text'

// Half-points (docx size unit): 1pt = 2 half-points
const pt = (n: number) => n * 2

const SECTION_BORDER = {
  bottom: { color: '000000', space: 2, style: BorderStyle.SINGLE, size: 6 },
}

// Right-margin tab stop position in twips (6.5" content width at 1" margins = 6.5 * 1440)
const RIGHT_TAB = 9360

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    border: SECTION_BORDER,
    spacing: { before: pt(14), after: pt(5) },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: pt(12),
      }),
    ],
  })
}

function buildResumeDoc(parsed: ParsedResume, candidateName: string): Document {
  const children: Paragraph[] = []

  // ── Header ──────────────────────────────────────────────────────────────────
  const name = parsed.header.name || candidateName
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: pt(4) },
      children: [new TextRun({ text: name, bold: true, size: pt(20) })],
    })
  )

  const contactParts = [
    parsed.header.location,
    parsed.header.phone,
    parsed.header.email,
    parsed.header.linkedin,
  ].filter(Boolean)

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: pt(4) },
        children: [new TextRun({ text: contactParts.join(' | '), size: pt(10) })],
      })
    )
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  if (parsed.summary?.trim()) {
    children.push(sectionHeading('Summary'))
    children.push(
      new Paragraph({
        spacing: { after: pt(4) },
        children: [new TextRun({ text: parsed.summary, size: pt(10) })],
      })
    )
  }

  // ── Experience ───────────────────────────────────────────────────────────────
  if (parsed.experience.length > 0) {
    children.push(sectionHeading('Experience'))

    for (const group of parsed.experience) {
      // Company | Location
      const companyLine = group.location
        ? `${group.company} | ${group.location}`
        : group.company
      children.push(
        new Paragraph({
          spacing: { before: pt(6), after: pt(2) },
          children: [new TextRun({ text: companyLine, bold: true, size: pt(10) })],
        })
      )

      for (const role of group.roles) {
        // Role title (left) + dates (right) on same line via tab stop
        children.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            spacing: { after: pt(2) },
            children: [
              new TextRun({ text: role.title, bold: true, size: pt(10) }),
              ...(role.dates
                ? [
                    new TextRun({ text: '\t', size: pt(10) }),
                    new TextRun({ text: role.dates, italics: true, size: pt(10) }),
                  ]
                : []),
            ],
          })
        )

        for (const bullet of role.bulletPoints) {
          children.push(
            new Paragraph({
              indent: { left: 360 },
              spacing: { after: pt(2) },
              children: [new TextRun({ text: `\u2022 ${bullet}`, size: pt(10) })],
            })
          )
        }
      }
    }
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  if (parsed.projects.length > 0) {
    children.push(sectionHeading('Projects'))

    for (const project of parsed.projects) {
      const headerRuns: TextRun[] = [
        new TextRun({ text: project.name, bold: true, size: pt(10) }),
      ]
      if (project.techStack) {
        headerRuns.push(new TextRun({ text: ` | ${project.techStack}`, size: pt(10) }))
      }
      children.push(
        new Paragraph({
          spacing: { before: pt(4), after: pt(2) },
          children: headerRuns,
        })
      )

      if (project.description) {
        children.push(
          new Paragraph({
            spacing: { after: pt(2) },
            children: [new TextRun({ text: project.description, italics: true, size: pt(10) })],
          })
        )
      }

      for (const bullet of project.bullets) {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: pt(2) },
            children: [new TextRun({ text: `\u2022 ${bullet}`, size: pt(10) })],
          })
        )
      }
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  if (parsed.skills.length > 0) {
    children.push(sectionHeading('Skills'))

    for (const group of parsed.skills) {
      const runs: TextRun[] = []
      if (group.category) {
        runs.push(new TextRun({ text: `${group.category}: `, bold: true, size: pt(10) }))
      }
      runs.push(new TextRun({ text: group.items.join(', '), size: pt(10) }))
      children.push(
        new Paragraph({ spacing: { after: pt(3) }, children: runs })
      )
    }
  }

  // ── Certifications ───────────────────────────────────────────────────────────
  if (parsed.certifications.length > 0) {
    children.push(sectionHeading('Certifications'))
    for (const cert of parsed.certifications) {
      children.push(
        new Paragraph({
          spacing: { after: pt(3) },
          children: [new TextRun({ text: cert, size: pt(10) })],
        })
      )
    }
  }

  // ── Education ────────────────────────────────────────────────────────────────
  if (parsed.education.length > 0) {
    children.push(sectionHeading('Education'))

    for (const edu of parsed.education) {
      if (edu.degree) {
        children.push(
          new Paragraph({
            spacing: { before: pt(4), after: pt(2) },
            children: [new TextRun({ text: edu.degree, bold: true, size: pt(11) })],
          })
        )
      }
      const instLine = edu.location
        ? `${edu.institution} | ${edu.location}`
        : edu.institution
      children.push(
        new Paragraph({
          spacing: { after: pt(4) },
          children: [new TextRun({ text: instLine, size: pt(10) })],
        })
      )
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 }, // ~0.75"
          },
        },
        children,
      },
    ],
  })
}

export async function generateResumeDocx(
  resumeText: string,
  candidateName: string
): Promise<Buffer> {
  const parsed = parseResumeText(resumeText)
  if (!parsed.header.name && candidateName) {
    parsed.header.name = candidateName
  }
  const doc = buildResumeDoc(parsed, candidateName)
  return Packer.toBuffer(doc)
}
