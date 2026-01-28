import { Component, createMemo, createSignal, For, Show } from "solid-js"
import { ChevronDown, ChevronRight } from "lucide-solid"
import PipelineStep, { extractReviewerVerdict } from "./pipeline-step"
import type { ToolDisplayItem } from "./inline-tool-call"
import { readToolStatePayload } from "./tool-call/utils"
import "../styles/components/pipeline.css"

const PIPELINE_NAMES: Record<string, string> = {
  "implementation-pipeline": "Implementation Pipeline",
  "code-review-pipeline": "Code & Review",
  "code-test-pipeline": "Code & Test",
}

interface PipelineGroupProps {
  tools: ToolDisplayItem[]
  patternName: string
  instanceId: string
  sessionId: string
}

const PipelineGroup: Component<PipelineGroupProps> = (props) => {
  const [expanded, setExpanded] = createSignal(true)

  const pipelineLabel = () => PIPELINE_NAMES[props.patternName] ?? "Pipeline"

  const overallStatus = createMemo(() => {
    const tools = props.tools
    const hasError = tools.some((t) => t.toolPart.state?.status === "error")
    if (hasError) return "error"
    const hasRunning = tools.some((t) => t.toolPart.state?.status === "running")
    if (hasRunning) return "running"
    const allCompleted = tools.every((t) => t.toolPart.state?.status === "completed")
    if (allCompleted) return "completed"
    return "pending"
  })

  const reviewerVerdict = createMemo(() => {
    const reviewerTool = props.tools.find((t) => {
      const state = t.toolPart.state
      if (!state) return false
      const { input } = readToolStatePayload(state)
      return input.subagent_type === "reviewer"
    })
    if (!reviewerTool) return null
    return extractReviewerVerdict(reviewerTool)
  })

  const statusIcon = createMemo(() => {
    switch (overallStatus()) {
      case "running": return "⏳"
      case "completed": return "✓"
      case "error": return "✗"
      default: return "⏸"
    }
  })

  return (
    <div class="pipeline-group" data-status={overallStatus()}>
      <button
        type="button"
        class="pipeline-header"
        onClick={() => setExpanded(!expanded())}
        aria-expanded={expanded()}
      >
        <span class="pipeline-header-chevron">
          {expanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span class="pipeline-header-icon">⛓</span>
        <span class="pipeline-header-title">{pipelineLabel()}</span>
        <span class={`pipeline-header-status pipeline-header-status--${overallStatus()}`}>
          {statusIcon()}
        </span>
        <Show when={reviewerVerdict()}>
          <span class={`pipeline-verdict pipeline-verdict--${reviewerVerdict()!.toLowerCase()}`}>
            {reviewerVerdict()}
          </span>
        </Show>
        <span class="pipeline-header-count">{props.tools.length} steps</span>
      </button>

      <Show when={expanded()}>
        <div class="pipeline-steps">
          <For each={props.tools}>
            {(tool, index) => (
              <PipelineStep
                tool={tool}
                isLast={index() === props.tools.length - 1}
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

export default PipelineGroup
