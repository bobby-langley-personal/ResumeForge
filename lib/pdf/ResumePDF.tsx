import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

interface ResumePDFProps {
  resumeText: string;
  candidateName: string;
  company: string;
  jobTitle: string;
}

interface ParsedResume {
  header: {
    name: string;
    email: string;
    phone: string;
    location: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    bulletPoints: string[];
  }>;
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    dates: string;
  }>;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 54, // 0.75 inches = 54 points
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 24,
    textAlign: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  contact: {
    fontSize: 10,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 2,
  },
  text: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'justify',
  },
  experienceItem: {
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  jobDates: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  company: {
    fontSize: 10,
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 10,
    marginBottom: 2,
    marginLeft: 12,
  },
  skillsList: {
    fontSize: 10,
    marginBottom: 8,
  },
  educationItem: {
    marginBottom: 8,
  },
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  degree: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  institution: {
    fontSize: 10,
  },
});

function parseResumeText(resumeText: string): ParsedResume {
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);
  
  const parsed: ParsedResume = {
    header: {
      name: '',
      email: '',
      phone: '',
      location: '',
    },
    summary: '',
    experience: [],
    skills: [],
    education: [],
  };

  let currentSection = '';
  let currentExperience: any = null;
  let currentEducation: any = null;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Detect sections
    if (lowerLine.includes('summary') || lowerLine.includes('objective')) {
      currentSection = 'summary';
      continue;
    } else if (lowerLine.includes('experience') || lowerLine.includes('work history')) {
      currentSection = 'experience';
      continue;
    } else if (lowerLine.includes('skills')) {
      currentSection = 'skills';
      continue;
    } else if (lowerLine.includes('education')) {
      currentSection = 'education';
      continue;
    }
    
    // Extract header information (first few lines)
    if (!parsed.header.name && !currentSection) {
      parsed.header.name = line;
      continue;
    }
    
    if (!currentSection) {
      // Try to extract contact info
      if (line.includes('@')) {
        parsed.header.email = line;
      } else if (line.match(/\(\d{3}\)\s?\d{3}-\d{4}/) || line.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        parsed.header.phone = line;
      } else if (line.includes(',') && !line.includes('@')) {
        parsed.header.location = line;
      }
      continue;
    }
    
    // Process sections
    switch (currentSection) {
      case 'summary':
        parsed.summary += (parsed.summary ? ' ' : '') + line;
        break;
        
      case 'experience':
        // Check if this looks like a new job entry (company name)
        if (line.match(/^\w+.*\s+\d{4}|\w+.*\s+[-–]\s*\d{4}|^\w+.*\s+[-–]\s*Present/i)) {
          if (currentExperience) {
            parsed.experience.push(currentExperience);
          }
          const parts = line.split(/\s+[-–]\s*/);
          currentExperience = {
            company: parts[0].trim(),
            title: '',
            dates: parts.length > 1 ? parts[parts.length - 1].trim() : '',
            bulletPoints: [],
          };
        } else if (currentExperience && line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          currentExperience.bulletPoints.push(line.replace(/^[•\-*]\s*/, ''));
        } else if (currentExperience && !currentExperience.title) {
          currentExperience.title = line;
        }
        break;
        
      case 'skills':
        if (line.includes(',')) {
          parsed.skills.push(...line.split(',').map(s => s.trim()));
        } else {
          parsed.skills.push(line);
        }
        break;
        
      case 'education':
        if (line.match(/\d{4}/) || line.includes('University') || line.includes('College') || line.includes('Bachelor') || line.includes('Master') || line.includes('PhD')) {
          if (currentEducation) {
            parsed.education.push(currentEducation);
          }
          currentEducation = {
            institution: '',
            degree: line,
            dates: '',
          };
          const dateMatch = line.match(/\d{4}[\s-]*\d{4}|\d{4}[\s-]*Present/i);
          if (dateMatch) {
            currentEducation.dates = dateMatch[0];
            currentEducation.degree = line.replace(dateMatch[0], '').trim();
          }
        }
        break;
    }
  }
  
  // Add any remaining items
  if (currentExperience) {
    parsed.experience.push(currentExperience);
  }
  if (currentEducation) {
    parsed.education.push(currentEducation);
  }
  
  return parsed;
}

export default function ResumePDF({ resumeText, candidateName, company, jobTitle }: ResumePDFProps) {
  const parsed = parseResumeText(resumeText);
  
  // Use provided candidateName if header parsing failed
  if (!parsed.header.name && candidateName) {
    parsed.header.name = candidateName;
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{parsed.header.name || candidateName}</Text>
          {parsed.header.email && <Text style={styles.contact}>{parsed.header.email}</Text>}
          {parsed.header.phone && <Text style={styles.contact}>{parsed.header.phone}</Text>}
          {parsed.header.location && <Text style={styles.contact}>{parsed.header.location}</Text>}
        </View>

        {/* Summary */}
        {parsed.summary && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{parsed.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {parsed.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {parsed.experience.map((job, index) => (
              <View key={index} style={styles.experienceItem}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobDates}>{job.dates}</Text>
                </View>
                <Text style={styles.company}>{job.company}</Text>
                {job.bulletPoints.map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={styles.bulletPoint}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {parsed.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skillsList}>{parsed.skills.join(' • ')}</Text>
          </View>
        )}

        {/* Education */}
        {parsed.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {parsed.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <View style={styles.educationHeader}>
                  <Text style={styles.degree}>{edu.degree}</Text>
                  <Text style={styles.jobDates}>{edu.dates}</Text>
                </View>
                {edu.institution && <Text style={styles.institution}>{edu.institution}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}