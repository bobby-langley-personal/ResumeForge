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
  compact?: boolean;
}

interface ParsedRole {
  title: string;
  dates: string;
  bulletPoints: string[];
}

interface ExperienceGroup {
  company: string;
  location: string;
  roles: ParsedRole[];
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
  experience: ExperienceGroup[];
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

function makeStyles(compact: boolean) {
  const s = compact ? 0.85 : 1;
  const r = (v: number) => Math.round(v * s);

  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      padding: 54,
      fontFamily: 'Helvetica',
      fontSize: 10,
      lineHeight: 1.3,
    },
    header: {
      marginBottom: r(16),
      textAlign: 'center',
    },
    name: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 12,
    },
    contact: {
      fontSize: 10,
      marginBottom: 3,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      marginTop: r(14),
      marginBottom: r(5),
      textTransform: 'uppercase',
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      paddingBottom: 2,
    },
    text: {
      fontSize: 10,
      marginBottom: r(5),
      textAlign: 'justify',
    },
    experienceGroup: {
      marginBottom: r(8),
    },
    companyLine: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      marginBottom: r(2),
    },
    roleEntry: {
      marginBottom: r(5),
    },
    additionalRoleEntry: {
      marginTop: r(3),
      marginBottom: r(5),
    },
    jobHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: r(2),
    },
    jobTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
    },
    jobDates: {
      fontSize: 10,
      fontStyle: 'italic',
    },
    bulletPoint: {
      fontSize: 10,
      marginBottom: 2,
      marginLeft: 12,
    },
    skillsList: {
      fontSize: 10,
      marginBottom: 4,
      lineHeight: 1.3,
    },
    educationItem: {
      marginBottom: 6,
    },
    degree: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
    },
    institution: {
      fontSize: 10,
    },
  });
}

// Returns true if a string looks like a date range (year or "Present")
function looksLikeDateRange(s: string): boolean {
  return /(\d{4}|Present|Current)/i.test(s.trim());
}

