import { Component, createSignal, createResource, For, Show } from "solid-js"
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Skull,
  Clock,
  Package,
  Inbox,
  CheckCircle,
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
      setError(null)
      return { processes, sessionStats }
    } catch (err) {
      log.error("Failed to fetch activity data", err)
      setError(err instanceof Error ? err.message : "Failed to fetch activity data")
      return null
    }
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

      if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
      if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`
      return `${diffMinutes}m`
    } catch {
      return "unknown"
    }
  }

  const getFolderName = (folderPath: string): string => {
    return folderPath.split("/").pop() || folderPath
  }

  return (
    <div class="full-settings-section">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h2 class="full-settings-section-title">Activity Monitor</h2>
          <p class="full-settings-section-subtitle">Running processes, orphan detection, and session cleanup</p>
        </div>
        <button
          type="button"
          class="full-settings-btn full-settings-btn-secondary"
          onClick={() => refetch()}
          disabled={isLoading() || data.loading}
        >
          <RefreshCw class={`w-4 h-4 ${data.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      <Show when={error()}>
        <div class="activity-monitor-alert activity-monitor-alert-error">
          <AlertTriangle class="w-4 h-4 flex-shrink-0" />
          <span>{error()}</span>
        </div>
      </Show>

      {/* Loading */}
      <Show when={data.loading && !data()}>
        <div class="activity-monitor-loading">
          <RefreshCw class="w-5 h-5 animate-spin" />
          <span>Loading activity data...</span>
        </div>
      </Show>

      <Show when={data()}>
        {(activityData) => (
          <>
            {/* Summary stats */}
            <div class="full-settings-subsection">
              <h3 class="full-settings-subsection-title">Overview</h3>
              <div class="activity-monitor-stats">
                <div class="activity-monitor-stat">
                  <span class="activity-monitor-stat-value">
                    {activityData().processes.summary.totalRegistered}
                  </span>
                  <span class="activity-monitor-stat-label">Instances</span>
                </div>
                <div class="activity-monitor-stat">
                  <span class="activity-monitor-stat-value activity-monitor-stat-success">
                    {activityData().processes.summary.runningRegistered}
                  </span>
                  <span class="activity-monitor-stat-label">Running</span>
                </div>
                <div class="activity-monitor-stat">
                  <span class={`activity-monitor-stat-value ${activityData().processes.summary.unregisteredOrphans > 0 ? "activity-monitor-stat-danger" : ""}`}>
                    {activityData().processes.summary.unregisteredOrphans}
                  </span>
                  <span class="activity-monitor-stat-label">Orphans</span>
                </div>
                <div class="activity-monitor-stat">
                  <span class="activity-monitor-stat-value">
                    {activityData().sessionStats.total}
                  </span>
                  <span class="activity-monitor-stat-label">Sessions</span>
                </div>
              </div>
            </div>

            <div class="full-settings-section-divider" />

            {/* Active Instances */}
            <div class="full-settings-subsection">
              <h3 class="full-settings-subsection-title">Active Instances</h3>
              <Show
                when={activityData().processes.registered.length > 0}
                fallback={
                  <div class="activity-monitor-empty-state">
                    No registered instances
                  </div>
                }
              >
                <div class="full-settings-list">
                  <For each={activityData().processes.registered}>
                    {(proc) => (
                      <div class={`full-settings-list-item ${!proc.running ? "activity-monitor-item-stale" : ""}`}>
                        <div class={`activity-monitor-dot ${proc.running ? "activity-monitor-dot-running" : "activity-monitor-dot-dead"}`} />
                        <div class="full-settings-list-item-info">
                          <div class="full-settings-list-item-title">
                            {getFolderName(proc.entry.folder)}
                            <span class="activity-monitor-pid-badge">PID {proc.entry.pid}</span>
                          </div>
                          <div class="full-settings-list-item-subtitle">
                            <span class="activity-monitor-path">{proc.entry.folder}</span>
                            <Show when={proc.running} fallback={
                              <span class="activity-monitor-stale-text">Stale entry</span>
                            }>
                              <span class="activity-monitor-uptime">
                                <Clock class="w-3 h-3" />
                                {getUptime(proc.entry.startedAt)}
                              </span>
                            </Show>
                          </div>
                        </div>
                        <Show when={proc.running}>
                          <button
                            type="button"
                            class="full-settings-btn-ghost activity-monitor-kill-btn"
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
              <div class="full-settings-section-divider" />
              <div class="full-settings-subsection">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-base);">
                  <h3 style="font-size: var(--font-size-base); font-weight: var(--font-weight-medium); color: var(--status-error); margin: 0; display: flex; align-items: center; gap: 8px;">
                    <AlertTriangle class="w-4 h-4" />
                    Orphaned Processes
                  </h3>
                  <button
                    type="button"
                    class="full-settings-btn full-settings-btn-danger"
                    onClick={handleKillAllOrphans}
                    disabled={isLoading()}
                  >
                    <Skull class="w-4 h-4" />
                    Kill All
                  </button>
                </div>
                <div class="full-settings-list">
                  <For each={activityData().processes.unregistered}>
                    {(pid) => (
                      <div class="full-settings-list-item activity-monitor-item-orphan">
                        <div class="activity-monitor-dot activity-monitor-dot-orphan" />
                        <div class="full-settings-list-item-info">
                          <div class="full-settings-list-item-title">
                            PID {pid}
                            <span class="activity-monitor-orphan-badge">Untracked</span>
                          </div>
                          <div class="full-settings-list-item-subtitle">
                            Not associated with any registered workspace
                          </div>
                        </div>
                        <button
                          type="button"
                          class="full-settings-btn-ghost activity-monitor-kill-btn"
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

            <div class="full-settings-section-divider" />

            {/* Session Cleanup */}
            <div class="full-settings-subsection">
              <h3 class="full-settings-subsection-title">Session Cleanup</h3>
              <p class="activity-monitor-section-desc">
                {activityData().sessionStats.total} sessions across {activityData().sessionStats.projectCount} project(s)
              </p>

              <Show
                when={activityData().sessionStats.staleCount > 0 || activityData().sessionStats.blankCount > 0}
                fallback={
                  <div class="activity-monitor-all-clean">
                    <CheckCircle class="w-4 h-4" />
                    <span>All clean — no stale or blank sessions found.</span>
                  </div>
                }
              >
                <div class="activity-monitor-cleanup-actions">
                  <Show when={activityData().sessionStats.staleCount > 0}>
                    <div class="full-settings-toggle-row">
                      <div class="full-settings-toggle-info">
                        <div class="full-settings-toggle-title" style="display: flex; align-items: center; gap: 6px;">
                          <Package class="w-4 h-4" style="flex-shrink: 0;" />
                          {activityData().sessionStats.staleCount} stale session(s)
                        </div>
                        <div class="full-settings-toggle-description">Not updated in 7+ days</div>
                      </div>
                      <button
                        type="button"
                        class="full-settings-btn full-settings-btn-secondary"
                        onClick={handlePurgeStale}
                        disabled={isLoading()}
                      >
                        Purge
                      </button>
                    </div>
                  </Show>
                  <Show when={activityData().sessionStats.blankCount > 0}>
                    <div class="full-settings-toggle-row">
                      <div class="full-settings-toggle-info">
                        <div class="full-settings-toggle-title" style="display: flex; align-items: center; gap: 6px;">
                          <Inbox class="w-4 h-4" style="flex-shrink: 0;" />
                          {activityData().sessionStats.blankCount} blank session(s)
                        </div>
                        <div class="full-settings-toggle-description">Sessions with no changes</div>
                      </div>
                      <button
                        type="button"
                        class="full-settings-btn full-settings-btn-secondary"
                        onClick={handleCleanBlank}
                        disabled={isLoading()}
                      >
                        Clean
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
