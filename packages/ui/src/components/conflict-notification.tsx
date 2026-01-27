/**
 * Conflict Notification Component
 *
 * Displays a notification badge/banner when file conflicts are detected.
 * Shows conflict count and provides quick access to resolution UI.
 */

import { Show, For, createSignal, createEffect, onCleanup } from "solid-js"
import {
  activeConflicts,
  activeConflictCount,
  hasConflicts,
  selectConflict,
  resolveConflict,
  type FileConflictEvent,
} from "../stores/file-conflicts"
import "../styles/panels/file-conflicts.css"

interface ConflictNotificationProps {
  workspaceRoot: string
  sessionId: string
  onOpenResolutionPanel?: () => void
}

export function ConflictNotification(props: ConflictNotificationProps) {
  const [expanded, setExpanded] = createSignal(false)
  const [resolving, setResolving] = createSignal<string | null>(null)

  // Auto-expand when new conflicts appear
  let prevCount = 0
  createEffect(() => {
    const count = activeConflictCount()
    if (count > prevCount && count > 0) {
      setExpanded(true)
    }
    prevCount = count
  })

  const handleAutoMerge = async (conflict: FileConflictEvent) => {
    if (!conflict.mergeResult.canAutoMerge) return

    setResolving(conflict.conflictId)
    try {
      const result = await resolveConflict(
        conflict.conflictId,
        "auto-merged",
        props.sessionId,
        props.workspaceRoot
      )

      if (!result.success) {
        console.error("Auto-merge failed:", result.error)
      }
    } finally {
      setResolving(null)
    }
  }

  const handleOpenResolution = (conflictId: string) => {
    selectConflict(conflictId)
    props.onOpenResolutionPanel?.()
    setExpanded(false)
  }

  return (
    <Show when={hasConflicts()}>
      <div class="conflict-notification">
        <button
          class="conflict-notification-toggle"
          onClick={() => setExpanded(!expanded())}
          aria-expanded={expanded()}
          title={`${activeConflictCount()} file conflict${activeConflictCount() !== 1 ? "s" : ""}`}
        >
          <span class="conflict-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z" />
              <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path fill-rule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z" />
            </svg>
          </span>
          <span class="conflict-count">{activeConflictCount()}</span>
          <span class="conflict-label">
            Conflict{activeConflictCount() !== 1 ? "s" : ""}
          </span>
          <span class="expand-icon" classList={{ rotated: expanded() }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" stroke-width="1.5" fill="none" />
            </svg>
          </span>
        </button>

        <Show when={expanded()}>
          <div class="conflict-notification-dropdown">
            <div class="conflict-list-header">
              <span>File Conflicts</span>
              <button
                class="conflict-list-close"
                onClick={() => setExpanded(false)}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" />
                </svg>
              </button>
            </div>

            <div class="conflict-list">
              <For each={activeConflicts()}>
                {(conflict) => (
                  <div class="conflict-item" classList={{
                    "can-auto-merge": conflict.mergeResult.canAutoMerge,
                    "needs-manual": !conflict.mergeResult.canAutoMerge,
                    "is-binary": (conflict as any).isBinary,
                  }}>
                    <div class="conflict-item-header">
                      <span class="conflict-file-path" title={conflict.absolutePath}>
                        {conflict.filePath}
                      </span>
                      <span class="conflict-type-badge">
                        {conflict.conflictType === "concurrent-write"
                          ? "Concurrent"
                          : conflict.conflictType === "external-change"
                          ? "External"
                          : "Merge"}
                      </span>
                    </div>

                    <div class="conflict-item-details">
                      <span class="conflict-sessions">
                        {conflict.involvedSessions.length} session
                        {conflict.involvedSessions.length !== 1 ? "s" : ""}
                      </span>
                      <span class="conflict-time">
                        {formatTime(conflict.timestamp)}
                      </span>
                    </div>

                    <div class="conflict-item-actions">
                      <Show when={conflict.mergeResult.canAutoMerge && !(conflict as any).isBinary}>
                        <button
                          class="conflict-action-btn auto-merge"
                          onClick={() => handleAutoMerge(conflict)}
                          disabled={resolving() === conflict.conflictId}
                        >
                          {resolving() === conflict.conflictId ? "Merging..." : "Auto-merge"}
                        </button>
                      </Show>
                      <button
                        class="conflict-action-btn resolve"
                        onClick={() => handleOpenResolution(conflict.conflictId)}
                      >
                        {(conflict as any).isBinary ? "Choose Version" : "Resolve"}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={activeConflictCount() > 3}>
              <div class="conflict-list-footer">
                <button
                  class="view-all-btn"
                  onClick={props.onOpenResolutionPanel}
                >
                  View All Conflicts
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}

/**
 * Conflict Badge - Simple badge showing conflict count
 */
interface ConflictBadgeProps {
  sessionId?: string
  onClick?: () => void
}

export function ConflictBadge(props: ConflictBadgeProps) {
  const conflicts = () => {
    if (props.sessionId) {
      return activeConflicts().filter((c) =>
        c.involvedSessions.some((s) => s.sessionId === props.sessionId)
      )
    }
    return activeConflicts()
  }

  return (
    <Show when={conflicts().length > 0}>
      <button
        class="conflict-badge"
        onClick={props.onClick}
        title={`${conflicts().length} conflict${conflicts().length !== 1 ? "s" : ""}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z" />
          <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
        </svg>
        <span>{conflicts().length}</span>
      </button>
    </Show>
  )
}

/**
 * Conflict Banner - Full-width banner for prominent display
 */
interface ConflictBannerProps {
  workspaceRoot: string
  sessionId: string
  onResolve?: () => void
}

export function ConflictBanner(props: ConflictBannerProps) {
  const [dismissed, setDismissed] = createSignal(false)
  const [resolving, setResolving] = createSignal(false)

  // Reset dismissed state when new conflicts appear
  createEffect(() => {
    if (activeConflictCount() > 0) {
      setDismissed(false)
    }
  })

  const handleResolveAll = async () => {
    setResolving(true)
    try {
      const autoMergeable = activeConflicts().filter(
        (c) => c.mergeResult.canAutoMerge && !(c as any).isBinary
      )

      for (const conflict of autoMergeable) {
        await resolveConflict(
          conflict.conflictId,
          "auto-merged",
          props.sessionId,
          props.workspaceRoot
        )
      }

      // If there are still conflicts, open resolution panel
      if (activeConflictCount() > 0) {
        props.onResolve?.()
      }
    } finally {
      setResolving(false)
    }
  }

  return (
    <Show when={hasConflicts() && !dismissed()}>
      <div class="conflict-banner" role="alert">
        <div class="conflict-banner-content">
          <span class="conflict-banner-icon">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z" />
              <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
              <path fill-rule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z" />
            </svg>
          </span>
          <span class="conflict-banner-text">
            <strong>{activeConflictCount()}</strong> file conflict
            {activeConflictCount() !== 1 ? "s" : ""} detected
          </span>
        </div>

        <div class="conflict-banner-actions">
          <Show when={activeConflicts().some((c) => c.mergeResult.canAutoMerge)}>
            <button
              class="banner-btn auto-merge"
              onClick={handleResolveAll}
              disabled={resolving()}
            >
              {resolving() ? "Resolving..." : "Auto-merge All"}
            </button>
          </Show>
          <button class="banner-btn resolve" onClick={props.onResolve}>
            Resolve
          </button>
          <button
            class="banner-btn dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </Show>
  )
}

// Helper to format timestamp
function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return "just now"
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins}m ago`
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }

  return new Date(timestamp).toLocaleDateString()
}
