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

interface ProjectEntry {
  name: string;
  techStack: string;
  description: string;
  bullets: string[];
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
  projects: ProjectEntry[];
  skills: Array<{
    category: string;
    items: string[];
  }>;
  education: Array<{
    institution: string;
    location: string;
    degree: string;
  }>;
  certifications: string[];
}

function makeStyles(compact: boolean) {
  const s = compact ? 0.85 : 1;
  const r = (v: number) => Math.round(v * s);

  return StyleSheet.create({
    page: {
      flexDirection: 'column',
      flexWrap: 'nowrap',
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
      maxLines: 2,
      flexWrap: 'wrap',
    },
    contact: {
      fontSize: 10,
      marginBottom: 3,
      flexWrap: 'wrap',
      wordBreak: 'break-word',
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
      flexWrap: 'wrap',
      wordBreak: 'break-word',
    },
    experienceGroup: {
      marginBottom: r(8),
    },
    companyLine: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      marginBottom: r(2),
      flexWrap: 'wrap',
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
      flexWrap: 'wrap',
      marginBottom: r(2),
    },
    jobTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      flexWrap: 'wrap',
      flexShrink: 1,
    },
    jobDates: {
      fontSize: 10,
      fontStyle: 'italic',
      flexShrink: 0,
    },
    bulletPoint: {
      fontSize: 10,
      marginBottom: 2,
      marginLeft: 12,
      flexWrap: 'wrap',
      wordBreak: 'break-word',
    },
    skillsList: {
      fontSize: 10,
      marginBottom: 4,
      lineHeight: 1.3,
      flexWrap: 'wrap',
      wordBreak: 'break-word',
    },
    educationItem: {
      marginBottom: 6,
    },
    degree: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      flexWrap: 'wrap',
    },
    institution: {
      fontSize: 10,
      flexWrap: 'wrap',
    },
    // Project section styles
    projectGroup: {
      marginBottom: r(8),
    },
    projectHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 2,
    },
    projectName: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 10,
    },
    projectTechStack: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#444444',
      flexWrap: 'wrap',
      flexShrink: 1,
    },
    projectDescription: {
      fontFamily: 'Helvetica-Oblique',
      fontSize: 10,
      marginBottom: 3,
      flexWrap: 'wrap',
      wordBreak: 'break-word',
    },
  });
}

// Returns true if a string looks like a date range (year or "Present")
function looksLikeDateRange(s: string): boolean {
  return /(\d{4}|Present|Current)/i.test(s.trim());
}

// Returns true if a string looks like a tech stack (has commas or tech keywords, no year)
function looksLikeTechStack(s: string): boolean {
  if (looksLikeDateRange(s)) return false;
  // Has multiple items separated by commas, or contains common tech terms
  return s.includes(',') || /\b(js|ts|react|node|python|java|go|rust|swift|kotlin|sql|api|aws|css|html)\b/i.test(s);
}

