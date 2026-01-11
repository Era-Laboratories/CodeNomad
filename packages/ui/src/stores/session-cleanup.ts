/**
 * Session Cleanup Manager
 *
 * Handles automatic cleanup of idle child sessions:
 * - 5 minute idle timeout for sub-agent sessions
 * - Cleanup triggered when user sends message to parent thread
 */

import { getChildSessions } from "./session-state"
import { deleteSession } from "./session-api"
import { getLogger } from "../lib/logger"

const log = getLogger("session-cleanup")

// 5 minutes in milliseconds
const IDLE_TIMEOUT_MS = 5 * 60 * 1000

// Track last activity time for each session
const sessionLastActivity = new Map<string, number>()

// Track cleanup timeouts
const cleanupTimeouts = new Map<string, NodeJS.Timeout>()

/**
 * Update the last activity time for a session
 */
export function updateSessionActivity(instanceId: string, sessionId: string): void {
  const key = `${instanceId}:${sessionId}`
  sessionLastActivity.set(key, Date.now())

  // Clear any existing cleanup timeout
  const existingTimeout = cleanupTimeouts.get(key)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
    cleanupTimeouts.delete(key)
  }
}

/**
 * Schedule cleanup for a child session after idle timeout
 */
export function scheduleChildCleanup(instanceId: string, sessionId: string, parentId: string): void {
  const key = `${instanceId}:${sessionId}`

  // Clear any existing timeout
  const existingTimeout = cleanupTimeouts.get(key)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  // Schedule cleanup after idle timeout
  const timeout = setTimeout(async () => {
    try {
      log.info(`Auto-cleanup triggered for idle child session: ${sessionId}`)
      await deleteSession(instanceId, sessionId)
      cleanupTimeouts.delete(key)
      sessionLastActivity.delete(key)
    } catch (error) {
      log.error(`Failed to cleanup child session ${sessionId}:`, error)
    }
  }, IDLE_TIMEOUT_MS)

  cleanupTimeouts.set(key, timeout)
  log.debug(`Scheduled cleanup for child session ${sessionId} in 5 minutes`)
}

/**
 * Cancel scheduled cleanup for a session (e.g., when it becomes active again)
 */
export function cancelScheduledCleanup(instanceId: string, sessionId: string): void {
  const key = `${instanceId}:${sessionId}`
  const timeout = cleanupTimeouts.get(key)
  if (timeout) {
    clearTimeout(timeout)
    cleanupTimeouts.delete(key)
    log.debug(`Cancelled cleanup for session ${sessionId}`)
  }
}

/**
 * Clean up all idle child sessions for a parent session
 * Called when user sends a message to parent thread
 */
export async function cleanupIdleChildren(instanceId: string, parentSessionId: string): Promise<void> {
  const children = getChildSessions(instanceId, parentSessionId)

  if (children.length === 0) {
    return
  }

  const now = Date.now()
  const idleChildren = children.filter((child) => {
    const key = `${instanceId}:${child.id}`
    const lastActivity = sessionLastActivity.get(key) || child.time.updated || 0
    return child.status === "idle" && now - lastActivity > IDLE_TIMEOUT_MS
  })

  if (idleChildren.length === 0) {
    log.debug(`No idle children to cleanup for parent ${parentSessionId}`)
    return
  }

  log.info(`Cleaning up ${idleChildren.length} idle child sessions for parent ${parentSessionId}`)

  // Delete all idle children
  const deletePromises = idleChildren.map(async (child) => {
    try {
      await deleteSession(instanceId, child.id)
      const key = `${instanceId}:${child.id}`
      cleanupTimeouts.delete(key)
      sessionLastActivity.delete(key)
    } catch (error) {
      log.error(`Failed to delete child session ${child.id}:`, error)
    }
  })

  await Promise.all(deletePromises)
}

/**
 * Get time remaining until cleanup for a session (in ms)
 * Returns null if no cleanup is scheduled
 */
export function getCleanupTimeRemaining(instanceId: string, sessionId: string): number | null {
  const key = `${instanceId}:${sessionId}`
  const lastActivity = sessionLastActivity.get(key)

  if (!lastActivity) return null

  const elapsed = Date.now() - lastActivity
  const remaining = IDLE_TIMEOUT_MS - elapsed

  return remaining > 0 ? remaining : 0
}

/**
 * Check if a session is due for cleanup
 */
export function isSessionDueForCleanup(instanceId: string, sessionId: string): boolean {
  const remaining = getCleanupTimeRemaining(instanceId, sessionId)
  return remaining !== null && remaining <= 0
}

/**
 * Clear all cleanup tracking (e.g., when instance is stopped)
 */
export function clearAllCleanupTracking(instanceId: string): void {
  // Clear all timeouts for this instance
  for (const [key, timeout] of cleanupTimeouts.entries()) {
    if (key.startsWith(`${instanceId}:`)) {
      clearTimeout(timeout)
      cleanupTimeouts.delete(key)
    }
  }

  // Clear activity tracking for this instance
  for (const key of sessionLastActivity.keys()) {
    if (key.startsWith(`${instanceId}:`)) {
      sessionLastActivity.delete(key)
    }
  }

  log.debug(`Cleared all cleanup tracking for instance ${instanceId}`)
}
