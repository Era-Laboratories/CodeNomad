import { For, Show, createMemo, createSignal, createEffect, onCleanup } from "solid-js"
import MessageItem from "./message-item"
import ToolCall from "./tool-call"
import Kbd from "./kbd"
import type { Message, MessageInfo, ClientPart } from "../types/message"
import { computeDisplayParts } from "../stores/session-messages"
import { getSessionInfo } from "../stores/sessions"
import { showCommandPalette } from "../stores/command-palette"
import { messageStoreBus } from "../stores/message-v2/bus"
import type { MessageRecord } from "../stores/message-v2/types"
import { useConfig } from "../stores/preferences"
import { getScrollCache, setScrollCache } from "../lib/scroll-cache"
import { sseManager } from "../lib/sse-manager"
import { formatTokenTotal } from "../lib/formatters"

const SCROLL_SCOPE = "session"
const TOOL_ICON = "🔧"
const codeNomadLogo = new URL("../images/CodeNomad-Icon.png", import.meta.url).href

function formatTokens(tokens: number): string {
  return formatTokenTotal(tokens)
}


interface MessageStreamV2Props {
  instanceId: string
  sessionId: string
  loading?: boolean
  onRevert?: (messageId: string) => void
  onFork?: (messageId?: string) => void
}

interface MessageDisplayItem {
  type: "message"
  message: Message
  combinedParts: ClientPart[]
  messageInfo?: MessageInfo
  isQueued: boolean
}

interface ToolDisplayItem {
  type: "tool"
  key: string
  toolPart: ToolCallPart
  messageInfo?: MessageInfo
  messageId: string
  messageVersion: number
  partVersion: number
}

type DisplayItem = MessageDisplayItem | ToolDisplayItem

type ToolCallPart = Extract<ClientPart, { type: "tool" }>

function isToolPart(part: ClientPart): part is ToolCallPart {
  return part.type === "tool"
}

function recordToMessage(record: MessageRecord): Message {
  const parts = record.partIds
    .map((partId) => record.parts[partId]?.data)
    .filter((part): part is ClientPart => Boolean(part))
  return {
    id: record.id,
    sessionId: record.sessionId,
    type: record.role,
    parts,
    timestamp: record.createdAt,
    status: record.status,
    version: record.revision,
  }
}

function hasRenderableContent(message: Message, combinedParts: ClientPart[], info?: MessageInfo): boolean {
  if (message.type !== "assistant" && message.type !== "user") {
    return false
  }
  if (message.type !== "assistant" || combinedParts.length > 0) {
    return true
  }
  if (info && info.role === "assistant" && info.error) {
    return true
  }
  return message.status === "error"
}

