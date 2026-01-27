import { Component, createMemo, createSignal, onMount, onCleanup, Show } from "solid-js"
import { getToolName, getToolArgsSummary, getToolSummary, readToolStatePayload, getRelativePath } from "./tool-call/utils"
import { openToolModal, type ToolModalItem } from "../stores/tool-modal"
import { requestModelSelector, requestInstanceInfo } from "../stores/ui-actions"
import { RefreshCw, Info } from "lucide-solid"
import type { ClientPart } from "../types/message"
import "../styles/components/inline-tool-call.css"

type ToolCallPart = Extract<ClientPart, { type: "tool" }>

export interface ToolDisplayItem {
  type: "tool"
  key: string
  toolPart: ToolCallPart
  messageInfo?: unknown
  messageId: string
  messageVersion: number
  partVersion: number
}

interface InlineToolCallProps {
  toolPart: ToolCallPart
  toolKey: string
  messageId: string
  messageVersion: number
  partVersion: number
  instanceId: string
  sessionId: string
  siblingTools?: ToolDisplayItem[]
  siblingIndex?: number
}

const STALL_THRESHOLD_MS = 20000 // 20 seconds before showing stall warning

const InlineToolCall: Component<InlineToolCallProps> = (props) => {
  const toolName = () => props.toolPart.tool || "unknown"
  const state = () => props.toolPart.state
  const status = () => state()?.status

  // Track elapsed time for running tools
  const [elapsedMs, setElapsedMs] = createSignal(0)
  const [startTime] = createSignal(Date.now())
  let intervalId: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    if (status() === "running") {
      intervalId = setInterval(() => {
        setElapsedMs(Date.now() - startTime())
      }, 1000)
    }
  })

  onCleanup(() => {
    if (intervalId) clearInterval(intervalId)
  })

  // Check if tool appears stalled
  const isStalled = createMemo(() => {
    return status() === "running" && elapsedMs() > STALL_THRESHOLD_MS
  })

  const displayName = createMemo(() => getToolName(toolName()))
  const argsSummary = createMemo(() => getToolArgsSummary(toolName(), state()))
  const summary = createMemo(() => getToolSummary(toolName(), state()))

  // Get display path for the modal
  const displayPath = createMemo(() => {
    const st = state()
    if (!st) return toolName()

    const { input, metadata } = readToolStatePayload(st)
    const filePath =
      (typeof input.filePath === "string" ? input.filePath : undefined) ||
      (typeof input.file_path === "string" ? input.file_path : undefined) ||
      (typeof metadata.filePath === "string" ? metadata.filePath : undefined) ||
      (typeof input.path === "string" ? input.path : undefined)

    if (filePath) {
      return getRelativePath(filePath)
    }
    return toolName()
  })

  // Convert ToolDisplayItem to ToolModalItem for the modal
  const toModalItem = (item: ToolDisplayItem): ToolModalItem => {
    const st = item.toolPart.state
    let itemDisplayPath = item.toolPart.tool || "unknown"

    if (st) {
      const { input, metadata } = readToolStatePayload(st)
      const filePath =
        (typeof input.filePath === "string" ? input.filePath : undefined) ||
        (typeof input.file_path === "string" ? input.file_path : undefined) ||
        (typeof metadata.filePath === "string" ? metadata.filePath : undefined) ||
        (typeof input.path === "string" ? input.path : undefined)

      if (filePath) {
        itemDisplayPath = getRelativePath(filePath)
      }
    }

    return {
      key: item.key,
      toolPart: item.toolPart,
      messageId: item.messageId,
      messageVersion: item.messageVersion,
      partVersion: item.partVersion,
      displayPath: itemDisplayPath,
      toolName: item.toolPart.tool || "unknown",
    }
  }

  const handleClick = () => {
    const currentItem: ToolModalItem = {
      key: props.toolKey,
      toolPart: props.toolPart,
      messageId: props.messageId,
      messageVersion: props.messageVersion,
      partVersion: props.partVersion,
      displayPath: displayPath(),
      toolName: toolName(),
    }

    const siblings = props.siblingTools
      ? props.siblingTools.map(toModalItem)
      : [currentItem]

    const index = props.siblingIndex ?? 0

    openToolModal(
      currentItem,
      siblings,
      index,
      props.instanceId,
      props.sessionId
    )
  }

  const statusClass = () => {
    if (isStalled()) {
      return "inline-tool-status--stalled"
    }
    switch (status()) {
      case "running":
        return "inline-tool-status--running"
      case "completed":
        return "inline-tool-status--completed"
      case "error":
        return "inline-tool-status--error"
      default:
        return "inline-tool-status--pending"
    }
  }

  // Format elapsed time
  const elapsedDisplay = () => {
    const ms = elapsedMs()
    if (ms < 1000) return ""
    const secs = Math.floor(ms / 1000)
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    return `${mins}m ${secs % 60}s`
  }

  // Skip rendering for task tools - they render separately as sub-agents
  if (toolName() === "task") {
    return null
  }

  return (
    <button
      type="button"
      class={`inline-tool-call ${isStalled() ? "inline-tool-call--stalled" : ""}`}
      onClick={handleClick}
      data-status={isStalled() ? "stalled" : status()}
    >
      <div class="inline-tool-call-header">
        <span class={`inline-tool-status ${statusClass()}`} aria-hidden="true" />
        <span class="inline-tool-name">{displayName()}</span>
        <Show when={argsSummary()}>
          <span class="inline-tool-args">{argsSummary()}</span>
        </Show>
        <Show when={status() === "running" && elapsedDisplay()}>
          <span class="inline-tool-elapsed">{elapsedDisplay()}</span>
        </Show>
      </div>
      <Show when={isStalled()}>
        <div class="inline-tool-stalled-warning">
          <span class="inline-tool-summary-prefix">└─</span>
          <span class="inline-tool-stalled-text">
            Appears stalled — API may be unavailable.
          </span>
          <div class="inline-tool-stalled-actions">
            <button
              type="button"
              class="inline-tool-switch-model-btn"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[InlineToolCall] Switch Model clicked")
                requestModelSelector(true)
              }}
              title="Switch to a different model and continue"
            >
              <RefreshCw size={12} />
              Switch Model
            </button>
            <button
              type="button"
              class="inline-tool-view-details-btn"
              onClick={(e) => {
                e.stopPropagation()
                console.log("[InlineToolCall] View Details clicked")
                requestInstanceInfo()
              }}
              title="View instance details and logs"
            >
              <Info size={12} />
              View Details
            </button>
          </div>
        </div>
      </Show>
      <Show when={!isStalled() && summary()}>
        <div class="inline-tool-summary">
          <span class="inline-tool-summary-prefix">└─</span>
          <span class="inline-tool-summary-text">{summary()}</span>
        </div>
      </Show>
    </button>
  )
}

export default InlineToolCall
