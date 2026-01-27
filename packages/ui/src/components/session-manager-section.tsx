import { Component, For, Show, createSignal, onMount } from "solid-js"
import { Trash2, RefreshCw, CheckSquare, Square, FolderOpen } from "lucide-solid"
import {
  getAllSessions,
  getAllProjects,
  getSelectedSessionIds,
  isSessionManagerLoading,
  getProjectFilter,
  getSearchFilter,
  setProjectFilter,
  setSearchFilter,
  loadAllSessions,
  deleteSelectedSessions,
  toggleSessionSelection,
  selectAllFiltered,
  clearSelection,
  getFilteredSessions,
} from "../stores/session-manager"
import "../styles/panels/session-manager.css"

const SessionManagerSection: Component = () => {
  const [deleting, setDeleting] = createSignal(false)

  onMount(() => {
    loadAllSessions()
  })

  const filteredSessions = () => getFilteredSessions()
  const selected = () => getSelectedSessionIds()
  const loading = () => isSessionManagerLoading()
  const projects = () => getAllProjects()
  const sessions = () => getAllSessions()

  const allSelected = () => {
    const filtered = filteredSessions()
    const sel = selected()
    return filtered.length > 0 && filtered.every((s) => sel.has(s.id))
  }

  async function handleDelete() {
    const sel = selected()
    if (sel.size === 0) return
    if (!confirm(`Delete ${sel.size} session(s)? This cannot be undone.`)) return
    setDeleting(true)
    await deleteSelectedSessions()
    setDeleting(false)
  }

  function formatAge(timestamp: number): string {
    const ms = Date.now() - timestamp
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  function getProjectName(directory: string): string {
    return directory.split("/").pop() || directory
  }

  return (
    <div class="session-manager">
      <div class="session-manager-header">
        <h2 class="full-settings-section-title">All Sessions</h2>
        <p class="full-settings-section-subtitle">
          Manage OpenCode sessions across all projects.
        </p>
      </div>

      <div class="session-manager-toolbar">
        <div class="session-manager-filters">
          <select
            class="full-settings-select"
            value={getProjectFilter() || ""}
            onChange={(e) => setProjectFilter(e.currentTarget.value || null)}
          >
            <option value="">All Projects ({sessions().length})</option>
            <For each={projects()}>
              {(project) => (
                <option value={project.id}>
                  {getProjectName(project.directory)} ({project.sessionCount})
                </option>
              )}
            </For>
          </select>
          <input
            type="text"
            class="session-manager-search"
            placeholder="Search sessions..."
            value={getSearchFilter()}
            onInput={(e) => setSearchFilter(e.currentTarget.value)}
          />
        </div>
        <div class="session-manager-actions">
          <button
            type="button"
            class="session-manager-btn"
            onClick={() => loadAllSessions()}
            disabled={loading()}
          >
            <RefreshCw class={`session-manager-icon ${loading() ? "spinning" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            class="session-manager-btn danger"
            onClick={handleDelete}
            disabled={selected().size === 0 || deleting()}
          >
            <Trash2 class="session-manager-icon" />
            Delete ({selected().size})
          </button>
        </div>
      </div>

      <div class="session-table">
        <div class="session-table-header">
          <div class="session-table-cell checkbox">
            <button
              type="button"
              class="session-checkbox-btn"
              onClick={() => (allSelected() ? clearSelection() : selectAllFiltered())}
            >
              <Show when={allSelected()} fallback={<Square size={16} />}>
                <CheckSquare size={16} />
              </Show>
            </button>
          </div>
          <div class="session-table-cell title">Session</div>
          <div class="session-table-cell project">Project</div>
          <div class="session-table-cell changes">Changes</div>
          <div class="session-table-cell age">Updated</div>
        </div>
        <div class="session-table-body">
          <Show when={loading()}>
            <div class="session-table-loading">Loading sessions...</div>
          </Show>
          <Show when={!loading() && filteredSessions().length === 0}>
            <div class="session-table-empty">No sessions found</div>
          </Show>
          <For each={filteredSessions()}>
            {(session) => (
              <div
                class={`session-table-row ${selected().has(session.id) ? "selected" : ""}`}
              >
                <div class="session-table-cell checkbox">
                  <button
                    type="button"
                    class="session-checkbox-btn"
                    onClick={() => toggleSessionSelection(session.id)}
                  >
                    <Show
                      when={selected().has(session.id)}
                      fallback={<Square size={16} />}
                    >
                      <CheckSquare size={16} />
                    </Show>
                  </button>
                </div>
                <div class="session-table-cell title">
                  <span class="session-title">
                    {session.title || "Untitled Session"}
                  </span>
                  <span class="session-id">{session.id}</span>
                </div>
                <div class="session-table-cell project">
                  <FolderOpen size={14} />
                  <span>{getProjectName(session.directory)}</span>
                </div>
                <div class="session-table-cell changes">
                  <Show
                    when={session.summary.files > 0}
                    fallback={<span class="no-changes">No changes</span>}
                  >
                    <span class="additions">+{session.summary.additions}</span>
                    <span class="deletions">-{session.summary.deletions}</span>
                    <span class="files">{session.summary.files} files</span>
                  </Show>
                </div>
                <div class="session-table-cell age">{formatAge(session.updatedAt)}</div>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="session-manager-footer">
        <span>{filteredSessions().length} sessions</span>
        <Show when={selected().size > 0}>
          <span>{selected().size} selected</span>
        </Show>
      </div>
    </div>
  )
}

export default SessionManagerSection
