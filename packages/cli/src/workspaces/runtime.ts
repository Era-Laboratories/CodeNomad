import { ChildProcess, spawn } from "child_process"
import { existsSync, statSync } from "fs"
import path from "path"
import { EventBus } from "../events/bus"
import { LogLevel, WorkspaceLogEntry } from "../api-types"

interface LaunchOptions {
  workspaceId: string
  folder: string
  binaryPath: string
  environment?: Record<string, string>
  onExit?: (info: ProcessExitInfo) => void
}

interface ProcessExitInfo {
  workspaceId: string
  code: number | null
  signal: NodeJS.Signals | null
  requested: boolean
}

interface ManagedProcess {
  child: ChildProcess
  requestedStop: boolean
}

export class WorkspaceRuntime {
  private processes = new Map<string, ManagedProcess>()

  constructor(private readonly eventBus: EventBus) {}

  async launch(options: LaunchOptions): Promise<{ pid: number; port: number }> {
    this.validateFolder(options.folder)

    const args = ["serve", "--port", "0", "--print-logs", "--log-level", "DEBUG"]
    const env = { ...process.env, ...(options.environment ?? {}) }

    return new Promise((resolve, reject) => {
      const child = spawn(options.binaryPath, args, {
        cwd: options.folder,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      })

      const managed: ManagedProcess = { child, requestedStop: false }
      this.processes.set(options.workspaceId, managed)

      let stdoutBuffer = ""
      let stderrBuffer = ""
      let portFound = false

      const timeout = setTimeout(() => {
        child.kill("SIGKILL")
        reject(new Error("Server startup timeout (10s exceeded)"))
      }, 10000)

      const cleanup = () => {
        clearTimeout(timeout)
        child.stdout?.removeAllListeners()
        child.stderr?.removeAllListeners()
        child.removeListener("error", handleError)
      }

      const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
        this.processes.delete(options.workspaceId)
        if (!portFound) {
          cleanup()
          const reason = stderrBuffer || `Process exited with code ${code}`
          reject(new Error(reason))
        } else {
          options.onExit?.({ workspaceId: options.workspaceId, code, signal, requested: managed.requestedStop })
        }
      }

      const handleError = (error: Error) => {
        cleanup()
        this.processes.delete(options.workspaceId)
        child.removeListener("exit", handleExit)
        reject(error)
      }

      child.on("error", handleError)
      child.on("exit", handleExit)

      child.stdout?.on("data", (data: Buffer) => {
        const text = data.toString()
        stdoutBuffer += text
        const lines = stdoutBuffer.split("\n")
        stdoutBuffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          this.emitLog(options.workspaceId, "info", line)

          if (!portFound) {
            const portMatch = line.match(/opencode server listening on http:\/\/.+:(\d+)/i)
            if (portMatch) {
              portFound = true
              cleanup()
              resolve({ pid: child.pid!, port: parseInt(portMatch[1], 10) })
            }
          }
        }
      })

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString()
        stderrBuffer += text
        const lines = stderrBuffer.split("\n")
        stderrBuffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          this.emitLog(options.workspaceId, "error", line)
        }
      })

      child.on("exit", (code, signal) => {
        this.processes.delete(options.workspaceId)
        if (!portFound) {
          cleanup()
          const reason = stderrBuffer || `Process exited with code ${code}`
          reject(new Error(reason))
        }
        options.onExit?.({ workspaceId: options.workspaceId, code, signal, requested: managed.requestedStop })
      })
    })
  }

  async stop(workspaceId: string): Promise<void> {
    const managed = this.processes.get(workspaceId)
    if (!managed) return

    managed.requestedStop = true
    const child = managed.child

    await new Promise<void>((resolve, reject) => {
      const onExit = () => {
        child.removeListener("error", onError)
        resolve()
      }
      const onError = (error: Error) => {
        child.removeListener("exit", onExit)
        reject(error)
      }

      child.once("exit", onExit)
      child.once("error", onError)

      child.kill("SIGTERM")
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL")
        }
      }, 2000)
    })
  }

  private emitLog(workspaceId: string, level: LogLevel, message: string) {
    const entry: WorkspaceLogEntry = {
      workspaceId,
      timestamp: new Date().toISOString(),
      level,
      message: message.trim(),
    }

    this.eventBus.publish({ type: "workspace.log", entry })
  }

  private validateFolder(folder: string) {
    const resolved = path.resolve(folder)
    if (!existsSync(resolved)) {
      throw new Error(`Folder does not exist: ${resolved}`)
    }
    const stats = statSync(resolved)
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolved}`)
    }
  }
}
