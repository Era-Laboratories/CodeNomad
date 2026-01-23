import AnsiToHtml from "ansi-to-html"

const ESC_CHAR = "\u001b"
const ANSI_LITERAL_PATTERN = /\\u001b|\\x1b|\\033/
const ANSI_SGR_PATTERN = /\u001b\[[0-9;]*m/
const ANSI_NON_SGR_PATTERN = /\u001b\[[0-9;?]*[A-Za-ln-zA-LN-Z]/g

const ansiConverter = new AnsiToHtml({
  escapeXML: true,
})

export function hasAnsi(text: string): boolean {
  const normalized = normalizeAnsiText(text)
  return ANSI_SGR_PATTERN.test(normalized)
}

export function ansiToHtml(text: string): string {
  const normalized = normalizeAnsiText(text)
  const sanitized = stripNonSgrAnsi(normalized)
  return ansiConverter.toHtml(sanitized)
}

function normalizeAnsiText(text: string): string {
  if (!ANSI_LITERAL_PATTERN.test(text)) {
    return text
  }

  return text
    .replace(/\\u001b/gi, ESC_CHAR)
    .replace(/\\x1b/gi, ESC_CHAR)
    .replace(/\\033/g, ESC_CHAR)
}

function stripNonSgrAnsi(text: string): string {
  return text.replace(ANSI_NON_SGR_PATTERN, "")
}
