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

  // Split cover letter text into paragraphs, stripping any AI-generated
  // greeting line (Dear ...,) since the template renders its own header
  const paragraphs = coverLetterText
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .filter(p => !/^dear\b/i.test(p));  // remove greeting — rendered below

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