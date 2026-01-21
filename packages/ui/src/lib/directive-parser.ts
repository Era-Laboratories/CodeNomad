/**
 * Directive Parser Utility
 * Parses markdown directive files into structured data for card views
 */

/**
 * A single parsed directive item
 */
export interface ParsedDirective {
  id: string                // Unique hash based on content + line number
  text: string              // The directive text (cleaned)
  section?: string          // Parent section from header
  type: "bullet" | "paragraph"
  lineNumber: number
  original: string          // Original markdown line
}

/**
 * A section containing directives
 */
export interface DirectiveSection {
  title: string
  directives: ParsedDirective[]
  level: number             // Header level (1-6)
  lineNumber: number
}

/**
 * Generate a simple hash for directive identification
 */
function generateId(content: string, lineNumber: number): string {
  let hash = 0
  const str = `${content}:${lineNumber}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `dir_${Math.abs(hash).toString(16)}`
}

/**
 * Clean directive text by removing markdown bullet markers
 */
function cleanDirectiveText(text: string): string {
  return text
    .replace(/^[-*+]\s+/, "")      // Remove list markers
    .replace(/^\d+\.\s+/, "")      // Remove numbered list markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // Remove bold
    .replace(/\*([^*]+)\*/g, "$1")      // Remove italic
    .replace(/`([^`]+)`/g, "$1")        // Remove inline code
    .trim()
}

/**
 * Check if a line is a header
 */
function isHeader(line: string): { isHeader: boolean; level: number; title: string } {
  const match = line.match(/^(#{1,6})\s+(.+)$/)
  if (match) {
    return { isHeader: true, level: match[1].length, title: match[2].trim() }
  }
  return { isHeader: false, level: 0, title: "" }
}

/**
 * Check if a line is a bullet point
 */
function isBulletPoint(line: string): boolean {
  return /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)
}

/**
 * Parse markdown content into structured directive sections
 */
export function parseDirectivesMarkdown(content: string): DirectiveSection[] {
  if (!content || typeof content !== "string") {
    return []
  }

  const lines = content.split("\n")
  const sections: DirectiveSection[] = []
  let currentSection: DirectiveSection | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) continue

    // Check for headers
    const headerInfo = isHeader(trimmedLine)
    if (headerInfo.isHeader) {
      // Save previous section if it has directives
      if (currentSection && currentSection.directives.length > 0) {
        sections.push(currentSection)
      }

      currentSection = {
        title: headerInfo.title,
        directives: [],
        level: headerInfo.level,
        lineNumber,
      }
      continue
    }

    // Check for bullet points
    if (isBulletPoint(trimmedLine)) {
      const cleanedText = cleanDirectiveText(trimmedLine)
      if (cleanedText) {
        const directive: ParsedDirective = {
          id: generateId(cleanedText, lineNumber),
          text: cleanedText,
          section: currentSection?.title,
          type: "bullet",
          lineNumber,
          original: line,
        }

        if (currentSection) {
          currentSection.directives.push(directive)
        } else {
          // Create a default section for orphan directives
          currentSection = {
            title: "General",
            directives: [directive],
            level: 1,
            lineNumber: 1,
          }
        }
      }
      continue
    }

    // Treat as paragraph directive if not a header and has content
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const directive: ParsedDirective = {
        id: generateId(trimmedLine, lineNumber),
        text: trimmedLine,
        section: currentSection?.title,
        type: "paragraph",
        lineNumber,
        original: line,
      }

      if (currentSection) {
        currentSection.directives.push(directive)
      } else {
        currentSection = {
          title: "General",
          directives: [directive],
          level: 1,
          lineNumber: 1,
        }
      }
    }
  }

  // Don't forget the last section
  if (currentSection && currentSection.directives.length > 0) {
    sections.push(currentSection)
  }

  return sections
}

/**
 * Convert parsed sections back to markdown
 */
