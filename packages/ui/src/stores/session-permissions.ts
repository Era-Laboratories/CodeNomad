import { createSignal } from "solid-js"
import { preferences } from "./preferences"
import { getInstanceConfig } from "./instance-config"
import type { PermissionOverride } from "../../../server/src/api-types"

/**
 * Session-level permission overrides (in-memory only, not persisted)
 *
 * Hierarchy: Session Override > Project Override > Global Setting
 *
 * Session override values:
 * - null: inherit from project/global (no override)
 * - true: auto-approve enabled for this session
 * - false: auto-approve disabled for this session
 */

// Map<instanceId, Map<sessionId, override>>
const [sessionOverrides, setSessionOverrides] = createSignal<Map<string, Map<string, boolean>>>(new Map())

/**
 * Get the effective permission state for a session
 * Resolves the hierarchy: Session > Project > Global
 */
function getEffectivePermissionState(instanceId: string, sessionId: string): boolean {
  // 1. Check session override
  const instanceMap = sessionOverrides().get(instanceId)
  if (instanceMap?.has(sessionId)) {
    return instanceMap.get(sessionId)!
  }

  // 2. Check project override
  const instanceConfig = getInstanceConfig(instanceId)
  const projectOverride = instanceConfig.permissionOverride as PermissionOverride | undefined
  if (projectOverride === "enabled") {
    return true
  }
  if (projectOverride === "disabled") {
    return false
  }

  // 3. Fall back to global setting
  return preferences().autoApprovePermissions
}

/**
 * Check if a session has an explicit override
 */
function hasSessionPermissionOverride(instanceId: string, sessionId: string): boolean {
  const instanceMap = sessionOverrides().get(instanceId)
  return instanceMap?.has(sessionId) ?? false
}

/**
 * Get the raw session override value (null if no override)
 */
function getSessionPermissionOverride(instanceId: string, sessionId: string): boolean | null {
  const instanceMap = sessionOverrides().get(instanceId)
  if (!instanceMap?.has(sessionId)) {
    return null
  }
  return instanceMap.get(sessionId)!
}

/**
 * Toggle the session permission override
 * If no override exists, sets to opposite of current effective state
 * If override exists, toggles the override value
 */
function toggleSessionPermission(instanceId: string, sessionId: string): void {
  setSessionOverrides((prev) => {
    const next = new Map(prev)
    const instanceMap = new Map(next.get(instanceId) ?? new Map())

    if (instanceMap.has(sessionId)) {
      // Toggle existing override
      instanceMap.set(sessionId, !instanceMap.get(sessionId))
    } else {
      // Create new override (opposite of current effective state)
      const currentState = getEffectivePermissionState(instanceId, sessionId)
      instanceMap.set(sessionId, !currentState)
    }

    next.set(instanceId, instanceMap)
    return next
  })
}

/**
 * Clear the session permission override
 */
function clearSessionPermissionOverride(instanceId: string, sessionId: string): void {
  setSessionOverrides((prev) => {
    const next = new Map(prev)
    const instanceMap = next.get(instanceId)
    if (instanceMap) {
      const updatedMap = new Map(instanceMap)
      updatedMap.delete(sessionId)
      if (updatedMap.size === 0) {
        next.delete(instanceId)
      } else {
        next.set(instanceId, updatedMap)
      }
    }
    return next
  })
}

/**
 * Clear all session overrides for an instance (e.g., when instance closes)
 */
function clearInstanceSessionOverrides(instanceId: string): void {
  setSessionOverrides((prev) => {
    const next = new Map(prev)
    next.delete(instanceId)
    return next
  })
}

export {
  getEffectivePermissionState,
  hasSessionPermissionOverride,
  getSessionPermissionOverride,
  toggleSessionPermission,
  clearSessionPermissionOverride,
  clearInstanceSessionOverrides,
}