function parseResumeText(resumeText: string): ParsedResume {
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);

  const parsed: ParsedResume = {
    header: { name: '', email: '', phone: '', location: '', linkedin: '' },
    summary: '',
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  };

  let currentSection = '';
  let currentGroup: ExperienceGroup | null = null;
  let currentProject: ProjectEntry | null = null;
  let summaryLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Header fields
    if (line.startsWith('NAME:')) { parsed.header.name = line.replace('NAME:', '').trim(); continue; }
    if (line.startsWith('EMAIL:')) { parsed.header.email = line.replace('EMAIL:', '').trim(); continue; }
    if (line.startsWith('PHONE:')) { parsed.header.phone = line.replace('PHONE:', '').trim(); continue; }
    if (line.startsWith('LOCATION:')) { parsed.header.location = line.replace('LOCATION:', '').trim(); continue; }
    if (line.startsWith('LINKEDIN:')) {
      const raw = line.replace('LINKEDIN:', '').trim();
      // Clean up common label prefixes
      parsed.header.linkedin = raw
        .replace(/^linkedin url:\s*/i, '')
        .replace(/^linkedin profile:\s*/i, '')
        .replace(/^linkedin:\s*/i, '')
        .trim();
      continue;
    }

    // Inline contact detection in pre-section header lines (first 15 lines)
    if (!currentSection && i < 15) {
      if (!parsed.header.phone) {
        const phoneMatch = line.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
        if (phoneMatch) parsed.header.phone = phoneMatch[0].trim();
      }
      if (!parsed.header.email) {
        const emailMatch = line.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
        if (emailMatch) parsed.header.email = emailMatch[0];
      }
      if (!parsed.header.linkedin) {
        const linkedInMatch = line.match(/linkedin\.com\/in\/[\w\-]+/i);
        if (linkedInMatch) parsed.header.linkedin = linkedInMatch[0];
      }
      if (!parsed.header.location) {
        const locMatch = line.match(/^([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b/);
        if (locMatch) parsed.header.location = locMatch[0].trim();
      }
      // First non-empty, non-contact, non-section line is the name
      if (!parsed.header.name && !line.match(/[@\d|]/)) {
        parsed.header.name = line.replace(/[*#`_~]/g, '').trim();
      }
    }

    // Also detect inline LinkedIn URLs in header lines (first 10 lines, keep for AI format)
    if (i < 10 && !parsed.header.linkedin) {
      const linkedInMatch = line.match(/linkedin\.com\/in\/[\w-]+/i);
      if (linkedInMatch) parsed.header.linkedin = linkedInMatch[0];
    }

    // Section headers — normalize to handle AI format drift (missing colon, markdown
    // bold, alternate names like "Work History", "Employment", etc.)
    const sectionKey = line.replace(/[*#`_~]/g, '').replace(/:+$/, '').trim().toUpperCase();
    if (sectionKey === 'SUMMARY' || sectionKey === 'PROFESSIONAL SUMMARY' ||
        sectionKey === 'OBJECTIVE' || sectionKey === 'CAREER OBJECTIVE' || sectionKey === 'PROFILE') {
      currentSection = 'summary'; continue;
    }
    if (sectionKey === 'EXPERIENCE' || sectionKey === 'PROFESSIONAL EXPERIENCE' ||
        sectionKey === 'WORK EXPERIENCE' || sectionKey === 'WORK HISTORY' ||
        sectionKey === 'EMPLOYMENT HISTORY' || sectionKey === 'EMPLOYMENT' ||
        sectionKey === 'RELEVANT EXPERIENCE' || sectionKey === 'CAREER HISTORY') {
      currentSection = 'experience'; continue;
    }
    if (sectionKey === 'PROJECTS' || sectionKey === 'PERSONAL PROJECTS' || sectionKey === 'SIDE PROJECTS') {
      if (currentGroup) { parsed.experience.push(currentGroup); currentGroup = null; }
      if (currentProject) { parsed.projects.push(currentProject); currentProject = null; }
      currentSection = 'projects';
      continue;
    }
    if (sectionKey === 'SKILLS' || sectionKey === 'TECHNICAL SKILLS' || sectionKey === 'CORE SKILLS' ||
        sectionKey === 'SKILLS & EXPERTISE' || sectionKey === 'KEY SKILLS' || sectionKey === 'AREAS OF EXPERTISE' ||
        sectionKey === 'CORE COMPETENCIES' || sectionKey === 'COMPETENCIES' || sectionKey === 'TECHNOLOGIES' ||
        sectionKey === 'TOOLS & TECHNOLOGIES' || sectionKey === 'TOOLS AND TECHNOLOGIES') {
      if (currentGroup) { parsed.experience.push(currentGroup); currentGroup = null; }
      if (currentProject) { parsed.projects.push(currentProject); currentProject = null; }
      currentSection = 'skills';
      continue;
    }
    if (sectionKey === 'EDUCATION' || sectionKey === 'EDUCATION & TRAINING' || sectionKey === 'ACADEMIC BACKGROUND') {
      if (currentGroup) { parsed.experience.push(currentGroup); currentGroup = null; }
      currentSection = 'education';
      continue;
    }
    if (sectionKey === 'CERTIFICATIONS' || sectionKey === 'CERTIFICATES' || sectionKey === 'LICENSES' ||
        sectionKey === 'AWARDS' || sectionKey === 'HONORS' || sectionKey === 'ACHIEVEMENTS') {
      if (currentGroup) { parsed.experience.push(currentGroup); currentGroup = null; }
      currentSection = 'certifications';
      continue;
    }

    switch (currentSection) {
      case 'summary':
        summaryLines.push(line);
        break;

      case 'experience': {
        if (line.includes(' | ')) {
          const parts = line.split(' | ');

          if (parts.length >= 3) {
            // Legacy format backward compat: "Company | Location | Dates"
            if (currentGroup) parsed.experience.push(currentGroup);
            currentGroup = {
              company: parts[0].trim(),
              location: parts[1].trim(),
              roles: [{ title: '', dates: parts.slice(2).join(' | ').trim(), bulletPoints: [] }],
            };
          } else if (parts.length === 2) {
            if (looksLikeDateRange(parts[1])) {
              // Role line: "Job Title | Dates"
              if (currentGroup) {
                const last = currentGroup.roles[currentGroup.roles.length - 1];
                if (last && !last.title) {
                  last.title = parts[0].trim();
                  last.dates = parts[1].trim();
                } else {
                  currentGroup.roles.push({ title: parts[0].trim(), dates: parts[1].trim(), bulletPoints: [] });
                }
              }
            } else {
              // Company line: "Company | Location"
              if (currentGroup) parsed.experience.push(currentGroup);
              currentGroup = { company: parts[0].trim(), location: parts[1].trim(), roles: [] };
            }
          }
        } else if (currentGroup?.roles.length) {
          // Any non-pipe line when we have an active role — treat as bullet.
          // PDFs use many bullet chars (•, ◦, ▪, ▸, *, -, custom glyphs) or none at all.
          // Strip any leading bullet-like character and treat the content as a bullet point.
          const stripped = line.replace(/^[\s\u2022\u25E6\u25AA\u25B8\u2192\u00B7•◦▪▸→·\-\*–—]+/, '').trim();
          if (stripped && !looksLikeDateRange(stripped)) {
            const lastRole = currentGroup.roles[currentGroup.roles.length - 1];
            // If this line looks like a standalone date, update the role dates instead
            if (looksLikeDateRange(line) && !lastRole.dates) {
              lastRole.dates = line.trim();
            } else if (stripped) {
              lastRole.bulletPoints.push(stripped);
            }
          }
        } else if (currentGroup) {
          // Company set but no roles yet — this line is the job title
          currentGroup.roles.push({ title: line, dates: '', bulletPoints: [] });
        }
        break;
      }

      case 'projects': {
        if (line.includes(' | ')) {
          const parts = line.split(' | ');
          const right = parts.slice(1).join(' | ').trim();
          if (!looksLikeDateRange(right)) {
            // Project header: "Name | Tech Stack"
            if (currentProject) parsed.projects.push(currentProject);
            currentProject = {
              name: parts[0].trim(),
              techStack: right,
              description: '',
              bullets: [],
            };
          }
        } else if (line.startsWith('•') || line.startsWith('-')) {
          if (currentProject) {
            currentProject.bullets.push(line.replace(/^[•\-]\s*/, '').trim());
          }
        } else if (currentProject) {
          // Description line — first non-bullet after header
          if (!currentProject.description) {
            currentProject.description = line;
          }
        }
        break;
      }

      case 'skills': {
        if (line.includes(':')) {
          // Category: item1, item2 format
          const colonIndex = line.indexOf(':');
          const category = line.slice(0, colonIndex).trim();
          const skillsStr = line.slice(colonIndex + 1);
          const skills = skillsStr.split(/[,•|]/).map(s => s.trim()).filter(Boolean);
          if (skills.length > 0) parsed.skills.push({ category, items: skills });
        } else {
          // Flat list: comma-separated, bullet-separated, or plain line
          const items = line.replace(/^[•\-]\s*/, '').split(/[,•|]/).map(s => s.trim()).filter(Boolean);
          if (items.length > 0) {
            // Append to last skills group if it has no category, else create new one
            const last = parsed.skills[parsed.skills.length - 1];
            if (last && last.category === '') {
              last.items.push(...items);
            } else {
              parsed.skills.push({ category: '', items });
            }
          }
        }
        break;
      }

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
        } else if (parsed.education.length === 0 || !looksLikeDateRange(line)) {
          if (parsed.education.length === 0) {
            parsed.education.push({ institution: line, location: '', degree: '' });
          } else {
            const last = parsed.education[parsed.education.length - 1];
            if (!last.degree) last.degree = line;
          }
        }
        break;

      case 'certifications':
        if (!line.startsWith('•') && !line.startsWith('-')) {
          parsed.certifications.push(line);
        } else {
          parsed.certifications.push(line.replace(/^[•\-]\s*/, '').trim());
        }
        break;
    }
  }

  parsed.summary = summaryLines.join(' ');
  if (currentGroup) parsed.experience.push(currentGroup);
  if (currentProject) parsed.projects.push(currentProject);

  return parsed;
}

export default function ResumePDF({ resumeText, candidateName, company, jobTitle, compact = false }: ResumePDFProps) {
  const styles = makeStyles(compact);
  const parsed = parseResumeText(resumeText);

  if (!parsed.header.name && candidateName) {
    parsed.header.name = candidateName;
  }

  // Build contact line — omit any empty fields, never show placeholders
  const contactParts = [
    parsed.header.location,
    parsed.header.phone,
    parsed.header.email,
    parsed.header.linkedin,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name} wrap={true}>{parsed.header.name || candidateName}</Text>
          {contactParts.length > 0 && (
            <Text style={styles.contact} wrap={true}>
              {contactParts.join(' | ')}
            </Text>
          )}
        </View>

        {/* Summary — only rendered when non-empty */}
        {parsed.summary && parsed.summary.trim().length > 0 && (
          <View wrap={false} style={{ flexShrink: 1, width: '100%' }}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text} wrap={true}>{parsed.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {parsed.experience.length > 0 && (
          <View style={{ flexShrink: 1, width: '100%' }}>
            {/* Header + first company line kept together — prevents orphaned section title */}
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <Text style={styles.companyLine} wrap={true}>
                {parsed.experience[0].company}{parsed.experience[0].location ? ` | ${parsed.experience[0].location}` : ''}
              </Text>
            </View>
            {parsed.experience.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.experienceGroup}>
                {/* Company line: already rendered above for first group */}
                {groupIndex > 0 && (
                  <Text style={styles.companyLine} wrap={true}>
                    {group.company}{group.location ? ` | ${group.location}` : ''}
                  </Text>
                )}
                {/* Roles — each with title + dates on same line */}
                {group.roles.map((role, roleIndex) => (
                  <View key={roleIndex} style={roleIndex === 0 ? styles.roleEntry : styles.additionalRoleEntry}>
                    <View style={styles.jobHeader}>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.jobTitle} wrap={true}>{role.title}</Text>
                      </View>
                      <Text style={styles.jobDates}>{role.dates}</Text>
                    </View>
                    {role.bulletPoints.map((bullet, bulletIndex) => (
                      <Text key={bulletIndex} style={styles.bulletPoint} wrap={true}>
                        • {bullet}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {parsed.projects.length > 0 && (
          <View style={{ flexShrink: 1, width: '100%' }}>
            {/* Header + first project name kept together — prevents orphaned section title */}
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Projects</Text>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{parsed.projects[0].name}</Text>
                {parsed.projects[0].techStack && (
                  <Text style={styles.projectTechStack} wrap={true}> | {parsed.projects[0].techStack}</Text>
                )}
              </View>
            </View>
            {parsed.projects.map((project, index) => (
              <View key={index} style={styles.projectGroup}>
                {/* Project header: already rendered above for first project */}
                {index > 0 && (
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    {project.techStack && (
                      <Text style={styles.projectTechStack} wrap={true}> | {project.techStack}</Text>
                    )}
                  </View>
                )}
                {project.description && (
                  <Text style={styles.projectDescription} wrap={true}>{project.description}</Text>
                )}
                {project.bullets.map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={styles.bulletPoint} wrap={true}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {parsed.skills.length > 0 && (
          <View style={{ flexShrink: 1, width: '100%' }}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Skills</Text>
              <Text style={styles.skillsList} wrap={true}>
                {parsed.skills[0].category
                  ? <><Text style={styles.jobTitle}>{parsed.skills[0].category}:</Text> {parsed.skills[0].items.join(', ')}</>
                  : parsed.skills[0].items.join(', ')
                }
              </Text>
            </View>
            {parsed.skills.slice(1).map((skillGroup, index) => (
              <Text key={index + 1} style={styles.skillsList} wrap={true}>
                {skillGroup.category
                  ? <><Text style={styles.jobTitle}>{skillGroup.category}:</Text> {skillGroup.items.join(', ')}</>
                  : skillGroup.items.join(', ')
                }
              </Text>
            ))}
          </View>
        )}

        {/* Certifications */}
        {parsed.certifications.length > 0 && (
          <View style={{ flexShrink: 1, width: '100%' }}>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <Text style={styles.text} wrap={true}>{parsed.certifications[0]}</Text>
            </View>
            {parsed.certifications.slice(1).map((cert, index) => (
              <Text key={index + 1} style={styles.text} wrap={true}>{cert}</Text>
            ))}
          </View>
        )}

        {/* Education */}
        {parsed.education.length > 0 && (
          <View style={{ flexShrink: 1, width: '100%' }}>
            {/* Header + first degree kept together — prevents orphaned section title */}
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Education</Text>
              <View style={styles.educationItem}>
                <Text style={styles.degree} wrap={true}>{parsed.education[0].degree}</Text>
                <Text style={styles.institution} wrap={true}>
                  {parsed.education[0].institution}{parsed.education[0].location ? ` | ${parsed.education[0].location}` : ''}
                </Text>
              </View>
            </View>
            {parsed.education.slice(1).map((edu, index) => (
              <View key={index + 1} style={styles.educationItem}>
                <Text style={styles.degree} wrap={true}>{edu.degree}</Text>
                <Text style={styles.institution} wrap={true}>
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
