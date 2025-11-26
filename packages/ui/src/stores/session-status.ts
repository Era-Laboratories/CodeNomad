import type { Session, SessionStatus } from "../types/session"
import type { Message, MessageInfo } from "../types/message"
import type { MessageRecord } from "./message-v2/types"
import { sessions } from "./sessions"
import { isSessionCompactionActive } from "./session-compaction"
import { messageStoreBus } from "./message-v2/bus"

function getSession(instanceId: string, sessionId: string): Session | null {
  const instanceSessions = sessions().get(instanceId)
  return instanceSessions?.get(sessionId) ?? null
}

function isSessionCompacting(session: Session): boolean {
  const time = (session.time as (Session["time"] & { compacting?: number }) | undefined)
  const compactingFlag = time?.compacting
  if (typeof compactingFlag === "number") {
    return compactingFlag > 0
  }
  return Boolean(compactingFlag)
}

function getLatestInfoFromStore(instanceId: string, sessionId: string, role?: MessageInfo["role"]): MessageInfo | undefined {
  const store = messageStoreBus.getOrCreate(instanceId)
  const messageIds = store.getSessionMessageIds(sessionId)
  let latest: MessageInfo | undefined
  let latestTimestamp = Number.NEGATIVE_INFINITY
  for (const id of messageIds) {
    const info = store.getMessageInfo(id)
    if (!info) continue
    if (role && info.role !== role) continue
    const timestamp = info.time?.created ?? 0
    if (timestamp >= latestTimestamp) {
      latest = info
      latestTimestamp = timestamp
    }
  }
  return latest
}

function getLastMessageFromStore(instanceId: string, sessionId: string): MessageRecord | undefined {
  const store = messageStoreBus.getOrCreate(instanceId)
  const messageIds = store.getSessionMessageIds(sessionId)
  let latest: MessageRecord | undefined
  let latestTimestamp = Number.NEGATIVE_INFINITY
  for (const id of messageIds) {
    const record = store.getMessage(id)
    if (!record) continue
    const info = store.getMessageInfo(id)
    const timestamp = info?.time?.created ?? record.createdAt ?? Number.NEGATIVE_INFINITY
    if (timestamp >= latestTimestamp) {
      latest = record
      latestTimestamp = timestamp
    }
  }
  return latest
}

function getLegacyLastMessage(session: Session): Message | undefined {
  let latest: Message | undefined
  let latestTimestamp = Number.NEGATIVE_INFINITY
  for (const message of session.messages) {
    if (!message) continue
    const info = session.messagesInfo.get(message.id)
    const timestamp = info?.time?.created ?? message.timestamp ?? Number.NEGATIVE_INFINITY
    if (timestamp >= latestTimestamp) {
      latest = message
      latestTimestamp = timestamp
    }
  }
  return latest
}

function getLegacyLastMessageInfo(session: Session, role?: MessageInfo["role"]): MessageInfo | undefined {
  if (session.messagesInfo.size === 0) {
    return undefined
  }
  let latest: MessageInfo | undefined
  let latestTimestamp = Number.NEGATIVE_INFINITY
  for (const info of session.messagesInfo.values()) {
    if (!info) continue
    if (role && info.role !== role) continue
    const timestamp = info.time?.created ?? 0
    if (timestamp >= latestTimestamp) {
      latest = info
      latestTimestamp = timestamp
    }
  }
  return latest
}

function getInfoCreatedTimestamp(info?: MessageInfo): number {
  if (!info) {
    return Number.NEGATIVE_INFINITY
  }
  const created = info.time?.created
  if (typeof created === "number" && Number.isFinite(created)) {
    return created
  }
  return Number.NEGATIVE_INFINITY
}

function getAssistantCompletionTimestamp(info?: MessageInfo): number {
  if (!info) {
    return Number.NEGATIVE_INFINITY
  }
  const completed = (info.time as { completed?: number } | undefined)?.completed
  if (typeof completed === "number" && Number.isFinite(completed)) {
    return completed
  }
  return Number.NEGATIVE_INFINITY
}

