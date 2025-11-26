import { For, Show, createMemo, createSignal, createEffect, onCleanup } from "solid-js"
import MessageItem from "./message-item"
import ToolCall from "./tool-call"
import Kbd from "./kbd"
import type { MessageInfo, ClientPart } from "../types/message"
import { getSessionInfo } from "../stores/sessions"
import { showCommandPalette } from "../stores/command-palette"
import { messageStoreBus } from "../stores/message-v2/bus"
import type { MessageRecord } from "../stores/message-v2/types"
import { buildRecordDisplayData, clearRecordDisplayCacheForInstance, type ToolCallPart } from "../stores/message-v2/record-display-cache"
import { useConfig } from "../stores/preferences"
import { sseManager } from "../lib/sse-manager"
import { formatTokenTotal } from "../lib/formatters"
import { useScrollCache } from "../lib/hooks/use-scroll-cache"

const SCROLL_SCOPE = "session"
const TOOL_ICON = "🔧"
const codeNomadLogo = new URL("../images/CodeNomad-Icon.png", import.meta.url).href

const INITIAL_BATCH_COUNT = 150
const PREPEND_CHUNK_COUNT = 50
const LOAD_MORE_THRESHOLD_PX = 320
const ESTIMATED_MESSAGE_HEIGHT = 120

const messageItemCache = new Map<string, MessageDisplayItem>()
const toolItemCache = new Map<string, ToolDisplayItem>()

function makeInstanceCacheKey(instanceId: string, id: string) {
  return `${instanceId}:${id}`
}

function clearInstanceCaches(instanceId: string) {
  clearRecordDisplayCacheForInstance(instanceId)
  const prefix = `${instanceId}:`
  for (const key of messageItemCache.keys()) {
    if (key.startsWith(prefix)) {
      messageItemCache.delete(key)
    }
  }
  for (const key of toolItemCache.keys()) {
    if (key.startsWith(prefix)) {
      toolItemCache.delete(key)
    }
  }
}

messageStoreBus.onInstanceDestroyed(clearInstanceCaches)

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
  record: MessageRecord
  combinedParts: ClientPart[]
  orderedParts: ClientPart[]
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

interface MessageDisplayBlock {
  record: MessageRecord
  messageItem: MessageDisplayItem | null
  toolItems: ToolDisplayItem[]
}

interface MeasurementEntry {
  revision: number
  height: number
}

