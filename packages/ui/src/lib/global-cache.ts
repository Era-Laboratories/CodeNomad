interface CacheLocation {
  instanceId?: string
  sessionId?: string
  scope?: string
}

const GLOBAL_KEY = "GLOBAL"

type CacheScope = Map<string, unknown>
type ScopeCollection = Map<string, CacheScope>
type SessionMap = Map<string, ScopeCollection>
const cacheRoot = new Map<string, SessionMap>()

function resolveKey(value?: string) {
  return value && value.length > 0 ? value : GLOBAL_KEY
}

function resolveCacheScope(location: CacheLocation, createIfMissing: boolean): CacheScope | undefined {
  const instanceKey = resolveKey(location.instanceId)
  const sessionKey = resolveKey(location.sessionId)
  const scopeKey = resolveKey(location.scope)

  let sessionMap = cacheRoot.get(instanceKey)
  if (!sessionMap) {
    if (!createIfMissing) return undefined
    sessionMap = new Map()
    cacheRoot.set(instanceKey, sessionMap)
  }

  let scopeCollection = sessionMap.get(sessionKey)
  if (!scopeCollection) {
    if (!createIfMissing) return undefined
    scopeCollection = new Map()
    sessionMap.set(sessionKey, scopeCollection)
  }

  let cacheScope = scopeCollection.get(scopeKey)
  if (!cacheScope) {
    if (!createIfMissing) return undefined
    cacheScope = new Map()
    scopeCollection.set(scopeKey, cacheScope)
  }

  return cacheScope
}

export function setGlobalCacheValue(location: CacheLocation, key: string, value: unknown): void {
  const cacheScope = resolveCacheScope(location, true)
  cacheScope?.set(key, value)
}

export function getGlobalCacheValue<T = unknown>(location: CacheLocation, key: string): T | undefined {
  const cacheScope = resolveCacheScope(location, false)
  return (cacheScope?.get(key) as T | undefined) ?? undefined
}

export function deleteGlobalCacheValue(location: CacheLocation, key: string): void {
  const cacheScope = resolveCacheScope(location, false)
  cacheScope?.delete(key)
}

export function clearGlobalCacheScope(location: CacheLocation): void {
  const instanceKey = resolveKey(location.instanceId)
  const sessionKey = resolveKey(location.sessionId)
  const scopeKey = resolveKey(location.scope)
  const sessionMap = cacheRoot.get(instanceKey)
  if (!sessionMap) return
  const scopeCollection = sessionMap.get(sessionKey)
  if (!scopeCollection) return
  scopeCollection.delete(scopeKey)
  if (scopeCollection.size === 0) {
    sessionMap.delete(sessionKey)
  }
  if (sessionMap.size === 0) {
    cacheRoot.delete(instanceKey)
  }
}

export function clearGlobalCacheSession(instanceId?: string, sessionId?: string): void {
  const instanceKey = resolveKey(instanceId)
  const sessionKey = resolveKey(sessionId)
  const sessionMap = cacheRoot.get(instanceKey)
  if (!sessionMap) return
  sessionMap.delete(sessionKey)
  if (sessionMap.size === 0) {
    cacheRoot.delete(instanceKey)
  }
}

export function clearGlobalCacheInstance(instanceId?: string): void {
  const instanceKey = resolveKey(instanceId)
  cacheRoot.delete(instanceKey)
}

export function clearAllGlobalCache(): void {
  cacheRoot.clear()
}
