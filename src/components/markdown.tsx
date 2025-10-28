import { createEffect, createSignal, onMount, onCleanup } from "solid-js"
import { renderMarkdown } from "../lib/markdown"
import type { TextPart } from "../types/message"

interface MarkdownProps {
  part: TextPart
  isDark?: boolean
}

export function Markdown(props: MarkdownProps) {
  const [html, setHtml] = createSignal("")
  let containerRef: HTMLDivElement | undefined
  let latestRequestedText = ""

  createEffect(async () => {
    const part = props.part
    const text = part.text || ""

    if (part.renderCache && part.renderCache.text === text) {
      setHtml(part.renderCache.html)
      return
    }

    latestRequestedText = text

    try {
      const rendered = await renderMarkdown(text)

      if (latestRequestedText === text) {
        setHtml(rendered)
        part.renderCache = { text, html: rendered }
      }
    } catch (error) {
      console.error("Failed to render markdown:", error)
      if (latestRequestedText === text) {
        setHtml(text)
      }
    }
  })

  onMount(() => {
    const handleClick = async (e: Event) => {
      const target = e.target as HTMLElement
      const copyButton = target.closest(".code-block-copy") as HTMLButtonElement

      if (copyButton) {
        e.preventDefault()
        const code = copyButton.getAttribute("data-code")
        if (code) {
          const decodedCode = decodeURIComponent(code)
          await navigator.clipboard.writeText(decodedCode)
          const copyText = copyButton.querySelector(".copy-text")
          if (copyText) {
            copyText.textContent = "Copied!"
            setTimeout(() => {
              copyText.textContent = "Copy"
            }, 2000)
          }
        }
      }
    }

    containerRef?.addEventListener("click", handleClick)

    onCleanup(() => {
      containerRef?.removeEventListener("click", handleClick)
    })
  })

  return <div ref={containerRef} class="prose prose-sm dark:prose-invert max-w-none" innerHTML={html()} />
}
