import type { InstanceData } from "../../../cli/src/api-types"
import { storage } from "../lib/storage"

const MAX_HISTORY = 100

const instanceDataCache = new Map<string, InstanceData>()
const instanceSubscriptions = new Map<string, () => void>()

export async function addToHistory(instanceId: string, text: string): Promise<void> {
  const data = await ensureInstanceData(instanceId)
  const nextHistory = [text, ...data.messageHistory]
  if (nextHistory.length > MAX_HISTORY) {
    nextHistory.length = MAX_HISTORY
  }

  const nextData: InstanceData = {
    ...data,
    messageHistory: nextHistory,
  }

  instanceDataCache.set(instanceId, cloneInstanceData(nextData))

  try {
    await storage.saveInstanceData(instanceId, nextData)
  } catch (err) {
    console.warn("Failed to persist message history:", err)
  }
}

export async function getHistory(instanceId: string): Promise<string[]> {
  const data = await ensureInstanceData(instanceId)
  return [...data.messageHistory]
}

export async function clearHistory(instanceId: string): Promise<void> {
  const data = await ensureInstanceData(instanceId)
  const nextData: InstanceData = {
    ...data,
    messageHistory: [],
  }

  instanceDataCache.set(instanceId, cloneInstanceData(nextData))

  try {
    await storage.saveInstanceData(instanceId, nextData)
  } catch (error) {
    console.warn("Failed to clear history:", error)
  }
}

async function ensureInstanceData(instanceId: string): Promise<InstanceData> {
  const cached = instanceDataCache.get(instanceId)
  if (cached) {
    return cached
  }

  try {
    const data = await storage.loadInstanceData(instanceId)
    const normalized = cloneInstanceData(data)
    instanceDataCache.set(instanceId, normalized)
    attachInstanceSubscription(instanceId)
    return normalized
  } catch (error) {
    console.warn("Failed to load history:", error)
    const fallback = cloneInstanceData({ messageHistory: [] })
    instanceDataCache.set(instanceId, fallback)
    attachInstanceSubscription(instanceId)
    return fallback
  }
}

function attachInstanceSubscription(instanceId: string) {
  if (instanceSubscriptions.has(instanceId)) {
    return
  }
  const unsubscribe = storage.onInstanceDataChanged(instanceId, (data) => {
    instanceDataCache.set(instanceId, cloneInstanceData(data))
  })
  instanceSubscriptions.set(instanceId, unsubscribe)
}

function cloneInstanceData(data?: InstanceData | null): InstanceData {
  const source: InstanceData = data ?? { messageHistory: [] }
  return {
    ...source,
    messageHistory: Array.isArray(source.messageHistory) ? [...source.messageHistory] : [],
  }
}
