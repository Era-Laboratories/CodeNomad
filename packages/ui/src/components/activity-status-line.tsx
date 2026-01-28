import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import type { ToolState } from "@opencode-ai/sdk"
import type { InstanceMessageStore } from "../stores/message-v2/instance-store"
import { getSessionInfo, sessions } from "../stores/session-state"
import { isSessionBusy, getSessionStatus } from "../stores/session-status"
import { getActiveQuestion } from "../stores/question-store"
import { getRandomLoadingVerb } from "../lib/loading-verbs"
import { getRandomPenguinFact } from "../lib/penguin-facts"
import { TodoListView } from "./tool-call/renderers/todo"

interface ActivityStatusLineProps {
  instanceId: string
  sessionId: string
  store: () => InstanceMessageStore
}

type ActivityDisplayMode = "working" | "waiting-question" | "waiting-permission" | "compacting"

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function ActivityStatusLine(props: ActivityStatusLineProps) {
  const [elapsedSeconds, setElapsedSeconds] = createSignal(0)
  const [loadingVerb, setLoadingVerb] = createSignal(getRandomLoadingVerb())
  const [penguinFact, setPenguinFact] = createSignal(getRandomPenguinFact())
  const [todosExpanded, setTodosExpanded] = createSignal(true)

  const sessionBusy = () => isSessionBusy(props.instanceId, props.sessionId)

  const sessionInfo = () => getSessionInfo(props.instanceId, props.sessionId)

  const displayMode = createMemo<ActivityDisplayMode>(() => {
    const activeQuestion = getActiveQuestion(props.instanceId, props.sessionId)
    if (activeQuestion) return "waiting-question"

    const instanceSessions = sessions().get(props.instanceId)
    const session = instanceSessions?.get(props.sessionId)
    if (session?.pendingPermission) return "waiting-permission"

    const status = getSessionStatus(props.instanceId, props.sessionId)
    if (status === "compacting") return "compacting"

    return "working"
  })

  const isActivelyWorking = () => displayMode() === "working" || displayMode() === "compacting"
  const isWaiting = () => displayMode() === "waiting-question" || displayMode() === "waiting-permission"

  const totalTokens = () => {
    const info = sessionInfo()
    if (!info) return 0
    return (info.inputTokens || 0) + (info.outputTokens || 0)
  }

  const cost = () => {
    const info = sessionInfo()
    return info?.cost ?? 0
  }

  // Elapsed timer — resets when session becomes busy, counts up every second
  // Freezes during question/permission states
  createEffect(() => {
    if (!sessionBusy() || !isActivelyWorking()) return

    setElapsedSeconds(0)
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    onCleanup(() => clearInterval(id))
  })

  // Rotating loading verb every 3s — freezes during waiting states
  createEffect(() => {
    if (!sessionBusy() || !isActivelyWorking()) return

    setLoadingVerb(getRandomLoadingVerb())
    const id = setInterval(() => setLoadingVerb(getRandomLoadingVerb()), 10000)
    onCleanup(() => clearInterval(id))
  })

  // Rotating penguin fact every 8s — freezes during waiting states
  createEffect(() => {
    if (!sessionBusy() || !isActivelyWorking()) return

    setPenguinFact(getRandomPenguinFact())
    const id = setInterval(() => setPenguinFact(getRandomPenguinFact()), 8000)
    onCleanup(() => clearInterval(id))
  })

  // Verb text depends on display mode
  const verbText = createMemo(() => {
    const mode = displayMode()
    if (mode === "waiting-question") return "Waiting for input"
    if (mode === "waiting-permission") return "Permission required"
    return `${loadingVerb()}...`
  })

  // Todo snapshot from store
  const latestTodoSnapshot = createMemo(() => {
    const store = props.store()
    if (!store) return null
    const snapshot = store.state.latestTodos[props.sessionId]
    return snapshot ?? null
  })

  // Derive ToolState from snapshot
  const latestTodoState = createMemo<ToolState | null>(() => {
    const snapshot = latestTodoSnapshot()
    if (!snapshot) return null
    const store = props.store()
    if (!store) return null
    const message = store.getMessage(snapshot.messageId)
    if (!message) return null
    const partRecord = message.parts?.[snapshot.partId]
    const part = partRecord?.data as { type?: string; tool?: string; state?: ToolState }
    if (!part || part.type !== "tool" || part.tool !== "todowrite") return null
    const state = part.state
    if (!state || state.status !== "completed") return null
    return state
  })

  // Compute todo counts for the toggle label
  const todoCounts = createMemo(() => {
    const state = latestTodoState()
    if (!state) return null
    const metadata = (state as any).metadata
    const todos = Array.isArray(metadata?.todos) ? metadata.todos : []
    let total = 0
    let completed = 0
    for (const todo of todos) {
      if (typeof todo?.content === "string" && todo.content.trim()) {
        total++
        if (todo.status === "completed") completed++
      }
    }
    return total > 0 ? { total, completed } : null
  })

  return (
    <div class="activity-status-line">
      <div class="activity-status-main">
        <span class={`activity-status-dot${isWaiting() ? " activity-status-dot--waiting" : ""}`} />
        <span class={`activity-status-verb${isWaiting() ? " activity-status-verb--waiting" : ""}`}>{verbText()}</span>
        <Show when={!isWaiting()}>
          <span class="activity-status-elapsed">{formatElapsed(elapsedSeconds())}</span>
          <span class="activity-status-separator">|</span>
        </Show>
        <span class="activity-status-tokens">{formatTokenCount(totalTokens())} tokens</span>
        <Show when={cost() > 0}>
          <span class="activity-status-cost">${cost().toFixed(4)}</span>
        </Show>
      </div>
      <Show when={!isWaiting()}>
        <div class="activity-status-fact">
          <span class="activity-status-fact-icon">&gt;</span>
          <span>{penguinFact()}</span>
        </div>
      </Show>
      <Show when={latestTodoState()}>
        <div class="activity-status-todos">
          <button
            class="activity-status-todos-toggle"
            onClick={() => setTodosExpanded((v) => !v)}
          >
            Plan ({todoCounts()?.completed ?? 0}/{todoCounts()?.total ?? 0}){" "}
            {todosExpanded() ? "\u25BC" : "\u25B6"}
          </button>
          <Show when={todosExpanded()}>
            <TodoListView state={latestTodoState()!} showStatusLabel={false} />
          </Show>
        </div>
      </Show>
    </div>
  )
}
