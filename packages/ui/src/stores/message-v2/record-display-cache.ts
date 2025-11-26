import type { ClientPart } from "../../types/message"
import { partHasRenderableText } from "../../types/message"
import type { MessageRecord } from "./types"

export type ToolCallPart = Extract<ClientPart, { type: "tool" }>

export interface RecordDisplayData {
  orderedParts: ClientPart[]
  textAndReasoningParts: ClientPart[]
  toolParts: ToolCallPart[]
}

interface RecordDisplayCacheEntry {
  revision: number
  data: RecordDisplayData
}

const recordDisplayCache = new Map<string, RecordDisplayCacheEntry>()

function makeCacheKey(instanceId: string, messageId: string, showThinking: boolean) {
  return `${instanceId}:${messageId}:${showThinking ? 1 : 0}`
}

function isToolPart(part: ClientPart): part is ToolCallPart {
  return part.type === "tool"
}

export function buildRecordDisplayData(instanceId: string, record: MessageRecord, showThinking: boolean): RecordDisplayData {
  const cacheKey = makeCacheKey(instanceId, record.id, showThinking)
  const cached = recordDisplayCache.get(cacheKey)
  if (cached && cached.revision === record.revision) {
    return cached.data
  }

  const orderedParts: ClientPart[] = []
  const textAndReasoningParts: ClientPart[] = []
  const toolParts: ToolCallPart[] = []

  for (const partId of record.partIds) {
    const entry = record.parts[partId]
    if (!entry?.data) continue
    const part = entry.data
    orderedParts.push(part)

    if (isToolPart(part)) {
      toolParts.push(part)
      continue
    }

    if (part.type === "text" && !part.synthetic && partHasRenderableText(part)) {
      textAndReasoningParts.push(part)
      continue
    }

    if (part.type === "reasoning" && showThinking && partHasRenderableText(part)) {
      textAndReasoningParts.push(part)
    }
  }

  const data = { orderedParts, textAndReasoningParts, toolParts }
  recordDisplayCache.set(cacheKey, { revision: record.revision, data })
  return data
}

export function clearRecordDisplayCacheForInstance(instanceId: string) {
  const prefix = `${instanceId}:`
  for (const key of recordDisplayCache.keys()) {
    if (key.startsWith(prefix)) {
      recordDisplayCache.delete(key)
    }
  }
}
