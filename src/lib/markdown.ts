import { marked } from "marked"
import { createHighlighter, type Highlighter, bundledLanguages } from "shiki/bundle/full"

const CORE_LANGUAGES = [
  "bash",
  "shell",
  "sh",
  "javascript",
  "typescript",
  "tsx",
  "jsx",
  "json",
  "yaml",
  "yml",
  "markdown",
  "md",
  "html",
  "css",
  "scss",
  "python",
  "go",
  "rust",
]

let highlighter: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null
let currentTheme: "light" | "dark" = "light"
let isInitialized = false

async function getOrCreateHighlighter() {
  if (highlighter) {
    return highlighter
  }

  if (highlighterPromise) {
    return highlighterPromise
  }

  const filteredLangs = CORE_LANGUAGES.filter((lang) => lang in bundledLanguages)

  highlighterPromise = createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: filteredLangs,
  })

  highlighter = await highlighterPromise
  highlighterPromise = null
  return highlighter
}

function setupRenderer(isDark: boolean) {
  if (!highlighter) return

  currentTheme = isDark ? "dark" : "light"

  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  const renderer = new marked.Renderer()

  renderer.code = (code: string, lang: string | undefined) => {
    const encodedCode = encodeURIComponent(code)
    const escapedLang = lang ? escapeHtml(lang) : ""

    const header = `
      <div class="code-block-header">
        <span class="code-block-language">${escapedLang || ""}</span>
        <button class="code-block-copy" data-code="${encodedCode}">
          <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span class="copy-text">Copy</span>
        </button>
      </div>
    `

    if (!lang || !highlighter) {
      return `<div class="markdown-code-block" data-language="${escapedLang}" data-code="${encodedCode}">${header}<pre><code>${escapeHtml(code)}</code></pre></div>`
    }

    try {
      const html = highlighter.codeToHtml(code, {
        lang,
        theme: isDark ? "github-dark" : "github-light",
      })
      return `<div class="markdown-code-block" data-language="${escapedLang}" data-code="${encodedCode}">${header}${html}</div>`
    } catch {
      return `<div class="markdown-code-block" data-language="${escapedLang}" data-code="${encodedCode}">${header}<pre><code class="language-${escapedLang}">${escapeHtml(code)}</code></pre></div>`
    }
  }

  renderer.link = (href: string, title: string | null | undefined, text: string) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ""
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`
  }

  renderer.codespan = (code: string) => {
    return `<code class="inline-code">${escapeHtml(code)}</code>`
  }

  marked.use({ renderer })
}

export async function initMarkdown(isDark: boolean) {
  await getOrCreateHighlighter()
  setupRenderer(isDark)
  isInitialized = true
}

export function isMarkdownReady(): boolean {
  return isInitialized && highlighter !== null
}

export async function renderMarkdown(content: string): Promise<string> {
  if (!isInitialized) {
    await initMarkdown(currentTheme === "dark")
  }
  return marked.parse(content) as Promise<string>
}

export async function getSharedHighlighter(): Promise<Highlighter> {
  return getOrCreateHighlighter()
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
