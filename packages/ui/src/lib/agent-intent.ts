/**
 * Classify prompt intent to suggest an agent for auto-routing.
 * Pure heuristic — no API calls, zero latency.
 * Returns the agent name or null if no match / agent unavailable.
 */

type PatternRule = {
  patterns: RegExp[]
  agent: string
}

const RULES: PatternRule[] = [
  {
    agent: "plan",
    patterns: [
      /\bplan\b/i,
      /\bdesign\b/i,
      /\barchitect\b/i,
      /\bdocument\b/i,
      /\boutline\b/i,
      /\bspec\b/i,
      /\brfc\b/i,
      /\bproposal\b/i,
    ],
  },
  {
    agent: "explore",
    patterns: [
      /\bfind\b/i,
      /\bwhere is\b/i,
      /\bsearch\b/i,
      /\bexplore\b/i,
      /\bhow does\b/i,
      /\bwhat is\b/i,
      /\bwhich file\b/i,
      /\blook for\b/i,
      /\blocate\b/i,
    ],
  },
  {
    agent: "reviewer",
    patterns: [
      /\breview\b/i,
      /\baudit\b/i,
      /\bcheck quality\b/i,
      /\bcode review\b/i,
    ],
  },
  {
    agent: "test-writer",
    patterns: [
      /\bwrite test/i,
      /\badd test/i,
      /\btest for\b/i,
      /\bspec for\b/i,
      /\bunit test/i,
      /\be2e test/i,
    ],
  },
  {
    agent: "debugger",
    patterns: [
      /\bdebug\b/i,
      /\bwhy is\b/i,
      /\bwhy does\b/i,
      /\bnot working\b/i,
      /\bbroken\b/i,
      /\berror\b/i,
      /\bcrash\b/i,
      /\bstack trace\b/i,
    ],
  },
  {
    agent: "researcher",
    patterns: [
      /\bresearch\b/i,
      /\blook up\b/i,
      /\bwhat are the options\b/i,
      /\bcompare\b/i,
    ],
  },
]

export function classifyPromptIntent(
  prompt: string,
  availableAgents: string[],
): string | null {
  const trimmed = prompt.trimStart()

  // Slash commands — don't reroute
  if (trimmed.startsWith("/")) {
    return null
  }

  // Only scan first ~200 characters for intent signals
  const snippet = trimmed.slice(0, 200)

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(snippet)) {
        return availableAgents.includes(rule.agent) ? rule.agent : null
      }
    }
  }

  return null
}
