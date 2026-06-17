import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#1a1a1a',
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 56,
    paddingRight: 56,
    lineHeight: 1.55,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    color: '#111',
  },
  paragraph: {
    marginBottom: 8,
  },
  line: {
    marginBottom: 2,
  },
});

interface DocumentPDFProps {
  text: string;
  title?: string;
}

export default function DocumentPDF({ text, title }: DocumentPDFProps) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {title && <Text style={styles.title}>{title}</Text>}
        {paragraphs.map((para, i) => {
          const lines = para.split('\n');
          return (
            <View key={i} style={styles.paragraph}>
              {lines.map((line, j) => (
                <Text key={j} style={styles.line}>{line}</Text>
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}
