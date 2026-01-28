import { For, Show, createMemo, createSignal } from "solid-js"
import type { ToolState } from "@opencode-ai/sdk"
import type { ToolRenderer, ToolRendererContext } from "../types"
import { getDefaultToolAction, getToolIcon, getToolName, readToolStatePayload, ensureMarkdownContent } from "../utils"
import { getTodoTitle } from "./todo"
import { resolveTitleForTool } from "../tool-title"
import { ChevronDown, ChevronRight } from "lucide-solid"

interface TaskSummaryItem {
  id: string
  tool: string
  input: Record<string, any>
  metadata: Record<string, any>
  state?: ToolState
  status?: ToolState["status"]
  title?: string
}

function normalizeStatus(status?: string | null): ToolState["status"] | undefined {
  if (status === "pending" || status === "running" || status === "completed" || status === "error") {
    return status
  }
  return undefined
}

function summarizeStatusIcon(status?: ToolState["status"]) {
  switch (status) {
    case "pending":
      return "⏸"
    case "running":
      return "⏳"
    case "completed":
      return "✓"
    case "error":
      return "✗"
    default:
      return ""
  }
}

function summarizeStatusLabel(status?: ToolState["status"]) {
  switch (status) {
    case "pending":
      return "Pending"
    case "running":
      return "Running"
    case "completed":
      return "Completed"
    case "error":
      return "Error"
    default:
      return "Unknown"
  }
}

function describeTaskTitle(input: Record<string, any>) {
  const description = typeof input.description === "string" ? input.description : undefined
  const subagent = typeof input.subagent_type === "string" ? input.subagent_type : undefined
  const base = getToolName("task")
  if (description && subagent) {
    return `${base}[${subagent}] ${description}`
  }
  if (description) {
    return `${base} ${description}`
  }
  return base
}

function describeToolTitle(item: TaskSummaryItem): string {
  if (item.title && item.title.length > 0) {
    return item.title
  }

  if (item.tool === "task") {
    return describeTaskTitle({ ...item.metadata, ...item.input })
  }

  if (item.state) {
    return resolveTitleForTool({ toolName: item.tool, state: item.state })
  }

  return getDefaultToolAction(item.tool)
}

/** Collapsible pane header component */
function TaskPaneHeader(props: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      class="task-pane-header"
      onClick={props.onToggle}
      aria-expanded={props.isExpanded}
    >
      <span class="task-pane-chevron">
        {props.isExpanded ? <ChevronDown class="w-3.5 h-3.5" /> : <ChevronRight class="w-3.5 h-3.5" />}
      </span>
      <span class="task-pane-title">{props.title}</span>
      <Show when={typeof props.count === "number"}>
        <span class="task-pane-count">{props.count}</span>
      </Show>
    </button>
  )
}

