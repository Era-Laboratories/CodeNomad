import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs"
import { execSync } from "child_process"
import path from "path"
import os from "os"
import { Logger } from "../logger"

/**
 * Kill a process and all its children (process tree)
 */
function killProcessTree(pid: number, signal: NodeJS.Signals = "SIGTERM", logger?: Logger): void {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" })
    } else {
      // Kill children first
      try {
        const children = execSync(`pgrep -P ${pid}`, { encoding: "utf-8" }).trim().split("\n").filter(Boolean)
        for (const childPid of children) {
          const childPidNum = parseInt(childPid, 10)
          if (!isNaN(childPidNum)) {
            try {
              process.kill(childPidNum, signal)
            } catch {
              // Child may have already exited
            }
          }
        }
      } catch {
        // No children or pgrep failed
      }
      process.kill(pid, signal)
    }
  } catch {
    // Process may have already exited
  }
}

const PID_REGISTRY_DIR = path.join(os.homedir(), ".config", "era-code")
const PID_REGISTRY_PATH = path.join(PID_REGISTRY_DIR, "workspace-pids.json")

export interface WorkspacePidEntry {
  pid: number
  folder: string
  startedAt: string
}

interface PidRegistry {
  workspaces: Record<string, WorkspacePidEntry>
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readRegistry(): PidRegistry {
  try {
    if (!existsSync(PID_REGISTRY_PATH)) {
      return { workspaces: {} }
    }
    const content = readFileSync(PID_REGISTRY_PATH, "utf-8")
    return JSON.parse(content) as PidRegistry
  } catch {
    return { workspaces: {} }
  }
}

function writeRegistry(registry: PidRegistry): void {
  try {
    mkdirSync(PID_REGISTRY_DIR, { recursive: true })
    writeFileSync(PID_REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8")
  } catch (error) {
    // Silently fail - not critical
  }
}

/**
 * Register a workspace process in the PID registry
 */
export function registerWorkspacePid(workspaceId: string, pid: number, folder: string, logger?: Logger): void {
  const registry = readRegistry()
  registry.workspaces[workspaceId] = {
    pid,
    folder,
    startedAt: new Date().toISOString(),
  }
  writeRegistry(registry)
  logger?.debug({ workspaceId, pid, folder }, "Registered workspace PID")
}

/**
 * Unregister a workspace process from the PID registry
 */
export function unregisterWorkspacePid(workspaceId: string, logger?: Logger): void {
  const registry = readRegistry()
  if (registry.workspaces[workspaceId]) {
    delete registry.workspaces[workspaceId]
    writeRegistry(registry)
    logger?.debug({ workspaceId }, "Unregistered workspace PID")
  }
}

/**
 * Kill a single process with verification
 * Returns true if process was killed successfully
 */
async function killProcessWithVerification(
  pid: number,
  workspaceId: string,
  logger?: Logger
): Promise<boolean> {
  if (!processExists(pid)) {
    logger?.debug({ workspaceId, pid }, "Process already dead")
    return true
  }

  // Phase 1: SIGTERM
  logger?.info({ workspaceId, pid }, "Sending SIGTERM to orphaned process")
  killProcessTree(pid, "SIGTERM", logger)

  // Wait up to 3 seconds for graceful shutdown
  for (let i = 0; i < 6; i++) {
    await sleep(500)
    if (!processExists(pid)) {
      logger?.info({ workspaceId, pid }, "Orphaned process stopped gracefully")
      return true
    }
  }

  // Phase 2: SIGKILL
  logger?.warn({ workspaceId, pid }, "Orphan didn't respond to SIGTERM, sending SIGKILL")
  killProcessTree(pid, "SIGKILL", logger)

  // Wait up to 2 more seconds
  for (let i = 0; i < 4; i++) {
    await sleep(500)
    if (!processExists(pid)) {
      logger?.info({ workspaceId, pid }, "Orphaned process killed with SIGKILL")
      return true
    }
  }

  // Final check
  const stillRunning = processExists(pid)
  if (stillRunning) {
    logger?.error({ workspaceId, pid }, "CRITICAL: Orphaned process survived SIGKILL")
  }
  return !stillRunning
}

/**
 * Clean up any orphaned workspace processes from a previous crash
 * Call this on server startup before launching new workspaces
 * Now properly awaits kill completion before clearing registry
 *
 * @param logger - Optional logger
 * @param activeWorkspaceIds - Set of workspace IDs that are actively managed (should NOT be killed)
 */
export async function cleanupOrphanedWorkspaces(
  logger?: Logger,
  activeWorkspaceIds?: Set<string>
): Promise<{
  cleaned: number
  failed: number
  failedPids: number[]
}> {
  const registry = readRegistry()
  const entries = Object.entries(registry.workspaces)

  if (entries.length === 0) {
    return { cleaned: 0, failed: 0, failedPids: [] }
  }

  logger?.info({ count: entries.length }, "Checking for orphaned workspace processes")

  let cleaned = 0
  let failed = 0
  const failedPids: number[] = []
  const cleanedIds: string[] = []

  for (const [workspaceId, entry] of entries) {
    // Skip workspaces that are actively managed
    if (activeWorkspaceIds?.has(workspaceId)) {
      logger?.debug({ workspaceId, pid: entry.pid }, "Skipping active workspace (not orphaned)")
      continue
    }

    if (!processExists(entry.pid)) {
      logger?.debug({ workspaceId, pid: entry.pid }, "Orphaned workspace process no longer exists")
      cleanedIds.push(workspaceId)
      cleaned++
      continue
    }

    logger?.info(
      { workspaceId, pid: entry.pid, folder: entry.folder, startedAt: entry.startedAt },
      "Found orphaned workspace process, killing it"
    )

    const killed = await killProcessWithVerification(entry.pid, workspaceId, logger)
    cleanedIds.push(workspaceId)

    if (killed) {
      cleaned++
    } else {
      failed++
      failedPids.push(entry.pid)
    }
  }

  // Only clear registry entries that were processed
  // (in case new entries were added during cleanup)
  const updatedRegistry = readRegistry()
  for (const id of cleanedIds) {
    delete updatedRegistry.workspaces[id]
  }
  writeRegistry(updatedRegistry)

  logger?.info({ cleaned, failed, failedPids }, "Orphaned workspace cleanup complete")
  return { cleaned, failed, failedPids }
}

/**
 * Get all descendant PIDs of a process (children, grandchildren, etc.)
 */
function getDescendantPids(pid: number): number[] {
  const descendants: number[] = []
  try {
    if (process.platform !== "win32") {
      // Get direct children
      const childOutput = execSync(`pgrep -P ${pid}`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      })
      const children = childOutput
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((p) => parseInt(p, 10))
        .filter((p) => !isNaN(p))

      for (const childPid of children) {
        descendants.push(childPid)
        // Recursively get grandchildren
        descendants.push(...getDescendantPids(childPid))
      }
    }
  } catch {
    // No children or pgrep failed
  }
  return descendants
}

/**
 * Scan for unregistered orphan processes (processes running but not in registry)
 * This catches processes that were spawned but never registered
 *
 * @param logger - Optional logger
 * @param activeWorkspaceIds - Set of active workspace IDs (their PIDs should be excluded)
 */
export async function scanForUnregisteredOrphans(
  logger?: Logger,
  activeWorkspaceIds?: Set<string>
): Promise<{
  found: number
  killed: number
  pids: number[]
}> {
  const registry = readRegistry()

  // Get PIDs that are registered (both active and orphaned)
  const registeredPids = new Set(Object.values(registry.workspaces).map((w) => w.pid))

  // Get PIDs of active workspaces AND their descendants (children, grandchildren)
  // These should NEVER be killed
  const protectedPids = new Set<number>()
  if (activeWorkspaceIds) {
    for (const [workspaceId, entry] of Object.entries(registry.workspaces)) {
      if (activeWorkspaceIds.has(workspaceId)) {
        // Add the registered PID
        protectedPids.add(entry.pid)
        // Add all descendant PIDs (children spawned by era-code/opencode)
        const descendants = getDescendantPids(entry.pid)
        for (const desc of descendants) {
          protectedPids.add(desc)
        }
      }
    }
  }

  // Find all opencode processes
  let allOpencodePids: number[] = []

  try {
    if (process.platform === "win32") {
      // Windows: use tasklist
      const output = execSync('tasklist /FI "IMAGENAME eq opencode*" /FO CSV /NH', {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      })
      allOpencodePids = output
        .split("\n")
        .filter((line) => line.includes("opencode"))
        .map((line) => {
          const match = line.match(/"opencode[^"]*","(\d+)"/)
          return match ? parseInt(match[1], 10) : NaN
        })
        .filter((pid) => !isNaN(pid))
    } else {
      // Unix: use pgrep
      const output = execSync("pgrep -f 'opencode'", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      })
      allOpencodePids = output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((pid) => parseInt(pid, 10))
        .filter((pid) => !isNaN(pid))
    }
  } catch {
    // pgrep returns exit code 1 if no processes found
    return { found: 0, killed: 0, pids: [] }
  }

