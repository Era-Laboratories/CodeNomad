import { createEffect, createMemo, onCleanup, Show, type Component } from "solid-js"
import { Portal } from "solid-js/web"
import {
  useToolModal,
  closeToolModal,
  navigateNext,
  navigatePrev,
  setModalDiffViewMode,
} from "../stores/tool-modal"
import { getToolIcon, getToolName, readToolStatePayload, diffCapableTools } from "./tool-call/utils"
import ToolCall from "./tool-call"
import { X, ChevronLeft, ChevronRight, Columns, AlignJustify, Copy, Check } from "lucide-solid"
import { createSignal } from "solid-js"
import "../styles/components/tool-call-modal.css"

// Tools that produce diffs
const DIFF_TOOLS = new Set(["edit", "patch", "write"])

export const ToolCallModal: Component = () => {
  const modal = useToolModal()
  let modalRef: HTMLDivElement | undefined
  let previousActiveElement: HTMLElement | null = null
  const [copied, setCopied] = createSignal(false)

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!modal.isOpen()) return

    switch (event.key) {
      case "Escape":
        event.preventDefault()
        closeToolModal()
        break
      case "ArrowLeft":
        event.preventDefault()
        if (modal.hasPrev()) navigatePrev()
        break
      case "ArrowRight":
        event.preventDefault()
        if (modal.hasNext()) navigateNext()
        break
    }
  }

  // Focus trap and restoration
  createEffect(() => {
    if (modal.isOpen()) {
      previousActiveElement = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        modalRef?.focus()
      })
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
      previousActiveElement?.focus()
    }
  })

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown)
    document.body.style.overflow = ""
  })

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeToolModal()
    }
  }

  const currentItem = () => modal.currentItem()
  const toolName = () => currentItem()?.toolName || "unknown"
  const displayPath = () => currentItem()?.displayPath || toolName()

  // Check if current tool supports diff view
  const isDiffTool = createMemo(() => DIFF_TOOLS.has(toolName()))

  // Extract change stats from tool state
  const changeStats = createMemo(() => {
    const item = currentItem()
    if (!item?.toolPart.state) return null

    const { metadata, output } = readToolStatePayload(item.toolPart.state)

    // Try to extract diff stats
    const diffText = metadata.diff || output
    if (typeof diffText !== "string") return null

    // Count additions and deletions from diff
    const lines = diffText.split("\n")
    let additions = 0
    let deletions = 0

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++
      }
    }

    if (additions === 0 && deletions === 0) return null

    return { additions, deletions, total: additions + deletions }
  })

  // Copy content to clipboard
  const handleCopy = async () => {
    const item = currentItem()
    if (!item?.toolPart.state) return

    const { metadata, output } = readToolStatePayload(item.toolPart.state)
    const content = metadata.diff || metadata.preview || output

    if (typeof content === "string") {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Portal>
      <Show when={modal.isOpen() && currentItem()}>
        <div
          class="tool-modal-backdrop"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tool-modal-title"
        >
          <div
            ref={modalRef}
            class="tool-modal"
            tabIndex={-1}
          >
            {/* Header */}
            <div class="tool-modal-header">
              <div class="tool-modal-title" id="tool-modal-title">
                <span class="tool-modal-icon">{getToolIcon(toolName())}</span>
                <span class="tool-modal-tool-name">{getToolName(toolName())}</span>
                <span class="tool-modal-separator">:</span>
                <span class="tool-modal-path">{displayPath()}</span>
              </div>
              <div class="tool-modal-actions">
                {/* Diff view mode toggle - only for diff-capable tools */}
                <Show when={isDiffTool()}>
                  <div class="tool-modal-view-toggle" role="group" aria-label="View mode">
                    <button
                      type="button"
                      class={`tool-modal-view-btn ${modal.diffViewMode() === "split" ? "active" : ""}`}
                      onClick={() => setModalDiffViewMode("split")}
                      aria-pressed={modal.diffViewMode() === "split"}
                      title="Split view"
                    >
                      <Columns size={16} />
                      <span>Split</span>
                    </button>
                    <button
                      type="button"
                      class={`tool-modal-view-btn ${modal.diffViewMode() === "unified" ? "active" : ""}`}
                      onClick={() => setModalDiffViewMode("unified")}
                      aria-pressed={modal.diffViewMode() === "unified"}
                      title="Unified view"
                    >
                      <AlignJustify size={16} />
                      <span>Unified</span>
                    </button>
                  </div>
                </Show>

                {/* Copy button */}
                <button
                  type="button"
                  class={`tool-modal-copy ${copied() ? "copied" : ""}`}
                  onClick={handleCopy}
                  aria-label={copied() ? "Copied!" : "Copy content"}
                  title={copied() ? "Copied!" : "Copy content"}
                >
                  <Show when={copied()} fallback={<Copy size={18} />}>
                    <Check size={18} />
                  </Show>
                </button>

                <button
                  type="button"
                  class="tool-modal-close"
                  onClick={() => closeToolModal()}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div class="tool-modal-content" data-tool-type={toolName()}>
              <Show
                when={currentItem()?.toolPart.state?.status !== "running"}
                fallback={
                  <div class="tool-modal-loading">
                    <div class="tool-modal-skeleton line" />
                    <div class="tool-modal-skeleton line-medium" />
                    <div class="tool-modal-skeleton line-short" />
                    <div class="tool-modal-skeleton block" />
                    <div class="tool-modal-skeleton line" />
                    <div class="tool-modal-skeleton line-medium" />
                  </div>
                }
              >
                <Show
                  when={currentItem()}
                  fallback={
                    <div class="tool-modal-empty">
                      <span class="tool-modal-empty-icon">📭</span>
                      <span class="tool-modal-empty-text">No content available</span>
                    </div>
                  }
                >
                  {(item) => (
                    <ToolCall
                      toolCall={item().toolPart}
                      toolCallId={item().key}
                      messageId={item().messageId}
                      messageVersion={item().messageVersion}
                      partVersion={item().partVersion}
                      instanceId={modal.instanceId()}
                      sessionId={modal.sessionId()}
                    />
                  )}
                </Show>
              </Show>
            </div>

            {/* Footer with navigation and stats */}
            <div class="tool-modal-footer">
              <div class="tool-modal-nav">
                <button
                  type="button"
                  class="tool-modal-nav-btn"
                  onClick={() => navigatePrev()}
                  disabled={!modal.hasPrev()}
                  aria-label="Previous file"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span class="tool-modal-nav-indicator">
                  {modal.currentIndex() + 1} of {modal.siblingItems().length}
                </span>

                <button
                  type="button"
                  class="tool-modal-nav-btn"
                  onClick={() => navigateNext()}
                  disabled={!modal.hasNext()}
                  aria-label="Next file"
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div class="tool-modal-stats">
                {/* Change stats for diffs */}
                <Show when={changeStats()}>
                  {(stats) => (
                    <div class="tool-modal-change-stats">
                      <span class="tool-modal-stat additions">+{stats().additions}</span>
                      <span class="tool-modal-stat deletions">-{stats().deletions}</span>
                      <span class="tool-modal-stat-label">{stats().total} lines</span>
                    </div>
                  )}
                </Show>

                {/* Status badge */}
                <Show when={currentItem()?.toolPart.state?.status === "completed"}>
                  <span class="tool-modal-status-badge completed">Completed</span>
                </Show>
                <Show when={currentItem()?.toolPart.state?.status === "running"}>
                  <span class="tool-modal-status-badge running">Running...</span>
                </Show>
                <Show when={currentItem()?.toolPart.state?.status === "error"}>
                  <span class="tool-modal-status-badge error">Error</span>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  )
}

export default ToolCallModal
