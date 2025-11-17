import { Component, Show, For, createSignal, createMemo, createEffect, onCleanup } from "solid-js"
import { ArrowUpLeft, Folder as FolderIcon, Loader2, X } from "lucide-solid"
import type { FileSystemEntry } from "../../../cli/src/api-types"
import { cliApi } from "../lib/api-client"
import { getServerMeta } from "../lib/server-meta"

const ROOT_KEY = "."
const ROOT_REQUEST_PATH = "/"
const DEFAULT_DEPTH = 2

interface DirectoryBrowserDialogProps {
  open: boolean
  title: string
  description?: string
  onSelect: (absolutePath: string) => void
  onClose: () => void
}

function normalizeRelativePath(input?: string) {
  if (!input || input === "." || input === "./" || input === "/") {
    return "."
  }
  let normalized = input.replace(/\\+/g, "/")
  if (normalized.startsWith("./")) {
    normalized = normalized.replace(/^\.\/+/, "")
  }
  if (normalized.startsWith("/")) {
    normalized = normalized.replace(/^\/+/g, "")
  }
  return normalized === "" ? "." : normalized
}

function getParentPath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === ".") {
    return "."
  }
  const segments = normalized.split("/")
  segments.pop()
  return segments.length === 0 ? "." : segments.join("/")
}

function resolveAbsolutePath(root: string, relativePath: string) {
  if (!root) {
    return relativePath
  }
  if (!relativePath || relativePath === "." || relativePath === "./" || relativePath === "/") {
    return root
  }
  const separator = root.includes("\\") ? "\\" : "/"
  const trimmedRoot = root.endsWith(separator) ? root : `${root}${separator}`
  const normalized = relativePath.replace(/[\\/]+/g, separator).replace(/^[\\/]+/, "")
  return `${trimmedRoot}${normalized}`
}

type FolderRow =
  | { type: "up"; path: string }
  | { type: "folder"; entry: FileSystemEntry }

