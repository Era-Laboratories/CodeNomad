import { createSignal, createMemo } from "solid-js"
import { ERA_CODE_API_BASE } from "../lib/api-client"

export interface ManagedSession {
  id: string
  projectId: string
  directory: string
  title: string
  createdAt: number
  updatedAt: number
  summary: { additions: number; deletions: number; files: number }
}

export interface ManagedProject {
  id: string
  directory: string
  sessionCount: number
}

interface SessionsListResponse {
  sessions: ManagedSession[]
  projects: ManagedProject[]
}

interface SessionDeleteResponse {
  success: boolean
  deleted: number
  errors?: string[]
}

// State signals
const [allSessions, setAllSessions] = createSignal<ManagedSession[]>([])
const [allProjects, setAllProjects] = createSignal<ManagedProject[]>([])
const [selectedSessionIds, setSelectedSessionIds] = createSignal<Set<string>>(new Set())
const [sessionManagerLoading, setSessionManagerLoading] = createSignal(false)
const [sessionManagerError, setSessionManagerError] = createSignal<string | null>(null)
const [projectFilter, setProjectFilter] = createSignal<string | null>(null)
const [searchFilter, setSearchFilter] = createSignal("")

// Export getters
export function getAllSessions(): ManagedSession[] {
  return allSessions()
}

export function getAllProjects(): ManagedProject[] {
  return allProjects()
}

export function getSelectedSessionIds(): Set<string> {
  return selectedSessionIds()
}

export function isSessionManagerLoading(): boolean {
  return sessionManagerLoading()
}

export function getSessionManagerError(): string | null {
  return sessionManagerError()
}

export function getProjectFilter(): string | null {
  return projectFilter()
}

export function getSearchFilter(): string {
  return searchFilter()
}

// Export setters
export { setProjectFilter, setSearchFilter }

// Computed/derived data
export function getFilteredSessions(): ManagedSession[] {
  let sessions = allSessions()

  const filter = projectFilter()
  if (filter) {
    sessions = sessions.filter((s) => s.projectId === filter)
  }

  const search = searchFilter().toLowerCase()
  if (search) {
    sessions = sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(search) ||
        s.directory.toLowerCase().includes(search)
    )
  }

  // Sort by most recently updated first
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
}

// Actions
export async function loadAllSessions(): Promise<void> {
  setSessionManagerLoading(true)
  setSessionManagerError(null)

  try {
    const url = ERA_CODE_API_BASE ? new URL("/api/sessions", ERA_CODE_API_BASE).toString() : "/api/sessions"
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to load sessions: ${response.statusText}`)
    }

    const data: SessionsListResponse = await response.json()
    setAllSessions(data.sessions)
    setAllProjects(data.projects)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setSessionManagerError(message)
  } finally {
    setSessionManagerLoading(false)
  }
}

export async function deleteSelectedSessions(): Promise<SessionDeleteResponse> {
  const selected = Array.from(selectedSessionIds())
  if (selected.length === 0) {
    return { success: true, deleted: 0 }
  }

  try {
    const url = ERA_CODE_API_BASE ? new URL("/api/sessions", ERA_CODE_API_BASE).toString() : "/api/sessions"
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionIds: selected }),
    })

    if (!response.ok) {
      throw new Error(`Failed to delete sessions: ${response.statusText}`)
    }

    const result: SessionDeleteResponse = await response.json()

    if (result.success || result.deleted > 0) {
      // Remove deleted sessions from state
      setAllSessions((prev) => prev.filter((s) => !selected.includes(s.id)))
      // Update project counts
      const deletedSessionsByProject = new Map<string, number>()
      const currentSessions = allSessions()
      selected.forEach((id) => {
        const session = currentSessions.find((s) => s.id === id)
        if (session) {
          const count = deletedSessionsByProject.get(session.projectId) ?? 0
          deletedSessionsByProject.set(session.projectId, count + 1)
        }
      })
      setAllProjects((prev) =>
        prev
          .map((p) => ({
            ...p,
            sessionCount: p.sessionCount - (deletedSessionsByProject.get(p.id) ?? 0),
          }))
          .filter((p) => p.sessionCount > 0)
      )
      // Clear selection
      setSelectedSessionIds(new Set<string>())
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, deleted: 0, errors: [message] }
  }
}

export function toggleSessionSelection(sessionId: string): void {
  const current = selectedSessionIds()
  const next = new Set(current)
  if (next.has(sessionId)) {
    next.delete(sessionId)
  } else {
    next.add(sessionId)
  }
  setSelectedSessionIds(next)
}

export function selectAllFiltered(): void {
  const filtered = getFilteredSessions()
  setSelectedSessionIds(new Set(filtered.map((s) => s.id)))
}

export function clearSelection(): void {
  setSelectedSessionIds(new Set<string>())
}
