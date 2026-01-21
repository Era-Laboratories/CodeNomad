/**
 * Directive Formatter Utility
 * Formats and cleans up directive input, with optional AI enhancement
 */

export interface FormatResult {
  formatted: string        // Cleaned directive text
  suggestedSection: string // Which section it belongs in
}

/**
 * Section keywords for categorization
 */
const sectionKeywords: Record<string, string[]> = {
  "Security": [
    "security", "secret", "credential", "password", "api key", "token",
    "sensitive", "encrypt", "auth", "permission", "access", "commit",
    "never commit", "do not commit"
  ],
  "Code Style": [
    "style", "format", "formatting", "lint", "prettier", "eslint",
    "convention", "naming", "camelcase", "pascalcase", "indent"
  ],
  "Testing Requirements": [
    "test", "testing", "unit test", "integration", "e2e", "coverage",
    "playwright", "jest", "vitest", "spec"
  ],
  "Git Workflow": [
    "git", "branch", "commit", "merge", "pr", "pull request",
    "conventional commits", "rebase", "review"
  ],
  "Architecture": [
    "architecture", "structure", "folder", "directory", "module",
    "component", "package", "monorepo", "layout"
  ],
  "Dependencies": [
    "dependency", "dependencies", "package", "npm", "yarn", "pnpm",
    "library", "install", "upgrade", "version"
  ],
  "Prohibited Actions": [
    "never", "do not", "don't", "prohibited", "forbidden", "avoid",
    "must not", "should not", "shouldn't"
  ],
}

/**
 * Format directive text using rule-based cleanup
 */
function cleanDirectiveText(input: string): string {
  let text = input.trim()

  // Remove common prefixes
  text = text.replace(/^(please\s+)?/i, "")
  text = text.replace(/^(make sure\s+)?/i, "")
  text = text.replace(/^(ensure\s+)?/i, "")
  text = text.replace(/^(we should\s+)?/i, "")
  text = text.replace(/^(always\s+)?/i, "")

  // Capitalize first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  // Remove trailing period if present (directives often don't need them)
  text = text.replace(/\.+$/, "")

  // Ensure the text is imperative or descriptive
  // Common transformations:
  // "we use X" -> "Use X"
  // "you should X" -> "X"
  text = text.replace(/^We\s+use\s+/i, "Use ")
  text = text.replace(/^You\s+should\s+/i, "")
  text = text.replace(/^Developers\s+should\s+/i, "")
  text = text.replace(/^The\s+team\s+should\s+/i, "")

  return text
}

/**
 * Suggest a section based on directive content
 */
function suggestSection(text: string, existingSections?: string[]): string {
  const lowerText = text.toLowerCase()

  // Find best matching section
  let bestMatch = "General"
  let highestScore = 0

  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    let score = 0
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += keyword.length // Longer keywords = more specific match
      }
    }
    if (score > highestScore) {
      highestScore = score
      bestMatch = section
    }
  }

  // If we found a match, try to use an existing section with similar name
  if (existingSections && existingSections.length > 0 && highestScore > 0) {
    const normalizedMatch = bestMatch.toLowerCase()
    for (const existing of existingSections) {
      const normalizedExisting = existing.toLowerCase()
      if (
        normalizedExisting.includes(normalizedMatch) ||
        normalizedMatch.includes(normalizedExisting)
      ) {
        return existing
      }
    }
  }

  return bestMatch
}

/**
 * Format a natural language directive using rule-based cleanup
 * Falls back to this when AI is unavailable
 */
export function formatDirectiveRuleBased(
  input: string,
  existingSections?: string[]
): FormatResult {
  const formatted = cleanDirectiveText(input)
  const suggestedSection = suggestSection(formatted, existingSections)

  return {
    formatted,
    suggestedSection,
  }
}

/**
 * Format a directive with optional AI enhancement
 * Currently uses rule-based formatting, but designed to be extended with AI
 */
export async function formatDirectiveWithAI(
  input: string,
  _existingDirectives: string,
  _type: "project" | "global",
  existingSections?: string[]
): Promise<FormatResult> {
  // For now, use rule-based formatting
  // TODO: Add AI formatting when an API endpoint is available
  // The API would take the input and existing context to:
  // 1. Clean up the language
  // 2. Make it consistent with existing directives
  // 3. Suggest the most appropriate section

  return formatDirectiveRuleBased(input, existingSections)
}

/**
 * Validate directive text
 */
export function validateDirective(text: string): { valid: boolean; error?: string } {
  if (!text || !text.trim()) {
    return { valid: false, error: "Directive text cannot be empty" }
  }

  if (text.length < 5) {
    return { valid: false, error: "Directive text is too short" }
  }

  if (text.length > 500) {
    return { valid: false, error: "Directive text is too long (max 500 characters)" }
  }

  // Check for common issues
  if (text.match(/^[a-z]/)) {
    // First letter is lowercase - this will be fixed by formatting
  }

  return { valid: true }
}

/**
 * Get suggested sections for a new directive
 */
export function getSuggestedSections(): string[] {
  return Object.keys(sectionKeywords)
}