function parseResumeText(resumeText: string): ParsedResume {
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);

  const parsed: ParsedResume = {
    header: { name: '', email: '', phone: '', location: '', linkedin: '' },
    summary: '',
    experience: [],
    skills: [],
    education: [],
  };

  let currentSection = '';
  let currentGroup: ExperienceGroup | null = null;
  let summaryLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Header fields
    if (line.startsWith('NAME:')) { parsed.header.name = line.replace('NAME:', '').trim(); continue; }
    if (line.startsWith('EMAIL:')) { parsed.header.email = line.replace('EMAIL:', '').trim(); continue; }
    if (line.startsWith('PHONE:')) { parsed.header.phone = line.replace('PHONE:', '').trim(); continue; }
    if (line.startsWith('LOCATION:')) { parsed.header.location = line.replace('LOCATION:', '').trim(); continue; }
    if (line.startsWith('LINKEDIN:')) { parsed.header.linkedin = line.replace('LINKEDIN:', '').trim(); continue; }

    // Section headers
    if (line === 'SUMMARY:') { currentSection = 'summary'; continue; }
    if (line === 'EXPERIENCE:') { currentSection = 'experience'; continue; }
    if (line === 'SKILLS:') { currentSection = 'skills'; continue; }
    if (line === 'EDUCATION:') { currentSection = 'education'; continue; }

    switch (currentSection) {
      case 'summary':
        summaryLines.push(line);
        break;

      case 'experience': {
        if (line.includes(' | ')) {
          const parts = line.split(' | ');

          if (parts.length >= 3) {
            // Legacy format backward compat: "Company | Location | Dates"
            // Start a new company group; dates roll into first role for fallback display
            if (currentGroup) parsed.experience.push(currentGroup);
            currentGroup = {
              company: parts[0].trim(),
              location: parts[1].trim(),
              roles: [{ title: '', dates: parts.slice(2).join(' | ').trim(), bulletPoints: [] }],
            };
          } else if (parts.length === 2) {
            if (looksLikeDateRange(parts[1])) {
              // New format role line: "Job Title | Dates"
              if (currentGroup) {
                // If there's an empty-title placeholder (from legacy 3-part company line), fill it
                const last = currentGroup.roles[currentGroup.roles.length - 1];
                if (last && !last.title) {
                  last.title = parts[0].trim();
                  // Keep the dates from the company line if we don't have per-role dates yet
                  if (!last.dates) last.dates = parts[1].trim();
                  else last.dates = parts[1].trim(); // prefer per-role dates
                } else {
                  currentGroup.roles.push({ title: parts[0].trim(), dates: parts[1].trim(), bulletPoints: [] });
                }
              }
            } else {
              // New format company line: "Company | Location"
              if (currentGroup) parsed.experience.push(currentGroup);
              currentGroup = { company: parts[0].trim(), location: parts[1].trim(), roles: [] };
            }
          }
        } else if ((line.startsWith('•') || line.startsWith('-')) && currentGroup?.roles.length) {
          // Bullet point — strip leading • or -
          const lastRole = currentGroup.roles[currentGroup.roles.length - 1];
          lastRole.bulletPoints.push(line.replace(/^[•\-]\s*/, '').trim());
        } else if (currentGroup) {
          // Plain line — job title for the latest role if it has no title yet,
          // or start a new title-only role if no roles exist yet
          if (currentGroup.roles.length === 0) {
            currentGroup.roles.push({ title: line, dates: '', bulletPoints: [] });
          } else {
            const lastRole = currentGroup.roles[currentGroup.roles.length - 1];
            if (!lastRole.title) lastRole.title = line;
          }
        }
        break;
      }

      case 'skills':
        if (line.includes(':')) {
          const colonIndex = line.indexOf(':');
          const category = line.slice(0, colonIndex).trim();
          const skillsStr = line.slice(colonIndex + 1);
          const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
          parsed.skills.push({ category, items: skills });
        }
        break;

      case 'education':
        if (line.includes(' | ')) {
          const [institution, location] = line.split(' | ', 2);
          const nextLine = lines[i + 1];
          parsed.education.push({
            institution: institution.trim(),
            location: location.trim(),
            degree: nextLine?.trim() || '',
          });
          if (nextLine) i++;
        } else if (parsed.education.length === 0) {
          parsed.education.push({ institution: line, location: '', degree: '' });
        }
        break;
    }
  }

  parsed.summary = summaryLines.join(' ');
  if (currentGroup) parsed.experience.push(currentGroup);

  return parsed;
}

export default function ResumePDF({ resumeText, candidateName, company, jobTitle, compact = false }: ResumePDFProps) {
  const styles = makeStyles(compact);
  const parsed = parseResumeText(resumeText);

  if (!parsed.header.name && candidateName) {
    parsed.header.name = candidateName;
  }

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{parsed.header.name || candidateName}</Text>
          <Text style={styles.contact}>
            {[
              parsed.header.location,
              parsed.header.phone,
              parsed.header.email,
              parsed.header.linkedin || 'LinkedIn: Not provided',
            ].filter(Boolean).join(' | ')}
          </Text>
        </View>

        {/* Summary — only rendered when non-empty */}
        {parsed.summary && parsed.summary.trim().length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{parsed.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {parsed.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {parsed.experience.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.experienceGroup}>
                {/* Company name + location — bold, no dates */}
                <Text style={styles.companyLine}>
                  {group.company}{group.location ? ` | ${group.location}` : ''}
                </Text>
                {/* Roles — each with title + dates on same line */}
                {group.roles.map((role, roleIndex) => (
                  <View key={roleIndex} style={roleIndex === 0 ? styles.roleEntry : styles.additionalRoleEntry}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle}>{role.title}</Text>
                      <Text style={styles.jobDates}>{role.dates}</Text>
                    </View>
                    {role.bulletPoints.map((bullet, bulletIndex) => (
                      <Text key={bulletIndex} style={styles.bulletPoint}>
                        • {bullet}
                      </Text>
                    ))}
                  </View>
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
