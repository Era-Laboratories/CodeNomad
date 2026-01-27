import { Component, createMemo, Show } from "solid-js"
import { Bot } from "lucide-solid"
import type { ToolState } from "@opencode-ai/sdk"
import { readToolStatePayload } from "./tool-call/utils"
import { sessions, setActiveParentSession, setActiveSession } from "../stores/sessions"
import { setActiveInstanceId } from "../stores/instances"
import "../styles/components/subagent.css"

type ToolCallPart = {
  type: "tool"
  id?: string
  tool?: string
  state?: ToolState
}

interface SubAgentRowProps {
  toolPart: ToolCallPart
  instanceId: string
  sessionId: string
}

function extractTaskSessionId(state: ToolState | undefined): string {
  if (!state) return ""
  const metadata = (state as unknown as { metadata?: Record<string, unknown> }).metadata ?? {}
  const directId = metadata?.sessionId ?? metadata?.sessionID
  return typeof directId === "string" ? directId : ""
}

function findTaskSessionLocation(sessionId: string): { sessionId: string; instanceId: string; parentId: string | null } | null {
  if (!sessionId) return null
  const allSessions = sessions()
  for (const [instanceId, sessionMap] of allSessions) {
    const session = sessionMap?.get(sessionId)
    if (session) {
      return {
        sessionId: session.id,
        instanceId,
        parentId: session.parentId ?? null,
      }
    }
  }
  return null
}

function navigateToTaskSession(location: { sessionId: string; instanceId: string; parentId: string | null }) {
  setActiveInstanceId(location.instanceId)
  const parentToActivate = location.parentId ?? location.sessionId
  setActiveParentSession(location.instanceId, parentToActivate)
  if (location.parentId) {
    setActiveSession(location.instanceId, location.sessionId)
  }
}

const SubAgentRow: Component<SubAgentRowProps> = (props) => {
  // Extract task info
  const taskInfo = createMemo(() => {
    const state = props.toolPart.state
    if (!state) return { title: "Sub-Agent", toolCount: 0, status: "pending" as const }

    const { input, metadata } = readToolStatePayload(state)

    // Build title
    const description = typeof input.description === "string" ? input.description : undefined
    const subagentType = typeof input.subagent_type === "string" ? input.subagent_type : undefined
    let title = "Sub-Agent"
    if (description && subagentType) {
      title = `${subagentType}: ${description}`
    } else if (description) {
      title = description
    }

    // Count tools from summary
    const summary = Array.isArray((metadata as any).summary) ? (metadata as any).summary : []
    const toolCount = summary.length

    // Determine overall status
    const status = state.status ?? "pending"

    return { title, toolCount, status }
  })

  // Session navigation
  const taskSessionId = createMemo(() => extractTaskSessionId(props.toolPart.state))
  const taskLocation = createMemo(() => taskSessionId() ? findTaskSessionLocation(taskSessionId()) : null)

  const handleGoToSession = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const location = taskLocation()
    if (location) {
      navigateToTaskSession(location)
    }
  }

  // Status indicator
  const statusIndicator = createMemo(() => {
    const status = taskInfo().status
    switch (status) {
      case "running":
        return { icon: "⏳", label: "Running", class: "subagent-status--running" }
      case "completed":
        return { icon: "✓", label: "Completed", class: "subagent-status--completed" }
      case "error":
        return { icon: "✗", label: "Error", class: "subagent-status--error" }
      default:
        return { icon: "⏸", label: "Pending", class: "subagent-status--pending" }
    }
  })

  return (
    <div class="subagent-row" data-status={taskInfo().status}>
      <Bot class="subagent-row-icon" size={16} />
      <span class="subagent-row-title">{taskInfo().title}</span>
      <span class="subagent-row-count">{taskInfo().toolCount} tools</span>
      <span class={`subagent-row-status ${statusIndicator().class}`} title={statusIndicator().label}>
        {statusIndicator().icon}
      </span>
      <Show when={taskSessionId()}>
        <button
          type="button"
          class="subagent-row-session-btn"
          onClick={handleGoToSession}
          disabled={!taskLocation()}
          title={taskLocation() ? "Go to session" : "Session not available"}
        >
          Session
        </button>
      </Show>
    </div>
  )
}

export default SubAgentRow
