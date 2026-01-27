import { Component, createSignal, createResource, For, Show } from "solid-js"
import { AlertTriangle, Trash2, RefreshCw, Skull, Activity, Clock, Folder } from "lucide-solid"
import { serverApi, type ProcessInfo, type CleanupResult } from "../lib/api-client"
import { getLogger } from "../lib/logger"
import "../styles/components/process-manager-panel.css"

const log = getLogger("process-manager")

const ProcessManagerPanel: Component = () => {
  const [isLoading, setIsLoading] = createSignal(false)
  const [cleanupResult, setCleanupResult] = createSignal<CleanupResult | null>(null)
  const [error, setError] = createSignal<string | null>(null)

  const [processes, { refetch }] = createResource(async () => {
    try {
      return await serverApi.fetchProcesses()
    } catch (err) {
      log.error("Failed to fetch processes", err)
      setError(err instanceof Error ? err.message : "Failed to fetch processes")
      return null
    }
  })

  const handleCleanupAll = async () => {
    setIsLoading(true)
    setError(null)
    setCleanupResult(null)
    try {
      const result = await serverApi.killAllOrphans()
      setCleanupResult(result)
      log.info("Cleanup completed", result)
      // Refresh the process list
      await refetch()
    } catch (err) {
      log.error("Failed to cleanup orphans", err)
      setError(err instanceof Error ? err.message : "Failed to cleanup")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKillProcess = async (pid: number) => {
    setIsLoading(true)
    setError(null)
    try {
      await serverApi.killProcess(pid)
      log.info("Killed process", { pid })
      // Refresh the process list
      await refetch()
    } catch (err) {
      log.error("Failed to kill process", { pid, err })
      setError(err instanceof Error ? err.message : `Failed to kill process ${pid}`)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString()
    } catch {
      return isoString
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

  return (
    <div class="process-manager-panel">
      <div class="process-manager-header">
        <div class="process-manager-header-left">
          <Activity class="w-5 h-5" />
          <h2>Process Manager</h2>
        </div>
        <div class="process-manager-header-actions">
          <button
            type="button"
            class="process-manager-btn process-manager-btn-secondary"
            onClick={() => refetch()}
            disabled={isLoading() || processes.loading}
          >
            <RefreshCw class={`w-4 h-4 ${processes.loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            class="process-manager-btn process-manager-btn-danger"
            onClick={handleCleanupAll}
            disabled={isLoading()}
          >
            <Skull class="w-4 h-4" />
            Kill All Orphans
          </button>
        </div>
      </div>

      <p class="process-manager-description">
        View and manage running opencode processes. Orphaned processes are automatically cleaned up
        every 5 minutes, but you can manually kill them here if needed.
      </p>

      <Show when={error()}>
        <div class="process-manager-error">
          <AlertTriangle class="w-4 h-4" />
          <span>{error()}</span>
        </div>
      </Show>

      <Show when={cleanupResult()}>
        {(result) => (
          <div class="process-manager-result">
            <div class="process-manager-result-title">Cleanup Complete</div>
            <div class="process-manager-result-stats">
              <div>
                <strong>Registry:</strong> {result().registeredCleanup.cleaned} cleaned
                {result().registeredCleanup.failed > 0 && (
                  <span class="process-manager-result-failed">
                    , {result().registeredCleanup.failed} failed
                  </span>
                )}
              </div>
              <div>
                <strong>Unregistered:</strong> {result().unregisteredCleanup.found} found,{" "}
                {result().unregisteredCleanup.killed} killed
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={processes.loading}>
        <div class="process-manager-loading">
          <RefreshCw class="w-5 h-5 animate-spin" />
          <span>Loading processes...</span>
        </div>
      </Show>

      <Show when={processes()}>
        {(data) => (
          <>
            {/* Summary */}
            <div class="process-manager-summary">
              <div class="process-manager-summary-item">
                <span class="process-manager-summary-value">{data().summary.totalRegistered}</span>
                <span class="process-manager-summary-label">Registered</span>
              </div>
              <div class="process-manager-summary-item">
                <span class="process-manager-summary-value process-manager-summary-running">
                  {data().summary.runningRegistered}
                </span>
                <span class="process-manager-summary-label">Running</span>
              </div>
              <div class="process-manager-summary-item">
                <span class={`process-manager-summary-value ${data().summary.unregisteredOrphans > 0 ? "process-manager-summary-danger" : ""}`}>
                  {data().summary.unregisteredOrphans}
                </span>
                <span class="process-manager-summary-label">Orphaned</span>
              </div>
            </div>

            {/* Registered Processes */}
            <div class="process-manager-section">
              <h3 class="process-manager-section-title">Registered Processes</h3>
              <Show
                when={data().registered.length > 0}
                fallback={<div class="process-manager-empty">No registered processes</div>}
              >
                <div class="process-manager-list">
                  <For each={data().registered}>
                    {(proc) => (
                      <div
                        class={`process-manager-item ${proc.running ? "process-manager-item-running" : "process-manager-item-dead"}`}
                      >
                        <div class="process-manager-item-main">
                          <div class="process-manager-item-header">
                            <span class={`process-manager-status ${proc.running ? "process-manager-status-running" : "process-manager-status-dead"}`} />
                            <span class="process-manager-pid">PID {proc.entry.pid}</span>
                            <span class="process-manager-workspace-id">{proc.workspaceId}</span>
                          </div>
                          <div class="process-manager-item-details">
                            <div class="process-manager-detail">
                              <Folder class="w-3 h-3" />
                              <span class="process-manager-folder">{proc.entry.folder}</span>
                            </div>
                            <div class="process-manager-detail">
                              <Clock class="w-3 h-3" />
                              <span>Started: {formatDate(proc.entry.startedAt)}</span>
                              <span class="process-manager-uptime">({getUptime(proc.entry.startedAt)})</span>
                            </div>
                          </div>
                        </div>
                        <Show when={proc.running}>
                          <button
                            type="button"
                            class="process-manager-kill-btn"
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

            {/* Unregistered Orphans */}
            <Show when={data().unregistered.length > 0}>
              <div class="process-manager-section process-manager-section-warning">
                <h3 class="process-manager-section-title">
                  <AlertTriangle class="w-4 h-4" />
                  Unregistered Orphans
                </h3>
                <p class="process-manager-section-description">
                  These processes are running but not tracked in the registry. They may be leftovers
                  from crashed sessions.
                </p>
                <div class="process-manager-list">
                  <For each={data().unregistered}>
                    {(pid) => (
                      <div class="process-manager-item process-manager-item-orphan">
                        <div class="process-manager-item-main">
                          <div class="process-manager-item-header">
                            <span class="process-manager-status process-manager-status-orphan" />
                            <span class="process-manager-pid">PID {pid}</span>
                            <span class="process-manager-orphan-label">Untracked Orphan</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="process-manager-kill-btn"
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
          </>
        )}
      </Show>
    </div>
  )
}

export default ProcessManagerPanel
