import { Component, Show, For, createSignal, createMemo, createEffect } from "solid-js"
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Edit3,
  PenLine,
  Trash2,
  Plus,
  Eye,
  GitBranch,
  GitCommit,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FolderGit,
} from "lucide-solid"
import {
  getFilesTouched,
  getRecentActions,
  getGitStatus,
  type FileOperation,
  type RecentAction,
  type GitStatus,
  type FileOperationType,
} from "../stores/workspace-state"

interface WorkspacePanelProps {
  instanceId: string
  instanceFolder?: string
  onFileClick?: (path: string) => void
}

const WorkspacePanel: Component<WorkspacePanelProps> = (props) => {
  const [filesTouchedExpanded, setFilesTouchedExpanded] = createSignal(true)
  const [recentActionsExpanded, setRecentActionsExpanded] = createSignal(true)
  const [gitStatusExpanded, setGitStatusExpanded] = createSignal(true)

  const filesTouched = createMemo(() => getFilesTouched(props.instanceId))
  const recentActions = createMemo(() => getRecentActions(props.instanceId))
  const gitStatus = createMemo(() => getGitStatus(props.instanceId))

  const getOperationIcon = (op: FileOperationType) => {
    switch (op) {
      case "read":
        return <Eye class="w-3 h-3" />
      case "edit":
        return <Edit3 class="w-3 h-3" />
      case "write":
        return <PenLine class="w-3 h-3" />
      case "create":
        return <Plus class="w-3 h-3" />
      case "delete":
        return <Trash2 class="w-3 h-3" />
      default:
        return <FileText class="w-3 h-3" />
    }
  }

  const getOperationClass = (op: FileOperationType) => {
    switch (op) {
      case "read":
        return "workspace-op-read"
      case "edit":
        return "workspace-op-edit"
      case "write":
        return "workspace-op-write"
      case "create":
        return "workspace-op-create"
      case "delete":
        return "workspace-op-delete"
      default:
        return ""
    }
  }

  const getStatusIcon = (status: RecentAction["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 class="w-3 h-3 animate-spin" />
      case "complete":
        return <CheckCircle class="w-3 h-3" />
      case "error":
        return <XCircle class="w-3 h-3" />
    }
  }

  const getStatusClass = (status: RecentAction["status"]) => {
    switch (status) {
      case "running":
        return "workspace-action-running"
      case "complete":
        return "workspace-action-complete"
      case "error":
        return "workspace-action-error"
    }
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return "just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getRelativePath = (fullPath: string) => {
    if (!props.instanceFolder) return fullPath
    const folder = props.instanceFolder.replace(/\\/g, "/")
    const path = fullPath.replace(/\\/g, "/")
    if (path.startsWith(folder)) {
      return path.slice(folder.length).replace(/^\//, "")
    }
    return path
  }

  const getFileName = (path: string) => {
    const parts = path.replace(/\\/g, "/").split("/")
    return parts[parts.length - 1] || path
  }

  return (
    <div class="workspace-panel">
      {/* Files Touched Section */}
      <section class="workspace-section">
        <button
          type="button"
          class="workspace-section-header"
          onClick={() => setFilesTouchedExpanded((prev) => !prev)}
          aria-expanded={filesTouchedExpanded()}
        >
          <span class="workspace-section-title">
            {filesTouchedExpanded() ? (
              <ChevronDown class="w-4 h-4" />
            ) : (
              <ChevronRight class="w-4 h-4" />
            )}
            <FileText class="w-4 h-4" />
            Files Touched
          </span>
          <span class="workspace-section-count">{filesTouched().length}</span>
        </button>

        <Show when={filesTouchedExpanded()}>
          <div class="workspace-section-content">
            <Show
              when={filesTouched().length > 0}
              fallback={
                <p class="workspace-empty-message">No files touched yet</p>
              }
            >
              <ul class="workspace-file-list">
                <For each={filesTouched().slice(0, 20)}>
                  {(file) => (
                    <li class="workspace-file-item">
                      <button
                        type="button"
                        class="workspace-file-button"
                        onClick={() => props.onFileClick?.(file.path)}
                        title={file.path}
                      >
                        <span class={`workspace-op-badge ${getOperationClass(file.operation)}`}>
                          {getOperationIcon(file.operation)}
                        </span>
                        <span class="workspace-file-name">
                          {getFileName(file.path)}
                        </span>
                        <span class="workspace-file-path" title={file.path}>
                          {getRelativePath(file.path)}
                        </span>
                      </button>
                    </li>
                  )}
                </For>
              </ul>
              <Show when={filesTouched().length > 20}>
                <p class="workspace-more-indicator">
                  +{filesTouched().length - 20} more files
                </p>
              </Show>
            </Show>
          </div>
        </Show>
      </section>

      {/* Recent Actions Section */}
      <section class="workspace-section">
        <button
          type="button"
          class="workspace-section-header"
          onClick={() => setRecentActionsExpanded((prev) => !prev)}
          aria-expanded={recentActionsExpanded()}
        >
          <span class="workspace-section-title">
            {recentActionsExpanded() ? (
              <ChevronDown class="w-4 h-4" />
            ) : (
              <ChevronRight class="w-4 h-4" />
            )}
            <Clock class="w-4 h-4" />
            Recent Actions
          </span>
          <span class="workspace-section-count">{recentActions().length}</span>
        </button>

        <Show when={recentActionsExpanded()}>
          <div class="workspace-section-content">
            <Show
              when={recentActions().length > 0}
              fallback={
                <p class="workspace-empty-message">No recent actions</p>
              }
            >
              <ul class="workspace-action-list">
                <For each={recentActions().slice(0, 15)}>
                  {(action) => (
                    <li class={`workspace-action-item ${getStatusClass(action.status)}`}>
                      <span class="workspace-action-status">
                        {getStatusIcon(action.status)}
                      </span>
                      <span class="workspace-action-summary" title={action.summary}>
                        {action.summary}
                      </span>
                      <span class="workspace-action-time">
                        {formatRelativeTime(action.timestamp)}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </Show>
      </section>

      {/* Git Status Section */}
      <section class="workspace-section">
        <button
          type="button"
          class="workspace-section-header"
          onClick={() => setGitStatusExpanded((prev) => !prev)}
          aria-expanded={gitStatusExpanded()}
        >
          <span class="workspace-section-title">
            {gitStatusExpanded() ? (
              <ChevronDown class="w-4 h-4" />
            ) : (
              <ChevronRight class="w-4 h-4" />
            )}
            <FolderGit class="w-4 h-4" />
            Git Status
          </span>
        </button>

        <Show when={gitStatusExpanded()}>
          <div class="workspace-section-content">
            <Show
              when={gitStatus()}
              fallback={
                <p class="workspace-empty-message">Git status not available</p>
              }
            >
              {(status) => (
                <div class="workspace-git-status">
                  {/* Branch info */}
                  <div class="workspace-git-branch">
                    <GitBranch class="w-4 h-4" />
                    <span class="workspace-git-branch-name">{status().branch}</span>
                    <Show when={status().ahead > 0 || status().behind > 0}>
                      <span class="workspace-git-sync">
                        <Show when={status().ahead > 0}>
                          <span class="workspace-git-ahead">+{status().ahead}</span>
                        </Show>
                        <Show when={status().behind > 0}>
                          <span class="workspace-git-behind">-{status().behind}</span>
                        </Show>
                      </span>
                    </Show>
                  </div>

                  {/* Staged changes */}
                  <Show when={status().staged.length > 0}>
                    <div class="workspace-git-section">
                      <span class="workspace-git-label workspace-git-staged">
                        Staged ({status().staged.length})
                      </span>
                      <ul class="workspace-git-files">
                        <For each={status().staged.slice(0, 5)}>
                          {(file) => (
                            <li class="workspace-git-file" title={file}>
                              {getFileName(file)}
                            </li>
                          )}
                        </For>
                        <Show when={status().staged.length > 5}>
                          <li class="workspace-git-more">
                            +{status().staged.length - 5} more
                          </li>
                        </Show>
                      </ul>
                    </div>
                  </Show>

                  {/* Modified changes */}
                  <Show when={status().modified.length > 0}>
                    <div class="workspace-git-section">
                      <span class="workspace-git-label workspace-git-modified">
                        Modified ({status().modified.length})
                      </span>
                      <ul class="workspace-git-files">
                        <For each={status().modified.slice(0, 5)}>
                          {(file) => (
                            <li class="workspace-git-file" title={file}>
                              {getFileName(file)}
                            </li>
                          )}
                        </For>
                        <Show when={status().modified.length > 5}>
                          <li class="workspace-git-more">
                            +{status().modified.length - 5} more
                          </li>
                        </Show>
                      </ul>
                    </div>
                  </Show>

                  {/* Untracked files */}
                  <Show when={status().untracked.length > 0}>
                    <div class="workspace-git-section">
                      <span class="workspace-git-label workspace-git-untracked">
                        Untracked ({status().untracked.length})
                      </span>
                      <ul class="workspace-git-files">
                        <For each={status().untracked.slice(0, 5)}>
                          {(file) => (
                            <li class="workspace-git-file" title={file}>
                              {getFileName(file)}
                            </li>
                          )}
                        </For>
                        <Show when={status().untracked.length > 5}>
                          <li class="workspace-git-more">
                            +{status().untracked.length - 5} more
                          </li>
                        </Show>
                      </ul>
                    </div>
                  </Show>

                  {/* No changes */}
                  <Show when={status().staged.length === 0 && status().modified.length === 0 && status().untracked.length === 0}>
                    <p class="workspace-git-clean">Working tree clean</p>
                  </Show>
                </div>
              )}
            </Show>
          </div>
        </Show>
      </section>
    </div>
  )
}

export default WorkspacePanel