/** Renders the list of task steps */
function TaskStepsList(props: { items: TaskSummaryItem[] }) {
  return (
    <div class="tool-call-task-summary">
      <For each={props.items}>
        {(item) => {
          const icon = getToolIcon(item.tool)
          const description = describeToolTitle(item)
          const toolLabel = getToolName(item.tool)
          const status = normalizeStatus(item.status ?? item.state?.status)
          const statusIcon = summarizeStatusIcon(status)
          const statusLabel = summarizeStatusLabel(status)
          const statusAttr = status ?? "pending"
          return (
            <div class="tool-call-task-item" data-task-id={item.id} data-task-status={statusAttr}>
              <span class="tool-call-task-icon">{icon}</span>
              <span class="tool-call-task-label">{toolLabel}</span>
              <span class="tool-call-task-separator" aria-hidden="true">—</span>
              <span class="tool-call-task-text">{description}</span>
              <Show when={statusIcon}>
                <span class="tool-call-task-status" aria-label={statusLabel} title={statusLabel}>
                  {statusIcon}
                </span>
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}

export const taskRenderer: ToolRenderer = {
  tools: ["task"],
  getAction: () => "Delegating...",
  getTitle({ toolState }) {
    const state = toolState()
    if (!state) return undefined
    const { input } = readToolStatePayload(state)
    return describeTaskTitle(input)
  },
  renderBody({ toolState, messageVersion, partVersion, scrollHelpers, renderMarkdown }) {
    // Track pane expansion states
    const [promptExpanded, setPromptExpanded] = createSignal(false)
    const [approachesExpanded, setApproachesExpanded] = createSignal(false)
    const [stepsExpanded, setStepsExpanded] = createSignal(true)
    const [outputExpanded, setOutputExpanded] = createSignal(false)

    // Extract prompt from input
    const prompt = createMemo(() => {
      messageVersion?.()
      partVersion?.()
      const state = toolState()
      if (!state) return null
      const { input, metadata } = readToolStatePayload(state)
      // Try input.prompt first, then metadata.prompt
      const promptText = typeof input.prompt === "string" ? input.prompt :
                         typeof (metadata as any).prompt === "string" ? (metadata as any).prompt : null
      return promptText
    })

    // Extract approach evaluation from metadata
    const approaches = createMemo(() => {
      messageVersion?.()
      partVersion?.()
      const state = toolState()
      if (!state) return null
      const { metadata } = readToolStatePayload(state)
      const evalData = (metadata as any).approachEvaluation
      if (!evalData || !Array.isArray(evalData.approaches)) return null
      return evalData as {
        requirement?: string
        approaches: Array<{
          name: string
          description?: string
          selected?: boolean
          complexity?: string
          risk?: string
          alignment?: string
          testability?: string
        }>
        rationale?: string
      }
    })

    // Extract output from metadata or state
    const output = createMemo(() => {
      messageVersion?.()
      partVersion?.()
      const state = toolState()
      if (!state) return null
      const { metadata } = readToolStatePayload(state)
      // Try metadata.output first, then state.output for completed tasks
      if (typeof (metadata as any).output === "string" && (metadata as any).output.length > 0) {
        return (metadata as any).output
      }
      if (state.status === "completed" && typeof state.output === "string" && state.output.length > 0) {
        return state.output
      }
      return null
    })

    const items = createMemo(() => {
      // Track the reactive change points so we only recompute when the part/message changes
      messageVersion?.()
      partVersion?.()

      const state = toolState()
      if (!state) return []

      const { metadata } = readToolStatePayload(state)
      const summary = Array.isArray((metadata as any).summary) ? ((metadata as any).summary as any[]) : []

      return summary.map((entry, index) => {
        const tool = typeof entry?.tool === "string" ? (entry.tool as string) : "unknown"
        const stateValue = typeof entry?.state === "object" ? (entry.state as ToolState) : undefined
        const metadataFromEntry = typeof entry?.metadata === "object" && entry.metadata ? entry.metadata : {}
        const fallbackInput = typeof entry?.input === "object" && entry.input ? entry.input : {}
        const id = typeof entry?.id === "string" && entry.id.length > 0 ? entry.id : `${tool}-${index}`
        const statusValue = normalizeStatus((entry?.status as string | undefined) ?? stateValue?.status)
        const title = typeof entry?.title === "string" ? entry.title : undefined
        return { id, tool, input: fallbackInput, metadata: metadataFromEntry, state: stateValue, status: statusValue, title }
      })
    })

    // Check if we have any content to show
    const hasPrompt = () => prompt() !== null && prompt()!.length > 0
    const hasApproaches = () => approaches() !== null
    const hasSteps = () => items().length > 0
    const hasOutput = () => output() !== null && output()!.length > 0
    const hasAnyContent = () => hasPrompt() || hasApproaches() || hasSteps() || hasOutput()

    if (!hasAnyContent()) return null

    return (
      <div
        class="message-text tool-call-markdown tool-call-task-container tool-call-task-panes"
        ref={(element) => scrollHelpers?.registerContainer(element)}
        onScroll={scrollHelpers ? (event) => scrollHelpers.handleScroll(event as Event & { currentTarget: HTMLDivElement }) : undefined}
      >
        {/* Prompt Pane */}
        <Show when={hasPrompt()}>
          <div class="task-pane task-pane-prompt">
            <TaskPaneHeader
              title="Prompt"
              isExpanded={promptExpanded()}
              onToggle={() => setPromptExpanded(!promptExpanded())}
            />
            <Show when={promptExpanded()}>
              <div class="task-pane-content">
                {renderMarkdown({
                  content: ensureMarkdownContent(prompt()!, undefined, true) || prompt()!,
                  disableHighlight: false
                })}
              </div>
            </Show>
          </div>
        </Show>

        {/* Approaches Pane */}
        <Show when={hasApproaches()}>
          <div class="task-pane task-pane-approaches">
            <TaskPaneHeader
              title="Approaches"
              isExpanded={approachesExpanded()}
              onToggle={() => setApproachesExpanded(!approachesExpanded())}
              count={approaches()!.approaches.length}
            />
            <Show when={approachesExpanded()}>
              <div class="task-pane-content">
                <Show when={approaches()!.requirement}>
                  <div class="approach-requirement">{approaches()!.requirement}</div>
                </Show>
                <For each={approaches()!.approaches}>
                  {(approach) => (
                    <div class={`approach-card ${approach.selected ? "approach-card--selected" : ""}`}>
                      <div class="approach-card-header">
                        <span class="approach-card-name">{approach.name}</span>
                        <Show when={approach.selected}>
                          <span class="approach-badge approach-badge--selected">SELECTED</span>
                        </Show>
                      </div>
                      <Show when={approach.description}>
                        <div class="approach-card-description">{approach.description}</div>
                      </Show>
                      <div class="approach-card-badges">
                        <Show when={approach.complexity}>
                          <span class={`approach-badge approach-badge--${approach.complexity?.toLowerCase()}`}>
                            {approach.complexity}
                          </span>
                        </Show>
                        <Show when={approach.risk}>
                          <span class={`approach-badge approach-badge--${approach.risk?.toLowerCase()}`}>
                            {approach.risk}
                          </span>
                        </Show>
                        <Show when={approach.alignment}>
                          <span class={`approach-badge approach-badge--${approach.alignment?.toLowerCase()}`}>
                            {approach.alignment}
                          </span>
                        </Show>
                        <Show when={approach.testability}>
                          <span class={`approach-badge approach-badge--${approach.testability?.toLowerCase()}`}>
                            {approach.testability}
                          </span>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
                <Show when={approaches()!.rationale}>
                  <div class="approach-rationale">{approaches()!.rationale}</div>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* Steps Pane */}
        <Show when={hasSteps()}>
          <div class="task-pane task-pane-steps">
            <TaskPaneHeader
              title="Steps"
              isExpanded={stepsExpanded()}
              onToggle={() => setStepsExpanded(!stepsExpanded())}
              count={items().length}
            />
            <Show when={stepsExpanded()}>
              <div class="task-pane-content task-pane-steps-content">
                <TaskStepsList items={items()} />
              </div>
            </Show>
          </div>
        </Show>

        {/* Output Pane */}
        <Show when={hasOutput()}>
          <div class="task-pane task-pane-output">
            <TaskPaneHeader
              title="Output"
              isExpanded={outputExpanded()}
              onToggle={() => setOutputExpanded(!outputExpanded())}
            />
            <Show when={outputExpanded()}>
              <div class="task-pane-content">
                {renderMarkdown({
                  content: ensureMarkdownContent(output()!, undefined, true) || output()!,
                  disableHighlight: false
                })}
              </div>
            </Show>
          </div>
        </Show>

        {scrollHelpers?.renderSentinel?.()}
      </div>
    )
  },
}