export default function MessageStreamV2(props: MessageStreamV2Props) {
  const { preferences } = useConfig()
  const store = createMemo(() => messageStoreBus.getOrCreate(props.instanceId))
  const messageIds = createMemo(() => store().getSessionMessageIds(props.sessionId))
  const messageRecords = createMemo(() =>
    messageIds()
      .map((id) => store().getMessage(id))
      .filter((record): record is MessageRecord => Boolean(record)),
  )

  const usageSnapshot = createMemo(() => store().getSessionUsage(props.sessionId))
  const sessionInfo = createMemo(() =>
    getSessionInfo(props.instanceId, props.sessionId) ?? {
      cost: 0,
      contextWindow: 0,
      isSubscriptionModel: false,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      actualUsageTokens: 0,
      modelOutputLimit: 0,
      contextAvailableTokens: null,
    },
  )
  const tokenStats = createMemo(() => {
    const usage = usageSnapshot()
    const info = sessionInfo()
    return {
      used: usage?.actualUsageTokens ?? info.actualUsageTokens ?? 0,
      avail: info.contextAvailableTokens,
    }
  })

  const connectionStatus = () => sseManager.getStatus(props.instanceId)
  const handleCommandPaletteClick = () => {
    showCommandPalette(props.instanceId)
  }

  const messageInfoMap = createMemo(() => {
    const map = new Map<string, MessageInfo>()
    messageIds().forEach((id) => {
      const info = store().getMessageInfo(id)
      if (info) {
        map.set(id, info)
      }
    })
    return map
  })
  const revertTarget = createMemo(() => store().getSessionRevert(props.sessionId))

  const displayItems = createMemo<DisplayItem[]>(() => {
    const infoMap = messageInfoMap()
    const showThinking = preferences().showThinkingBlocks
    const revert = revertTarget()
    const items: DisplayItem[] = []

    const records = messageRecords()
    let lastAssistantIndex = -1
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].role === "assistant") {
        lastAssistantIndex = i
        break
      }
    }

    for (let index = 0; index < records.length; index++) {
      const record = records[index]
      if (revert?.messageID && record.id === revert.messageID) {
        break
      }

      const baseMessage = recordToMessage(record)
      const displayParts = computeDisplayParts(baseMessage, showThinking)
      baseMessage.displayParts = displayParts
      const combinedParts = displayParts.combined
      const messageInfo = infoMap.get(record.id)
      const isQueued =
        baseMessage.type === "user" && (lastAssistantIndex === -1 || index > lastAssistantIndex)

      if (hasRenderableContent(baseMessage, combinedParts, messageInfo)) {
        items.push({
          type: "message",
          message: baseMessage,
          combinedParts,
          messageInfo,
          isQueued,
        })
      }

      const toolParts: ToolCallPart[] = displayParts.tool.filter(isToolPart)
      toolParts.forEach((toolPart, toolIndex) => {
        const partVersion = typeof toolPart.version === "number" ? toolPart.version : 0
        const messageVersion = typeof baseMessage.version === "number" ? baseMessage.version : 0
        const key = toolPart.id || `${record.id}-tool-${toolIndex}`
        items.push({
          type: "tool",
          key,
          toolPart,
          messageInfo,
          messageId: record.id,
          messageVersion,
          partVersion,
        })
      })
    }

    return items
  })

  const changeToken = createMemo(() => {
    const entries = displayItems()
    return entries
      .map((item) => {
        if (item.type === "message") {
          return `${item.message.id}:${item.message.version}:${item.combinedParts.length}`
        }
        const status = item.toolPart.state?.status || "unknown"
        return `tool:${item.key}:${item.partVersion}:${status}`
      })
      .join("|")
  })

  const [autoScroll, setAutoScroll] = createSignal(true)
  const [showScrollButton, setShowScrollButton] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  function isNearBottom(element: HTMLDivElement, offset = 48) {
    const { scrollTop, scrollHeight, clientHeight } = element
    return scrollHeight - (scrollTop + clientHeight) <= offset
  }

  function scrollToBottom(immediate = false) {
    if (!containerRef) return
    const behavior = immediate ? "auto" : "smooth"
    containerRef.scrollTo({ top: containerRef.scrollHeight, behavior })
    setAutoScroll(true)
    persistScrollState()
  }

  function persistScrollState() {
    if (!containerRef) return
    setScrollCache(
      { instanceId: props.instanceId, sessionId: props.sessionId, scope: SCROLL_SCOPE },
      {
        scrollTop: containerRef.scrollTop,
        atBottom: isNearBottom(containerRef),
      },
    )
  }

  function handleScroll(event: Event) {
    if (!containerRef) return
    const atBottom = isNearBottom(containerRef)
    setShowScrollButton(!atBottom)
    if (event.isTrusted) {
      setAutoScroll(atBottom)
    }
    persistScrollState()
  }

  createEffect(() => {
    const scrollSnapshot = getScrollCache({ instanceId: props.instanceId, sessionId: props.sessionId, scope: SCROLL_SCOPE })
    requestAnimationFrame(() => {
      if (!containerRef) return
      if (scrollSnapshot) {
        const maxScrollTop = Math.max(containerRef.scrollHeight - containerRef.clientHeight, 0)
        containerRef.scrollTop = Math.min(scrollSnapshot.scrollTop, maxScrollTop)
        setAutoScroll(scrollSnapshot.atBottom)
        setShowScrollButton(!scrollSnapshot.atBottom)
      } else {
        scrollToBottom(true)
      }
    })
  })

  let previousToken: string | undefined
  createEffect(() => {
    const token = changeToken()
    if (!token || token === previousToken) {
      return
    }
    previousToken = token
    if (autoScroll()) {
      requestAnimationFrame(() => scrollToBottom(true))
    }
  })

  createEffect(() => {
    if (displayItems().length === 0) {
      setShowScrollButton(false)
      setAutoScroll(true)
    }
  })

  onCleanup(() => {
    persistScrollState()
  })

  return (
    <div class="message-stream-container">
      <div class="connection-status">
        <div class="connection-status-text connection-status-info flex flex-wrap items-center gap-2 text-sm font-medium">
          <div class="inline-flex items-center gap-1 rounded-full border border-base px-2 py-0.5 text-xs text-primary">
            <span class="uppercase text-[10px] tracking-wide text-primary/70">Used</span>
            <span class="font-semibold text-primary">{formatTokens(tokenStats().used)}</span>
          </div>
          <div class="inline-flex items-center gap-1 rounded-full border border-base px-2 py-0.5 text-xs text-primary">
            <span class="uppercase text-[10px] tracking-wide text-primary/70">Avail</span>
            <span class="font-semibold text-primary">
              {sessionInfo().contextAvailableTokens !== null ? formatTokens(sessionInfo().contextAvailableTokens ?? 0) : "--"}
            </span>
          </div>
        </div>

        <div class="connection-status-text connection-status-shortcut">
          <div class="connection-status-shortcut-action">
            <button type="button" class="connection-status-button" onClick={handleCommandPaletteClick} aria-label="Open command palette">
              Command Palette
            </button>
            <span class="connection-status-shortcut-hint">
              <Kbd shortcut="cmd+shift+p" />
            </span>
          </div>
        </div>
        <div class="connection-status-meta flex items-center justify-end gap-3">
          <Show when={connectionStatus() === "connected"}>
            <span class="status-indicator connected">
              <span class="status-dot" />
              Connected
            </span>
          </Show>
          <Show when={connectionStatus() === "connecting"}>
            <span class="status-indicator connecting">
              <span class="status-dot" />
              Connecting...
            </span>
          </Show>
          <Show when={connectionStatus() === "error" || connectionStatus() === "disconnected"}>
            <span class="status-indicator disconnected">
              <span class="status-dot" />
              Disconnected
            </span>
          </Show>
        </div>
      </div>

      <div
        class="message-stream"
        ref={(element) => {
          containerRef = element || undefined
        }}
        onScroll={handleScroll}
      >
        <Show when={!props.loading && displayItems().length === 0}>
          <div class="empty-state">
            <div class="empty-state-content">
              <div class="flex flex-col items-center gap-3 mb-6">
                <img src={codeNomadLogo} alt="CodeNomad logo" class="h-48 w-auto" loading="lazy" />
                <h1 class="text-3xl font-semibold text-primary">CodeNomad</h1>
              </div>
              <h3>Start a conversation</h3>
              <p>Type a message below or open the Command Palette:</p>
              <ul>
                <li>
                  <span>Command Palette</span>
                  <Kbd shortcut="cmd+shift+p" class="ml-2" />
                </li>
                <li>Ask about your codebase</li>
                <li>
                  Attach files with <code>@</code>
                </li>
              </ul>
            </div>
          </div>
        </Show>

        <Show when={props.loading}>
          <div class="loading-state">
            <div class="spinner" />
            <p>Loading messages...</p>
          </div>
        </Show>

        <For each={displayItems()}>
          {(item) => {
            if (item.type === "message") {
              return (
                <MessageItem
                  message={item.message}
                  messageInfo={item.messageInfo}
                  parts={item.combinedParts}
                  instanceId={props.instanceId}
                  sessionId={props.sessionId}
                  isQueued={item.isQueued}
                  onRevert={props.onRevert}
                  onFork={props.onFork}
                />
              )
            }

            return (
              <div class="tool-call-message" data-key={item.key}>
                <div class="tool-call-header-label">
                  <div class="tool-call-header-meta">
                    <span class="tool-call-icon">{TOOL_ICON}</span>
                    <span>Tool Call</span>
                    <span class="tool-name">{item.toolPart.tool || "unknown"}</span>
                  </div>
                </div>
                <ToolCall
                  toolCall={item.toolPart}
                  toolCallId={item.key}
                  messageId={item.messageId}
                  messageVersion={item.messageVersion}
                  partVersion={item.partVersion}
                  instanceId={props.instanceId}
                  sessionId={props.sessionId}
                />
              </div>
            )
          }}
        </For>
      </div>

      <Show when={showScrollButton()}>
        <div class="message-scroll-button-wrapper">
          <button type="button" class="message-scroll-button" onClick={() => scrollToBottom()} aria-label="Scroll to latest message">
            <span class="message-scroll-icon" aria-hidden="true">
              ↓
            </span>
          </button>
        </div>
      </Show>
    </div>
  )
}
