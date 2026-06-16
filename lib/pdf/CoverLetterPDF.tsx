import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

interface CoverLetterPDFProps {
  coverLetterText: string;
  candidateName: string;
  company: string;
  jobTitle: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 72, // 1 inch = 72 points
    fontFamily: 'Helvetica',
    fontSize: 12,
    lineHeight: 1.4,
  },
  date: {
    textAlign: 'right',
    marginBottom: 12,
  },
  addressBlock: {
    marginBottom: 12,
  },
  greeting: {
    marginBottom: 12,
  },
  bodyText: {
    marginBottom: 12,
    textAlign: 'justify',
  },
  closing: {
    marginBottom: 48, // Space for signature
  },
  candidateName: {
    // No additional styling needed
  },
});

export default function CoverLetterPDF({ 
  coverLetterText, 
  candidateName, 
  company, 
  jobTitle 
}: CoverLetterPDFProps) {
  // Get today's date formatted
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Regex for common closing phrases (e.g. "Best,", "Sincerely,", "Regards,")
  // Used to strip the AI-generated closing block so the hardcoded template
  // closing ("Sincerely," + candidateName) doesn't duplicate it.
  const CLOSING_RE = /^(best|sincerely|regards|warm regards|kind regards|best regards|thank you|thanks|yours truly|yours sincerely|with appreciation|with regards|respectfully)[,.]?\s*$/i;

  // Split cover letter text into paragraphs, stripping any AI-generated
  // greeting line (Dear ...,) since the template renders its own header
  const rawParagraphs = coverLetterText
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .filter(p => !/^dear\b/i.test(p));  // remove greeting — rendered below

  // Strip trailing closing block so it doesn't duplicate the template's own
  // "Sincerely, [name]" footer. Handles two cases:
  //   Case A: "Best,\n\nJane Smith" → two separate paragraphs at the end
  //   Case B: "Best,\nJane Smith" or just "Best," → one paragraph at the end
  const paragraphs = [...rawParagraphs];
  if (paragraphs.length >= 2) {
    const secondLastFirstLine = paragraphs[paragraphs.length - 2].split('\n')[0].trim();
    const lastLineCount = paragraphs[paragraphs.length - 1].split('\n').length;
    if (CLOSING_RE.test(secondLastFirstLine) && lastLineCount <= 2) {
      paragraphs.splice(paragraphs.length - 2, 2);  // remove closing phrase + name
    }
  }
  if (paragraphs.length >= 1) {
    const lastFirstLine = paragraphs[paragraphs.length - 1].split('\n')[0].trim();
    if (CLOSING_RE.test(lastFirstLine)) {
      paragraphs.pop();  // remove lone closing phrase (or "Best,\nName" single block)
    }
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Today's date (right aligned) */}
        <Text style={styles.date}>{today}</Text>

        {/* Blank line handled by marginBottom */}

        {/* Company name and job title (address block) */}
        <View style={styles.addressBlock}>
          <Text>{company}</Text>
          <Text>{jobTitle}</Text>
        </View>

        {/* Blank line handled by marginBottom */}

        {/* Greeting */}
        <Text style={styles.greeting}>Dear Hiring Manager,</Text>

        {/* Blank line handled by marginBottom */}

        {/* Cover letter body (3-4 paragraphs from generated text) */}
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.bodyText}>
            {paragraph}
          </Text>
        ))}

        {/* Blank line handled by marginBottom */}

        {/* Closing */}
        <Text style={styles.closing}>Sincerely,</Text>

        {/* Candidate name */}
        <Text style={styles.candidateName}>{candidateName}</Text>
      </Page>
    </Document>
  );
}