function hasRenderableContent(record: MessageRecord, combinedParts: ClientPart[], info?: MessageInfo): boolean {
  if (record.role !== "assistant" && record.role !== "user") {
    return false
  }
  if (record.role !== "assistant" || combinedParts.length > 0) {
    return true
  }
  if (info && info.role === "assistant" && info.error) {
    return true
  }
  return record.status === "error"
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

  const [visibleRange, setVisibleRange] = createSignal({ start: 0, end: 0 })
  const [rangeInitialized, setRangeInitialized] = createSignal(false)
  const [forceFullHistory, setForceFullHistory] = createSignal(false)
  const messageMeasurements = new Map<string, MeasurementEntry>()
  const [measurementVersion, setMeasurementVersion] = createSignal(0)
  const [virtualPadding, setVirtualPadding] = createSignal(0)
  const [reachedAbsoluteTop, setReachedAbsoluteTop] = createSignal(false)
  const showLoadOlderButton = createMemo(() => visibleRange().start > 0 && reachedAbsoluteTop())

  function updateMeasurementCache(messageId: string, revision: number, height: number) {
    const safeHeight = Math.max(0, height)
    const existing = messageMeasurements.get(messageId)
    if (existing && existing.revision === revision && Math.abs(existing.height - safeHeight) < 1) {
      return
    }
    messageMeasurements.set(messageId, { revision, height: safeHeight })
    setMeasurementVersion((value) => value + 1)
  }

  function getAverageMeasuredHeight() {
    if (messageMeasurements.size === 0) {
      return ESTIMATED_MESSAGE_HEIGHT
    }
    let total = 0
    for (const entry of messageMeasurements.values()) {
      total += entry.height
    }
    return total / messageMeasurements.size
  }

  const messageIndexMap = createMemo(() => {
    const map = new Map<string, number>()
    const records = messageRecords()
    records.forEach((record, index) => map.set(record.id, index))
    return map
  })

  const lastAssistantIndex = createMemo(() => {
    const records = messageRecords()
    for (let index = records.length - 1; index >= 0; index--) {
      if (records[index].role === "assistant") {
        return index
      }
    }
    return -1
  })

  const visibleRecords = createMemo(() => {
    const records = messageRecords()
    const range = visibleRange()
    if (range.end === 0) {
      return records
    }
    return records.slice(range.start, range.end)
  })

  const sessionRevision = createMemo(() => store().getSessionRevision(props.sessionId))
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
    const records = visibleRecords()
    records.forEach((record) => {
      const info = store().getMessageInfo(record.id)
      if (info) {
        map.set(record.id, info)
      }
    })
    return map
  })
  const revertTarget = createMemo(() => store().getSessionRevert(props.sessionId))

  const scrollCache = useScrollCache({
    instanceId: () => props.instanceId,
    sessionId: () => props.sessionId,
    scope: SCROLL_SCOPE,
  })

  let previousToken: string | undefined

  createEffect(() => {
    const sessionId = props.sessionId
    store()
    messageMeasurements.clear()
    setMeasurementVersion((value) => value + 1)
    setVirtualPadding(0)
    setVisibleRange({ start: 0, end: 0 })
    setRangeInitialized(false)
    setReachedAbsoluteTop(false)
    const snapshot = store().getScrollSnapshot(sessionId, SCROLL_SCOPE)
    setForceFullHistory(Boolean(snapshot && !snapshot.atBottom))
    previousToken = undefined
  })

  const displayBlocks = createMemo<MessageDisplayBlock[]>(() => {
    const infoMap = messageInfoMap()
    const showThinking = preferences().showThinkingBlocks
    const revert = revertTarget()
    const instanceId = props.instanceId
    const blocks: MessageDisplayBlock[] = []
    const usedMessageKeys = new Set<string>()
    const usedToolKeys = new Set<string>()
    const records = visibleRecords()
    const globalAssistantIndex = lastAssistantIndex()
    const indexMap = messageIndexMap()

    for (let index = 0; index < records.length; index++) {
      const record = records[index]
      if (revert?.messageID && record.id === revert.messageID) {
        break
      }

      const { orderedParts, textAndReasoningParts, toolParts } = buildRecordDisplayData(instanceId, record, showThinking)
      const messageInfo = infoMap.get(record.id)
      const recordCacheKey = makeInstanceCacheKey(instanceId, record.id)
      const recordIndex = indexMap.get(record.id) ?? 0
      const isQueued = record.role === "user" && (globalAssistantIndex === -1 || recordIndex > globalAssistantIndex)

      let messageItem: MessageDisplayItem | null = null
      if (hasRenderableContent(record, textAndReasoningParts, messageInfo)) {
        let cached = messageItemCache.get(recordCacheKey)
        if (!cached) {
          cached = {
            type: "message",
            record,
            combinedParts: textAndReasoningParts,
            orderedParts,
            messageInfo,
            isQueued,
          }
          messageItemCache.set(recordCacheKey, cached)
        } else {
          cached.record = record
          cached.combinedParts = textAndReasoningParts
          cached.orderedParts = orderedParts
          cached.messageInfo = messageInfo
          cached.isQueued = isQueued
        }
        messageItem = cached
        usedMessageKeys.add(recordCacheKey)
      }

      const toolItems: ToolDisplayItem[] = []
      toolParts.forEach((toolPart, toolIndex) => {
        const partVersion = typeof toolPart.version === "number" ? toolPart.version : 0
        const messageVersion = record.revision
        const key = `${record.id}:${toolPart.id ?? toolIndex}`
        const toolCacheKey = makeInstanceCacheKey(instanceId, key)
        let toolItem = toolItemCache.get(toolCacheKey)
        if (!toolItem) {
          toolItem = {
            type: "tool",
            key,
            toolPart,
            messageInfo,
            messageId: record.id,
            messageVersion,
            partVersion,
          }
          toolItemCache.set(toolCacheKey, toolItem)
        } else {
          toolItem.key = key
          toolItem.toolPart = toolPart
          toolItem.messageInfo = messageInfo
          toolItem.messageId = record.id
          toolItem.messageVersion = messageVersion
          toolItem.partVersion = partVersion
        }
        toolItems.push(toolItem)
        usedToolKeys.add(toolCacheKey)
      })

      if (!messageItem && toolItems.length === 0) {
        continue
      }

      blocks.push({ record, messageItem, toolItems })
    }

    for (const key of messageItemCache.keys()) {
      if (!usedMessageKeys.has(key)) {
        messageItemCache.delete(key)
      }
    }

    for (const key of toolItemCache.keys()) {
      if (!usedToolKeys.has(key)) {
        toolItemCache.delete(key)
      }
    }

    return blocks
  })

  createEffect(() => {
    const records = messageRecords()
    const total = records.length
    const requireFullHistory = forceFullHistory()
    if (total === 0) {
      setVisibleRange({ start: 0, end: 0 })
      setRangeInitialized(false)
      return
    }

    setVisibleRange((current) => {
      if (!rangeInitialized() || requireFullHistory) {
        const start = requireFullHistory ? 0 : Math.max(0, total - INITIAL_BATCH_COUNT)
        if (!rangeInitialized()) {
          setRangeInitialized(true)
        }
        if (requireFullHistory) {
          setForceFullHistory(false)
        }
        return { start, end: total }
      }
      const nextEnd = total
      let nextStart = current.start
      if (nextStart > nextEnd) {
        nextStart = Math.max(0, nextEnd - INITIAL_BATCH_COUNT)
      }
      return { start: nextStart, end: nextEnd }
    })
  })

  createEffect(() => {
    measurementVersion()
    const range = visibleRange()
    if (range.start <= 0) {
      setVirtualPadding(0)
      return
    }
    const records = messageRecords()
    const trimmed = records.slice(0, range.start)
    if (trimmed.length === 0) {
      setVirtualPadding(0)
      return
    }
    const fallback = getAverageMeasuredHeight()
    let total = 0
    for (const record of trimmed) {
      const entry = messageMeasurements.get(record.id)
      total += entry?.height ?? fallback
    }
    setVirtualPadding(total)
  })

  const changeToken = createMemo(() => {
    const revisionValue = sessionRevision()
    const range = visibleRange()
    const blocks = displayBlocks()
    if (blocks.length === 0) {
      return `${revisionValue}:${range.start}:${range.end}:empty`
    }
    const lastBlock = blocks[blocks.length - 1]
    const lastTool = lastBlock.toolItems[lastBlock.toolItems.length - 1]
    const tailSignature = lastTool
      ? `tool:${lastTool.key}:${lastTool.partVersion}`
      : `msg:${lastBlock.record.id}:${lastBlock.record.revision}`
    return `${revisionValue}:${range.start}:${range.end}:${tailSignature}`
  })

  const [autoScroll, setAutoScroll] = createSignal(true)
  const [showScrollButton, setShowScrollButton] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  function captureScrollSnapshot() {
    if (!containerRef) return { height: 0, top: 0 }
    return { height: containerRef.scrollHeight, top: containerRef.scrollTop }
  }

  function restoreScrollSnapshot(snapshot?: { height: number; top: number }) {
    if (!containerRef || !snapshot) return
    requestAnimationFrame(() => {
      if (!containerRef) return
      const delta = containerRef.scrollHeight - snapshot.height
      containerRef.scrollTop = snapshot.top + delta
    })
  }

  function prependChunk(amount = PREPEND_CHUNK_COUNT) {
    if (visibleRange().start === 0) {
      return
    }
    const snapshot = captureScrollSnapshot()
    setVisibleRange((range) => {
      if (range.start === 0) {
        return range
      }
      const nextStart = Math.max(0, range.start - amount)
      return { start: nextStart, end: range.end }
    })
    restoreScrollSnapshot(snapshot)
  }

  function loadAllOlderMessages() {
    if (visibleRange().start === 0) {
      return
    }
    const snapshot = captureScrollSnapshot()
    setVisibleRange((range) => ({ start: 0, end: range.end }))
    restoreScrollSnapshot(snapshot)
  }

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
    scrollCache.persist(containerRef, { atBottomOffset: 48 })
  }

  function handleScroll(event: Event) {
    if (!containerRef) return
    const atBottom = isNearBottom(containerRef)
    setShowScrollButton(!atBottom)
    const atAbsoluteTop = containerRef.scrollTop <= 4
    setReachedAbsoluteTop(atAbsoluteTop)
    if (event.isTrusted) {
      setAutoScroll(atBottom)
      if (containerRef.scrollTop <= LOAD_MORE_THRESHOLD_PX && visibleRange().start > 0) {
        prependChunk()
      }
    }
    persistScrollState()
  }

  createEffect(() => {
    const sessionId = props.sessionId
    store()
    const target = containerRef
    if (!target) return
    scrollCache.restore(target, {
      fallback: () => scrollToBottom(true),
      onApplied: (snapshot) => {
        if (snapshot) {
          setAutoScroll(snapshot.atBottom)
          setShowScrollButton(!snapshot.atBottom)
        } else {
          const atBottom = isNearBottom(target)
          setAutoScroll(atBottom)
          setShowScrollButton(!atBottom)
        }
      },
    })
    void sessionId
  })

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
    if (messageRecords().length === 0) {
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
        <Show when={!props.loading && messageRecords().length === 0}>
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

        <Show when={virtualPadding() > 0}>
          <div class="message-stream-virtual-padding" style={{ height: `${virtualPadding()}px` }} aria-hidden="true" />
        </Show>

        <Show when={showLoadOlderButton()}>
          <div class="message-stream-load-older">
            <button type="button" class="message-stream-load-older-button" onClick={loadAllOlderMessages}>
              Load older messages
            </button>
          </div>
        </Show>

        <For each={displayBlocks()}>
          {(block) => {
            let blockRef: HTMLDivElement | undefined

            const scheduleMeasurement = () => {
              if (!blockRef) return
              requestAnimationFrame(() => {
                if (!blockRef) return
                updateMeasurementCache(block.record.id, block.record.revision, blockRef.clientHeight)
              })
            }

            createEffect(() => {
              void block.record.revision
              scheduleMeasurement()
            })

            return (
              <div
                class="message-stream-block"
                data-message-id={block.record.id}
                ref={(element) => {
                  blockRef = element || undefined
                  if (element) {
                    scheduleMeasurement()
                  }
                }}
              >
                <Show when={block.messageItem} keyed>
                  {(message) => (
                    <MessageItem
                      record={message.record}
                      messageInfo={message.messageInfo}
                      combinedParts={message.combinedParts}
                      orderedParts={message.orderedParts}
                      instanceId={props.instanceId}
                      sessionId={props.sessionId}
                      isQueued={message.isQueued}
                      onRevert={props.onRevert}
                      onFork={props.onFork}
                    />
                  )}
                </Show>

                <For each={block.toolItems}>
                  {(item) => (
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
                  )}
                </For>
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