export function directivesToMarkdown(sections: DirectiveSection[]): string {
  if (!sections || sections.length === 0) {
    return ""
  }

  const lines: string[] = []

  for (const section of sections) {
    // Add header
    const headerMarker = "#".repeat(section.level)
    lines.push(`${headerMarker} ${section.title}`)
    lines.push("")

    // Add directives
    for (const directive of section.directives) {
      if (directive.type === "bullet") {
        lines.push(`- ${directive.text}`)
      } else {
        lines.push(directive.text)
      }
    }

    lines.push("")
  }

  return lines.join("\n").trim() + "\n"
}

/**
 * Add a new directive to sections
 */
export function addDirective(
  sections: DirectiveSection[],
  text: string,
  sectionTitle?: string
): DirectiveSection[] {
  const newSections = sections.map(s => ({
    ...s,
    directives: [...s.directives],
  }))

  const cleanedText = cleanDirectiveText(text)
  const targetSection = sectionTitle || "General"

  // Find or create the section
  let section = newSections.find(s => s.title.toLowerCase() === targetSection.toLowerCase())

  if (!section) {
    // Create new section
    const lastLineNumber = newSections.length > 0
      ? Math.max(...newSections.flatMap(s => s.directives.map(d => d.lineNumber)), 0) + 2
      : 1

    section = {
      title: targetSection,
      directives: [],
      level: 2,
      lineNumber: lastLineNumber,
    }
    newSections.push(section)
  }

  // Add directive
  const lastDirectiveLine = section.directives.length > 0
    ? Math.max(...section.directives.map(d => d.lineNumber)) + 1
    : section.lineNumber + 1

  section.directives.push({
    id: generateId(cleanedText, lastDirectiveLine),
    text: cleanedText,
    section: section.title,
    type: "bullet",
    lineNumber: lastDirectiveLine,
    original: `- ${cleanedText}`,
  })

  return newSections
}

/**
 * Remove a directive by ID
 */
export function removeDirective(sections: DirectiveSection[], id: string): DirectiveSection[] {
  return sections
    .map(section => ({
      ...section,
      directives: section.directives.filter(d => d.id !== id),
    }))
    .filter(section => section.directives.length > 0)
}

/**
 * Update a directive's text by ID
 */
export function updateDirective(
  sections: DirectiveSection[],
  id: string,
  newText: string
): DirectiveSection[] {
  const cleanedText = cleanDirectiveText(newText)

  return sections.map(section => ({
    ...section,
    directives: section.directives.map(directive =>
      directive.id === id
        ? {
            ...directive,
            text: cleanedText,
            original: directive.type === "bullet" ? `- ${cleanedText}` : cleanedText,
          }
        : directive
    ),
  }))
}

/**
 * Get all unique section titles from parsed sections
 */
export function getSectionTitles(sections: DirectiveSection[]): string[] {
  return sections.map(s => s.title)
}

/**
 * Get total directive count
 */
export function getDirectiveCount(sections: DirectiveSection[]): number {
  return sections.reduce((count, section) => count + section.directives.length, 0)
}

/**
 * Find a directive by ID
 */
export function findDirectiveById(
  sections: DirectiveSection[],
  id: string
): ParsedDirective | null {
  for (const section of sections) {
    const directive = section.directives.find(d => d.id === id)
    if (directive) return directive
  }
  return null
}

/**
 * Get section color based on title
 */
export function getSectionColor(title: string): string {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes("security") || lowerTitle.includes("prohibited")) {
    return "red"
  }
  if (lowerTitle.includes("code") || lowerTitle.includes("style") || lowerTitle.includes("format")) {
    return "blue"
  }
  if (lowerTitle.includes("git") || lowerTitle.includes("workflow")) {
    return "purple"
  }
  if (lowerTitle.includes("test") || lowerTitle.includes("testing")) {
    return "green"
  }
  if (lowerTitle.includes("architecture") || lowerTitle.includes("structure")) {
    return "orange"
  }
  if (lowerTitle.includes("dependency") || lowerTitle.includes("dependencies")) {
    return "cyan"
  }

  return "gray"
}