const DirectoryBrowserDialog: Component<DirectoryBrowserDialogProps> = (props) => {
  const [rootPath, setRootPath] = createSignal("")
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  const [directoryChildren, setDirectoryChildren] = createSignal<Map<string, FileSystemEntry[]>>(new Map())
  const [loadingPaths, setLoadingPaths] = createSignal<Set<string>>(new Set())
  const [loadedPaths, setLoadedPaths] = createSignal<Set<string>>(new Set())
  const [currentPath, setCurrentPath] = createSignal(ROOT_KEY)

  function resetState() {
    setDirectoryChildren(new Map<string, FileSystemEntry[]>())
    setLoadingPaths(new Set<string>())
    setLoadedPaths(new Set<string>())
    setCurrentPath(ROOT_KEY)
    setError(null)
  }

  createEffect(() => {
    if (!props.open) {
      return
    }
    resetState()
    void initialize()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        props.onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })

  async function initialize() {
    setLoading(true)
    try {
      const meta = await getServerMeta()
      setRootPath(meta.workspaceRoot)
      await ensureDirectoryLoaded(ROOT_KEY)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load filesystem"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function ensureDirectoryLoaded(path: string) {
    const normalized = normalizeRelativePath(path)
    if (loadedPaths().has(normalized)) {
      return
    }
    await loadDirectory(normalized)
  }

  async function loadDirectory(path: string) {
    const normalized = normalizeRelativePath(path)
    if (loadingPaths().has(normalized)) {
      return
    }

    setLoadingPaths((prev) => {
      const next = new Set(prev)
      next.add(normalized)
      return next
    })

    try {
      const requestPath = normalized === ROOT_KEY ? ROOT_REQUEST_PATH : normalized
      const entries = await cliApi.listFileSystem(requestPath, { depth: DEFAULT_DEPTH, includeFiles: false })
      mergeDirectoryEntries(normalized, entries)
      setLoadedPaths((prev) => {
        const next = new Set(prev)
        next.add(normalized)
        return next
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load filesystem"
      setError(message)
      throw err
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev)
        next.delete(normalized)
        return next
      })
    }
  }

  function mergeDirectoryEntries(basePath: string, entries: FileSystemEntry[]) {
    const grouped = new Map<string, FileSystemEntry[]>([[basePath, []]])
    for (const entry of entries) {
      if (entry.type !== "directory") {
        continue
      }
      const normalizedEntryPath = normalizeRelativePath(entry.path)
      const parentPath = getParentPath(normalizedEntryPath)
      const siblings = grouped.get(parentPath) ?? []
      siblings.push({ ...entry, path: normalizedEntryPath })
      grouped.set(parentPath, siblings)
    }

    setDirectoryChildren((prev) => {
      const next = new Map(prev)
      for (const [parent, children] of grouped.entries()) {
        const sorted = children.slice().sort((a, b) => a.name.localeCompare(b.name))
        next.set(parent, sorted)
      }
      return next
    })
  }

  function handleEntrySelect(relativePath: string) {
    const absolute = resolveAbsolutePath(rootPath(), relativePath)
    props.onSelect(absolute)
  }

  function isPathLoading(path: string) {
    return loadingPaths().has(normalizeRelativePath(path))
  }

  const folderRows = createMemo<FolderRow[]>(() => {
    const rows: FolderRow[] = []
    if (currentPath() !== ROOT_KEY) {
      rows.push({ type: "up", path: getParentPath(currentPath()) })
    }
    const children = directoryChildren().get(currentPath()) ?? []
    for (const entry of children) {
      rows.push({ type: "folder", entry })
    }
    return rows
  })

  function handleNavigateTo(path: string) {
    const normalized = normalizeRelativePath(path)
    setCurrentPath(normalized)
    void ensureDirectoryLoaded(normalized)
  }

  function handleNavigateUp() {
    handleNavigateTo(getParentPath(currentPath()))
  }

  const currentAbsolutePath = createMemo(() => resolveAbsolutePath(rootPath(), currentPath()))

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      props.onClose()
    }
  }

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={handleOverlayClick}>
        <div class="modal-surface directory-browser-modal" role="dialog" aria-modal="true">
          <div class="panel directory-browser-panel">
            <div class="directory-browser-header">
              <div class="directory-browser-heading">
                <h3 class="directory-browser-title">{props.title}</h3>
                <p class="directory-browser-description">
                  {props.description || "Browse folders under the configured workspace root."}
                </p>
              </div>
              <button type="button" class="directory-browser-close" aria-label="Close" onClick={props.onClose}>
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="panel-body directory-browser-body">
              <Show when={rootPath()}>
                <div class="directory-browser-current">
                  <div class="directory-browser-current-meta">
                    <span class="directory-browser-current-label">Current folder</span>
                    <span class="directory-browser-current-path">{currentAbsolutePath()}</span>
                  </div>
                  <button
                    type="button"
                    class="selector-button selector-button-secondary directory-browser-select directory-browser-current-select"
                    onClick={() => handleEntrySelect(currentPath())}
                  >
                    Select Current
                  </button>
                </div>
              </Show>
              <Show
                when={!loading() && !error()}
                fallback={
                  <div class="panel-empty-state flex-1">
                    <Show when={loading()} fallback={<span class="text-red-500">{error()}</span>}>
                      <div class="directory-browser-loading">
                        <Loader2 class="w-5 h-5 animate-spin" />
                        <span>Loading folders…</span>
                      </div>
                    </Show>
                  </div>
                }
              >
                <Show
                  when={folderRows().length > 0}
                  fallback={<div class="panel-empty-state flex-1">No folders available.</div>}
                >
                  <div class="panel-list panel-list--fill flex-1 min-h-0 overflow-auto directory-browser-list" role="listbox">
                    <For each={folderRows()}>
                      {(item) => {
                        const isFolder = item.type === "folder"
                        const label = isFolder ? item.entry.name || item.entry.path : "Up one level"
                        const navigate = () => (isFolder ? handleNavigateTo(item.entry.path) : handleNavigateUp())
                        return (
                          <div class="panel-list-item" role="option">
                            <div class="panel-list-item-content directory-browser-row">
                              <button type="button" class="directory-browser-row-main" onClick={navigate}>
                                <div class="directory-browser-row-icon">
                                  <Show when={!isFolder} fallback={<FolderIcon class="w-4 h-4" />}>
                                    <ArrowUpLeft class="w-4 h-4" />
                                  </Show>
                                </div>
                                <div class="directory-browser-row-text">
                                  <span class="directory-browser-row-name">{label}</span>
                                </div>
                                <Show when={isFolder && isPathLoading(item.entry.path)}>
                                  <Loader2 class="directory-browser-row-spinner animate-spin" />
                                </Show>
                              </button>
                              {isFolder ? (
                                <button
                                  type="button"
                                  class="selector-button selector-button-secondary directory-browser-select"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleEntrySelect(item.entry.path)
                                  }}
                                >
                                  Select
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default DirectoryBrowserDialog
