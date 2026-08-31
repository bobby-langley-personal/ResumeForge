export interface ParsedRole {
  title: string;
  dates: string;
  bulletPoints: string[];
}

export interface ExperienceGroup {
  company: string;
  location: string;
  roles: ParsedRole[];
}

export interface ProjectEntry {
  name: string;
  techStack: string;
  description: string;
  bullets: string[];
}

export interface ParsedResume {
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

// Returns true if a string looks like a date range (year or "Present")
function looksLikeDateRange(s: string): boolean {
  return /(\d{4}|Present|Current)/i.test(s.trim());
}

export function parseResumeText(resumeText: string): ParsedResume {
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
          const stripped = line.replace(/^[\s\u2022\u25E6\u25AA\u25B8\u2192\u00B7•◦▪▸→·\-\*–—]+/, '').trim();
          if (stripped && !looksLikeDateRange(stripped)) {
            const lastRole = currentGroup.roles[currentGroup.roles.length - 1];
            if (looksLikeDateRange(line) && !lastRole.dates) {
              lastRole.dates = line.trim();
            } else if (stripped) {
              lastRole.bulletPoints.push(stripped);
            }
          }
        } else if (currentGroup) {
          currentGroup.roles.push({ title: line, dates: '', bulletPoints: [] });
        }
        break;
      }

      case 'projects': {
        if (line.includes(' | ')) {
          const parts = line.split(' | ');
          const right = parts.slice(1).join(' | ').trim();
          if (!looksLikeDateRange(right)) {
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
          if (!currentProject.description) {
            currentProject.description = line;
          }
        }
        break;
      }

      case 'skills': {
        if (line.includes(':')) {
          const colonIndex = line.indexOf(':');
          const category = line.slice(0, colonIndex).trim();
          const skillsStr = line.slice(colonIndex + 1);
          const skills = skillsStr.split(/[,•|]/).map(s => s.trim()).filter(Boolean);
          if (skills.length > 0) parsed.skills.push({ category, items: skills });
        } else {
          const items = line.replace(/^[•\-]\s*/, '').split(/[,•|]/).map(s => s.trim()).filter(Boolean);
          if (items.length > 0) {
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
