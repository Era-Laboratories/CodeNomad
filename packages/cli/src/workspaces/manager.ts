import path from "path"
import { EventBus } from "../events/bus"
import { ConfigStore } from "../config/store"
import { BinaryRegistry } from "../config/binaries"
import { FileSystemBrowser } from "../filesystem/browser"
import { WorkspaceDescriptor, WorkspaceFileResponse, FileSystemEntry } from "../api-types"
import { WorkspaceRuntime } from "./runtime"

interface WorkspaceManagerOptions {
  rootDir: string
  configStore: ConfigStore
  binaryRegistry: BinaryRegistry
  eventBus: EventBus
}

interface WorkspaceRecord extends WorkspaceDescriptor {}

export class WorkspaceManager {
  private readonly workspaces = new Map<string, WorkspaceRecord>()
  private readonly runtime: WorkspaceRuntime

  constructor(private readonly options: WorkspaceManagerOptions) {
    this.runtime = new WorkspaceRuntime(this.options.eventBus)
  }

  list(): WorkspaceDescriptor[] {
    return Array.from(this.workspaces.values())
  }

  get(id: string): WorkspaceDescriptor | undefined {
    return this.workspaces.get(id)
  }

  listFiles(workspaceId: string, relativePath = "."): FileSystemEntry[] {
    const workspace = this.requireWorkspace(workspaceId)
    const browser = new FileSystemBrowser({ rootDir: workspace.path })
    return browser.list(relativePath)
  }

  readFile(workspaceId: string, relativePath: string): WorkspaceFileResponse {
    const workspace = this.requireWorkspace(workspaceId)
    const browser = new FileSystemBrowser({ rootDir: workspace.path })
    const contents = browser.readFile(relativePath)
    return {
      workspaceId,
      relativePath,
      contents,
    }
  }

  async create(folder: string, name?: string): Promise<WorkspaceDescriptor> {
    const id = `${Date.now().toString(36)}`
    const binary = this.options.binaryRegistry.resolveDefault()
    const workspacePath = path.isAbsolute(folder) ? folder : path.resolve(this.options.rootDir, folder)

    const descriptor: WorkspaceRecord = {
      id,
      path: workspacePath,
      name,
      status: "starting",
      binaryId: binary.id,
      binaryLabel: binary.label,
      binaryVersion: binary.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.workspaces.set(id, descriptor)
    this.options.eventBus.publish({ type: "workspace.created", workspace: descriptor })

    const environment = this.options.configStore.get().preferences.environmentVariables ?? {}

    try {
      const { pid, port } = await this.runtime.launch({
        workspaceId: id,
        folder: workspacePath,
        binaryPath: binary.path,
        environment,
        onExit: (info) => this.handleProcessExit(info.workspaceId, info),
      })

      descriptor.pid = pid
      descriptor.port = port
      descriptor.status = "ready"
      descriptor.updatedAt = new Date().toISOString()
      this.options.eventBus.publish({ type: "workspace.started", workspace: descriptor })
      return descriptor
    } catch (error) {
      descriptor.status = "error"
      descriptor.error = error instanceof Error ? error.message : String(error)
      descriptor.updatedAt = new Date().toISOString()
      this.options.eventBus.publish({ type: "workspace.error", workspace: descriptor })
      throw error
    }
  }

  async delete(id: string): Promise<WorkspaceDescriptor | undefined> {
    const workspace = this.workspaces.get(id)
    if (!workspace) return undefined

    const wasRunning = Boolean(workspace.pid)
    if (wasRunning) {
      await this.runtime.stop(id).catch(() => {})
    }

    this.workspaces.delete(id)
    if (!wasRunning) {
      this.options.eventBus.publish({ type: "workspace.stopped", workspaceId: id })
    }
    return workspace
  }

  async shutdown() {
    for (const [id] of this.workspaces) {
      if (this.workspaces.get(id)?.pid) {
        await this.runtime.stop(id).catch(() => {})
      }
    }
    this.workspaces.clear()
  }

  private requireWorkspace(id: string): WorkspaceRecord {
    const workspace = this.workspaces.get(id)
    if (!workspace) {
      throw new Error("Workspace not found")
    }
    return workspace
  }

  private handleProcessExit(workspaceId: string, info: { code: number | null; requested: boolean }) {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) return

    workspace.pid = undefined
    workspace.port = undefined
    workspace.updatedAt = new Date().toISOString()

    if (info.requested || info.code === 0) {
      workspace.status = "stopped"
      workspace.error = undefined
      this.options.eventBus.publish({ type: "workspace.stopped", workspaceId })
    } else {
      workspace.status = "error"
      workspace.error = `Process exited with code ${info.code}`
      this.options.eventBus.publish({ type: "workspace.error", workspace })
    }
  }
}
