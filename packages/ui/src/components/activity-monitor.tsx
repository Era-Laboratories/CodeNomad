import { Component, createSignal, createResource, For, Show, createMemo } from "solid-js"
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Skull,
  Activity,
  Clock,
  Folder,
  Package,
  Inbox,
} from "lucide-solid"
import {
  serverApi,
  type ProcessInfo,
  type SessionStatsResponse,
} from "../lib/api-client"
import { showToastNotification } from "../lib/notifications"
import { getLogger } from "../lib/logger"
import "../styles/components/activity-monitor.css"

const log = getLogger("activity-monitor")

interface ActivityData {
  processes: ProcessInfo
  sessionStats: SessionStatsResponse
}

const ActivityMonitor: Component = () => {
  const [isLoading, setIsLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const [data, { refetch }] = createResource<ActivityData | null>(async () => {
    try {
      const [processes, sessionStats] = await Promise.all([
        serverApi.fetchProcesses(),
        serverApi.fetchSessionStats(),
      ])
      return { processes, sessionStats }
    } catch (err) {
      log.error("Failed to fetch activity data", err)
      setError(err instanceof Error ? err.message : "Failed to fetch activity data")
      return null
    }
  })

  const sessionCountsByFolder = createMemo(() => {
    // We don't have per-folder session counts from the stats endpoint,
    // but the stats endpoint gives us total counts. For per-process session
    // counts we'd need the full sessions list. For now, we show total in summary.
    return new Map<string, number>()
  })

  const handleKillProcess = async (pid: number) => {
    setIsLoading(true)
    setError(null)
    try {
      await serverApi.killProcess(pid)
      log.info("Killed process", { pid })
      showToastNotification({
        message: `Killed process ${pid}`,
        variant: "success",
      })
      await refetch()
    } catch (err) {
      log.error("Failed to kill process", { pid, err })
      setError(err instanceof Error ? err.message : `Failed to kill process ${pid}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKillAllOrphans = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await serverApi.killAllOrphans()
      log.info("Kill all orphans completed", result)
      showToastNotification({
        message: `Killed ${result.unregisteredCleanup.killed} orphan process(es)`,
        variant: "success",
      })
      await refetch()
    } catch (err) {
      log.error("Failed to kill orphans", err)
      setError(err instanceof Error ? err.message : "Failed to kill orphans")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurgeStale = async () => {
    const stats = data()?.sessionStats
    if (!stats || stats.staleCount === 0) return
    if (!confirm(`Purge ${stats.staleCount} stale session(s) (not updated in 7+ days)? This cannot be undone.`)) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await serverApi.purgeStaleSession()
      log.info("Purged stale sessions", result)
      showToastNotification({
        message: `Deleted ${result.deleted} stale session(s)`,
        variant: "success",
      })
      await refetch()
    } catch (err) {
      log.error("Failed to purge stale sessions", err)
      setError(err instanceof Error ? err.message : "Failed to purge stale sessions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanBlank = async () => {
    const stats = data()?.sessionStats
    if (!stats || stats.blankCount === 0) return
    if (!confirm(`Delete ${stats.blankCount} blank session(s) with no changes? This cannot be undone.`)) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await serverApi.cleanBlankSessions()
      log.info("Cleaned blank sessions", result)
      showToastNotification({
        message: `Deleted ${result.deleted} blank session(s)`,
        variant: "success",
      })
      await refetch()
    } catch (err) {
      log.error("Failed to clean blank sessions", err)
      setError(err instanceof Error ? err.message : "Failed to clean blank sessions")
    } finally {
      setIsLoading(false)
    }
  }

  const getUptime = (startedAt: string): string => {
    try {
      const started = new Date(startedAt).getTime()
      const now = Date.now()
      const diffMs = now - started
      const diffMinutes = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 0) return `Up ${diffDays}d ${diffHours % 24}h`
      if (diffHours > 0) return `Up ${diffHours}h ${diffMinutes % 60}m`
      return `Up ${diffMinutes}m`
    } catch {
      return "unknown"
    }
  }

  const getFolderName = (folderPath: string): string => {
    return folderPath.split("/").pop() || folderPath
  }

  return (
    <div class="activity-monitor">
      {/* Header */}
      <div class="activity-monitor-header">
        <div class="activity-monitor-header-left">
          <Activity class="w-5 h-5" />
          <div>
            <h2>Activity Monitor</h2>
            <p class="activity-monitor-subtitle">
              Running processes, orphan detection, and session cleanup.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="activity-monitor-btn activity-monitor-btn-secondary"
          onClick={() => refetch()}
          disabled={isLoading() || data.loading}
        >
          <RefreshCw class={`w-4 h-4 ${data.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      <Show when={error()}>
        <div class="activity-monitor-error">
          <AlertTriangle class="w-4 h-4" />
          <span>{error()}</span>
        </div>
      </Show>

      {/* Loading */}
      <Show when={data.loading}>
        <div class="activity-monitor-loading">
          <RefreshCw class="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </Show>

      <Show when={data()}>
        {(activityData) => (
          <>
            {/* Summary Cards */}
            <div class="activity-monitor-summary">
              <div class="activity-monitor-card">
                <span class="activity-monitor-card-value">
                  {activityData().processes.summary.totalRegistered}
                </span>
                <span class="activity-monitor-card-label">INSTANCES</span>
              </div>
              <div class="activity-monitor-card">
                <span class="activity-monitor-card-value activity-monitor-card-success">
                  {activityData().processes.summary.runningRegistered}
                </span>
                <span class="activity-monitor-card-label">RUNNING</span>
              </div>
              <div class="activity-monitor-card">
                <span class={`activity-monitor-card-value ${activityData().processes.summary.unregisteredOrphans > 0 ? "activity-monitor-card-danger" : ""}`}>
                  {activityData().processes.summary.unregisteredOrphans}
                </span>
                <span class="activity-monitor-card-label">ORPHANS</span>
              </div>
              <div class="activity-monitor-card">
                <span class="activity-monitor-card-value">
                  {activityData().sessionStats.total}
                </span>
                <span class="activity-monitor-card-label">SESSIONS</span>
              </div>
            </div>

            {/* Active Instances */}
            <div class="activity-monitor-section">
              <h3 class="activity-monitor-section-title">ACTIVE INSTANCES</h3>
              <Show
                when={activityData().processes.registered.length > 0}
                fallback={<div class="activity-monitor-empty">No registered instances</div>}
              >
                <div class="activity-monitor-list">
                  <For each={activityData().processes.registered}>
                    {(proc) => (
                      <div
                        class={`activity-monitor-item ${proc.running ? "activity-monitor-item-running" : "activity-monitor-item-dead"}`}
                      >
                        <div class="activity-monitor-item-main">
                          <div class="activity-monitor-item-header">
                            <span class={`activity-monitor-status ${proc.running ? "activity-monitor-status-running" : "activity-monitor-status-dead"}`} />
                            <span class="activity-monitor-pid">PID {proc.entry.pid}</span>
                            <span class="activity-monitor-separator">&middot;</span>
                            <span class="activity-monitor-folder-name">{getFolderName(proc.entry.folder)}</span>
                          </div>
                          <div class="activity-monitor-item-details">
                            <div class="activity-monitor-detail">
                              <Folder class="w-3 h-3" />
                              <span class="activity-monitor-folder-path">{proc.entry.folder}</span>
                            </div>
                            <Show when={proc.running} fallback={
                              <span class="activity-monitor-stale-label">Stale entry</span>
                            }>
                              <div class="activity-monitor-detail">
                                <Clock class="w-3 h-3" />
                                <span>{getUptime(proc.entry.startedAt)}</span>
                              </div>
                            </Show>
                          </div>
                        </div>
                        <Show when={proc.running}>
                          <button
                            type="button"
                            class="activity-monitor-kill-btn"
                            onClick={() => handleKillProcess(proc.entry.pid)}
                            disabled={isLoading()}
                            title="Kill this process"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Orphaned Processes */}
            <Show when={activityData().processes.unregistered.length > 0}>
              <div class="activity-monitor-section activity-monitor-section-warning">
                <div class="activity-monitor-section-header">
                  <h3 class="activity-monitor-section-title">
                    <AlertTriangle class="w-4 h-4" />
                    ORPHANED PROCESSES
                  </h3>
                  <button
                    type="button"
                    class="activity-monitor-btn activity-monitor-btn-danger"
                    onClick={handleKillAllOrphans}
                    disabled={isLoading()}
                  >
                    <Skull class="w-4 h-4" />
                    Kill All Orphans
                  </button>
                </div>
                <div class="activity-monitor-list">
                  <For each={activityData().processes.unregistered}>
                    {(pid) => (
                      <div class="activity-monitor-item activity-monitor-item-orphan">
                        <div class="activity-monitor-item-main">
                          <div class="activity-monitor-item-header">
                            <span class="activity-monitor-status activity-monitor-status-orphan" />
                            <span class="activity-monitor-pid">PID {pid}</span>
                            <span class="activity-monitor-separator">&middot;</span>
                            <span class="activity-monitor-orphan-label">Untracked</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="activity-monitor-kill-btn"
                          onClick={() => handleKillProcess(pid)}
                          disabled={isLoading()}
                          title="Kill this orphan process"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* Session Cleanup */}
            <div class="activity-monitor-section">
              <h3 class="activity-monitor-section-title">SESSION CLEANUP</h3>
              <p class="activity-monitor-section-subtitle">
                {activityData().sessionStats.total} sessions across {activityData().sessionStats.projectCount} project(s)
              </p>

              <Show
                when={activityData().sessionStats.staleCount > 0 || activityData().sessionStats.blankCount > 0}
                fallback={
                  <div class="activity-monitor-empty activity-monitor-all-clean">
                    All clean — no stale or blank sessions found.
                  </div>
                }
              >
                <div class="activity-monitor-cleanup-cards">
                  <Show when={activityData().sessionStats.staleCount > 0}>
                    <div class="activity-monitor-cleanup-card">
                      <div class="activity-monitor-cleanup-card-header">
                        <Package class="w-4 h-4" />
                        <span class="activity-monitor-cleanup-card-count">
                          {activityData().sessionStats.staleCount} stale
                        </span>
                      </div>
                      <p class="activity-monitor-cleanup-card-desc">&gt;7 days idle</p>
                      <button
                        type="button"
                        class="activity-monitor-btn activity-monitor-btn-warning"
                        onClick={handlePurgeStale}
                        disabled={isLoading()}
                      >
                        Purge Stale
                      </button>
                    </div>
                  </Show>
                  <Show when={activityData().sessionStats.blankCount > 0}>
                    <div class="activity-monitor-cleanup-card">
                      <div class="activity-monitor-cleanup-card-header">
                        <Inbox class="w-4 h-4" />
                        <span class="activity-monitor-cleanup-card-count">
                          {activityData().sessionStats.blankCount} blank
                        </span>
                      </div>
                      <p class="activity-monitor-cleanup-card-desc">No changes</p>
                      <button
                        type="button"
                        class="activity-monitor-btn activity-monitor-btn-warning"
                        onClick={handleCleanBlank}
                        disabled={isLoading()}
                      >
                        Clean Blank
                      </button>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}

export default ActivityMonitor