  // Filter to unregistered processes that are NOT protected
  // (processes not in registry AND not a descendant of active workspaces)
  const unregisteredPids = allOpencodePids.filter(
    (pid) => !registeredPids.has(pid) && !protectedPids.has(pid)
  )

  if (unregisteredPids.length === 0) {
    return { found: 0, killed: 0, pids: [] }
  }

  logger?.warn(
    { count: unregisteredPids.length, pids: unregisteredPids },
    "Found unregistered opencode processes"
  )

  let killed = 0
  for (const pid of unregisteredPids) {
    const success = await killProcessWithVerification(pid, `unregistered-${pid}`, logger)
    if (success) {
      killed++
    }
  }

  return { found: unregisteredPids.length, killed, pids: unregisteredPids }
}

/**
 * Get all registered workspace PIDs (for debugging/monitoring)
 */
export function getRegisteredWorkspaces(): Record<string, WorkspacePidEntry> {
  return readRegistry().workspaces
}

/**
 * Get all running opencode processes (registered and unregistered)
 */
export function getAllRunningProcesses(logger?: Logger): {
  registered: Array<{ workspaceId: string; entry: WorkspacePidEntry; running: boolean }>
  unregistered: number[]
} {
  const registry = readRegistry()
  const registeredPids = new Set(Object.values(registry.workspaces).map((w) => w.pid))

  // Check registered processes
  const registered = Object.entries(registry.workspaces).map(([workspaceId, entry]) => ({
    workspaceId,
    entry,
    running: processExists(entry.pid),
  }))

  // Find unregistered opencode processes
  let allOpencodePids: number[] = []
  try {
    if (process.platform !== "win32") {
      const output = execSync("pgrep -f 'opencode'", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "ignore"],
      })
      allOpencodePids = output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((pid) => parseInt(pid, 10))
        .filter((pid) => !isNaN(pid))
    }
  } catch {
    // No processes found
  }

  const unregistered = allOpencodePids.filter((pid) => !registeredPids.has(pid))

  return { registered, unregistered }
}