function isAssistantInfoPending(info?: MessageInfo): boolean {
  if (!info) {
    return false
  }
  const completed = (info.time as { completed?: number } | undefined)?.completed
  if (completed === undefined || completed === null) {
    return true
  }
  const created = getInfoCreatedTimestamp(info)
  return completed < created
}

function isAssistantStillGeneratingRecord(record: MessageRecord, info?: MessageInfo): boolean {
  if (record.role !== "assistant") {
    return false
  }

  if (record.status === "error") {
    return false
  }

  if (record.status === "streaming" || record.status === "sending") {
    return true
  }

  const completedAt = (info?.time as { completed?: number } | undefined)?.completed
  if (completedAt !== undefined && completedAt !== null) {
    return false
  }

  return !(record.status === "complete" || record.status === "sent")
}

function isAssistantStillGeneratingLegacy(message: Message, info?: MessageInfo): boolean {
  if (message.type !== "assistant") {
    return false
  }

  if (message.status === "error") {
    return false
  }

  if (message.status === "streaming" || message.status === "sending") {
    return true
  }

  const completedAt = (info?.time as { completed?: number } | undefined)?.completed
  if (completedAt !== undefined && completedAt !== null) {
    return false
  }

  return !(message.status === "complete" || message.status === "sent")
}

export function getSessionStatus(instanceId: string, sessionId: string): SessionStatus {
  const session = getSession(instanceId, sessionId)
  if (!session) {
    return "idle"
  }

  const store = messageStoreBus.getOrCreate(instanceId)

  if (isSessionCompactionActive(instanceId, sessionId) || isSessionCompacting(session)) {
    return "compacting"
  }

  const latestUserInfo = getLatestInfoFromStore(instanceId, sessionId, "user") ?? getLegacyLastMessageInfo(session, "user")
  const latestAssistantInfo = getLatestInfoFromStore(instanceId, sessionId, "assistant") ?? getLegacyLastMessageInfo(session, "assistant")

  const lastRecord = getLastMessageFromStore(instanceId, sessionId)
  const legacyFallbackMessage = lastRecord ? undefined : getLegacyLastMessage(session)

  if (!lastRecord && !legacyFallbackMessage) {
    const latestInfo = latestUserInfo ?? latestAssistantInfo ?? getLegacyLastMessageInfo(session)
    if (!latestInfo) {
      return "idle"
    }
    if (latestInfo.role === "user") {
      return "working"
    }
    const infoCompleted = latestInfo.time?.completed
    return infoCompleted ? "idle" : "working"
  }

  if (lastRecord) {
    if (lastRecord.role === "user") {
      return "working"
    }
    const infoForRecord = store.getMessageInfo(lastRecord.id) ?? latestAssistantInfo
    if (infoForRecord && isAssistantStillGeneratingRecord(lastRecord, infoForRecord)) {
      return "working"
    }
  } else if (legacyFallbackMessage) {
    if (legacyFallbackMessage.type === "user") {
      return "working"
    }
    const infoForLegacy = session.messagesInfo.get(legacyFallbackMessage.id) ?? latestAssistantInfo
    if (isAssistantStillGeneratingLegacy(legacyFallbackMessage, infoForLegacy)) {
      return "working"
    }
  }

  if (isAssistantInfoPending(latestAssistantInfo)) {
    return "working"
  }

  const userTimestamp = getInfoCreatedTimestamp(latestUserInfo)
  const assistantCompletedAt = getAssistantCompletionTimestamp(latestAssistantInfo)
  if (userTimestamp > assistantCompletedAt) {
    return "working"
  }

  return "idle"
}

export function isSessionBusy(instanceId: string, sessionId: string): boolean {
  const status = getSessionStatus(instanceId, sessionId)
  return status === "working" || status === "compacting"
}
