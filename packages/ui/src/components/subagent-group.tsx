import { Component, createMemo, createSignal, For, Show } from "solid-js"
import { Bot } from "lucide-solid"
import SubAgentRow from "./subagent-row"
import type { ToolDisplayItem } from "./inline-tool-call"
import "../styles/components/subagent.css"

interface SubAgentGroupProps {
  tools: ToolDisplayItem[]
  instanceId: string
  sessionId: string
}

interface SubAgentStatus {
  completed: number
  running: number
  pending: number
  error: number
  total: number
}

const SubAgentGroup: Component<SubAgentGroupProps> = (props) => {
  // For single sub-agent, don't show group wrapper
  const isSingleAgent = () => props.tools.length === 1

  // Group expanded state — collapsed by default
  const [groupExpanded, setGroupExpanded] = createSignal(false)

  // Calculate aggregate status
  const aggregateStatus = createMemo<SubAgentStatus>(() => {
    let completed = 0
    let running = 0
    let pending = 0
    let error = 0

    for (const tool of props.tools) {
      const status = tool.toolPart.state?.status
      if (status === "completed") completed++
      else if (status === "running") running++
      else if (status === "error") error++
      else pending++
    }

    return { completed, running, pending, error, total: props.tools.length }
  })

  // Status summary text
  const statusSummary = createMemo(() => {
    const s = aggregateStatus()
    const parts: string[] = []

    if (s.completed > 0) parts.push(`${s.completed} done`)
    if (s.running > 0) parts.push(`${s.running} running`)
    if (s.pending > 0) parts.push(`${s.pending} pending`)
    if (s.error > 0) parts.push(`${s.error} error`)

    return parts.join(", ")
  })

  // Determine the dominant status for the badge color
  const dominantStatus = createMemo(() => {
    const s = aggregateStatus()
    if (s.running > 0) return "running"
    if (s.error > 0) return "error"
    if (s.pending > 0) return "pending"
    return "completed"
  })

  // Toggle group expand
  const toggleGroup = () => {
    setGroupExpanded(!groupExpanded())
  }

  // For single agent, render just the row
  if (isSingleAgent()) {
    const tool = props.tools[0]
    return (
      <div class="subagent-single">
        <SubAgentRow
          toolPart={tool.toolPart}
          instanceId={props.instanceId}
          sessionId={props.sessionId}
        />
      </div>
    )
  }

  // For multiple agents, render stacked group
  return (
    <div class="subagent-group">
      <button
        type="button"
        class={`subagent-stack-header subagent-stack-header--${dominantStatus()}`}
        onClick={toggleGroup}
        aria-expanded={groupExpanded()}
        title={`${props.tools.length} sub-agents — ${statusSummary()}`}
      >
        <span class="subagent-stack-icon-wrapper">
          <Bot class="subagent-stack-icon" size={16} />
          <span class="subagent-stack-count">({props.tools.length})</span>
        </span>
        <span class="subagent-stack-summary">{statusSummary()}</span>
      </button>

      <Show when={groupExpanded()}>
        <div class="subagent-group-content">
          <For each={props.tools}>
            {(tool) => (
              <SubAgentRow
                toolPart={tool.toolPart}
                instanceId={props.instanceId}
                sessionId={props.sessionId}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default SubAgentGroup
