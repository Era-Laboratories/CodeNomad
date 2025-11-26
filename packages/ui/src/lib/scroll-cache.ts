import type { ScrollSnapshot } from "../stores/message-v2/types"

interface ScrollCacheParams {
  instanceId?: string
  sessionId?: string
  scope?: string
}

const scrollCache = new Map<string, ScrollSnapshot>()
const DEFAULT_SCOPE = "session"

function resolve(value?: string) {
  return value && value.length > 0 ? value : "GLOBAL"
}

function makeKey(params: ScrollCacheParams) {
  return `${resolve(params.instanceId)}:${resolve(params.sessionId)}:${params.scope ?? DEFAULT_SCOPE}`
}

export function setScrollCache(params: ScrollCacheParams, snapshot: Omit<ScrollSnapshot, "updatedAt">) {
  scrollCache.set(makeKey(params), { ...snapshot, updatedAt: Date.now() })
}

export function getScrollCache(params: ScrollCacheParams): ScrollSnapshot | undefined {
  return scrollCache.get(makeKey(params))
}

export function clearScrollCacheScope(params: ScrollCacheParams) {
  const key = makeKey(params)
  scrollCache.delete(key)
}

export function clearScrollCacheForSession(instanceId?: string, sessionId?: string) {
  const match = `${resolve(instanceId)}:${resolve(sessionId)}:`
  for (const key of scrollCache.keys()) {
    if (key.startsWith(match)) {
      scrollCache.delete(key)
    }
  }
}

export function clearScrollCacheForInstance(instanceId?: string) {
  const match = `${resolve(instanceId)}:`
  for (const key of scrollCache.keys()) {
    if (key.startsWith(match)) {
      scrollCache.delete(key)
    }
  }
}

export function clearAllScrollCache() {
  scrollCache.clear()
}
