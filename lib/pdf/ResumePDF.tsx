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
    linkedin: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    location: string;
    bulletPoints: string[];
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  education: Array<{
    institution: string;
    location: string;
    degree: string;
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
      linkedin: '',
    },
    summary: '',
    experience: [],
    skills: [],
    education: [],
  };

  let currentSection = '';
  let currentExperience: any = null;
  let summaryLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse header fields with explicit labels
    if (line.startsWith('NAME:')) {
      parsed.header.name = line.replace('NAME:', '').trim();
      continue;
    }
    if (line.startsWith('EMAIL:')) {
      parsed.header.email = line.replace('EMAIL:', '').trim();
      continue;
    }
    if (line.startsWith('PHONE:')) {
      parsed.header.phone = line.replace('PHONE:', '').trim();
      continue;
    }
    if (line.startsWith('LOCATION:')) {
      parsed.header.location = line.replace('LOCATION:', '').trim();
      continue;
    }
    if (line.startsWith('LINKEDIN:')) {
      parsed.header.linkedin = line.replace('LINKEDIN:', '').trim();
      continue;
    }
    
    // Detect section headers
    if (line === 'SUMMARY:') {
      currentSection = 'summary';
      continue;
    }
    if (line === 'EXPERIENCE:') {
      currentSection = 'experience';
      continue;
    }
    if (line === 'SKILLS:') {
      currentSection = 'skills';
      continue;
    }
    if (line === 'EDUCATION:') {
      currentSection = 'education';
      continue;
    }
    
    // Process current section
    switch (currentSection) {
      case 'summary':
        summaryLines.push(line);
        break;
        
      case 'experience':
        // Check for company header line: "Company | Location | Dates"
        if (line.includes(' | ') && (line.includes('–') || line.includes('Present'))) {
          // Save previous experience if exists
          if (currentExperience) {
            parsed.experience.push(currentExperience);
          }
          
          const parts = line.split(' | ');
          currentExperience = {
            company: parts[0]?.trim() || '',
            location: parts[1]?.trim() || '',
            dates: parts[2]?.trim() || '',
            title: '',
            bulletPoints: [],
          };
        } else if (currentExperience && line.startsWith('•')) {
          // Bullet point
          currentExperience.bulletPoints.push(line.replace('•', '').trim());
        } else if (currentExperience && !currentExperience.title && line.trim() !== '') {
          // Job title (first non-bullet line after company header)
          currentExperience.title = line;
        }
        break;
        
      case 'skills':
        // Parse "Category: skill1, skill2, skill3" format
        if (line.includes(':')) {
          const [category, skillsStr] = line.split(':', 2);
          const skills = skillsStr.split(',').map(s => s.trim()).filter(s => s);
          parsed.skills.push({
            category: category.trim(),
            items: skills,
          });
        }
        break;
        
      case 'education':
        // Parse "Institution | Location" then "Degree" format
        if (line.includes(' | ')) {
          const [institution, location] = line.split(' | ', 2);
          // Look ahead for degree on next line
          const nextLine = lines[i + 1];
          parsed.education.push({
            institution: institution.trim(),
            location: location.trim(),
            degree: nextLine?.trim() || '',
          });
          // Skip the degree line since we consumed it
          if (nextLine) i++;
        } else if (parsed.education.length === 0) {
          // Simple format without location
          parsed.education.push({
            institution: line,
            location: '',
            degree: '',
          });
        }
        break;
    }
  }
  
  // Finalize parsing
  parsed.summary = summaryLines.join(' ');
  
  // Add any remaining experience
  if (currentExperience) {
    parsed.experience.push(currentExperience);
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
          {/* Contact info on one line separated by | */}
          <Text style={styles.contact}>
            {[
              parsed.header.location,
              parsed.header.phone, 
              parsed.header.email,
              parsed.header.linkedin || 'LinkedIn: Not provided'
            ].filter(Boolean).join(' | ')}
          </Text>
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
                <Text style={styles.company}>
                  {job.company}{job.location ? ` | ${job.location}` : ''}
                </Text>
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
            {parsed.skills.map((skillGroup, index) => (
              <Text key={index} style={styles.skillsList}>
                <Text style={styles.jobTitle}>{skillGroup.category}:</Text> {skillGroup.items.join(', ')}
              </Text>
            ))}
          </View>
        )}

        {/* Education */}
        {parsed.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {parsed.education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>
                  {edu.institution}{edu.location ? ` | ${edu.location}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}