/**
 * Clear the entire PID registry (for testing or manual cleanup)
 */
export function clearPidRegistry(logger?: Logger): void {
  try {
    if (existsSync(PID_REGISTRY_PATH)) {
      unlinkSync(PID_REGISTRY_PATH)
      logger?.debug("Cleared workspace PID registry")
    }
  } catch (error) {
    logger?.warn({ error }, "Failed to clear workspace PID registry")
  }
}

// Periodic orphan scanner
let orphanScanInterval: NodeJS.Timeout | null = null
const ORPHAN_SCAN_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// Function to get active workspace IDs from the manager
let getActiveWorkspaceIdsFn: (() => Set<string>) | null = null

/**
 * Start periodic scanning for orphaned processes
 *
 * @param logger - Optional logger
 * @param getActiveWorkspaceIds - Function that returns the set of currently active workspace IDs
 */
export function startOrphanScanner(
  logger?: Logger,
  getActiveWorkspaceIds?: () => Set<string>
): void {
  if (orphanScanInterval) {
    return // Already running
  }

  // Store the function for use in interval
  getActiveWorkspaceIdsFn = getActiveWorkspaceIds ?? null

  logger?.info({ intervalMs: ORPHAN_SCAN_INTERVAL_MS }, "Starting periodic orphan scanner")

  orphanScanInterval = setInterval(async () => {
    try {
      // Get currently active workspace IDs to exclude from cleanup
      const activeIds = getActiveWorkspaceIdsFn?.() ?? new Set<string>()

      // Check registered orphans (skip active workspaces)
      const registryResult = await cleanupOrphanedWorkspaces(logger, activeIds)
      if (registryResult.cleaned > 0 || registryResult.failed > 0) {
        logger?.info(registryResult, "Periodic orphan scan - registry cleanup")
      }

      // Check unregistered orphans (these are always safe to kill since they're not in any registry)
      const unregisteredResult = await scanForUnregisteredOrphans(logger, activeIds)
      if (unregisteredResult.found > 0) {
        logger?.info(unregisteredResult, "Periodic orphan scan - unregistered cleanup")
      }
    } catch (error) {
      logger?.error({ error }, "Error during periodic orphan scan")
    }
  }, ORPHAN_SCAN_INTERVAL_MS)
}

/**
 * Stop the periodic orphan scanner
 */
export function stopOrphanScanner(logger?: Logger): void {
  if (orphanScanInterval) {
    clearInterval(orphanScanInterval)
    orphanScanInterval = null
    logger?.info("Stopped periodic orphan scanner")
  }
}
