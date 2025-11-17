import fs from "fs"
import path from "path"
import { FileSystemEntry } from "../api-types"

interface FileSystemBrowserOptions {
  rootDir: string
}

export class FileSystemBrowser {
  private readonly root: string

  constructor(options: FileSystemBrowserOptions) {
    this.root = path.resolve(options.rootDir)
  }

  list(relativePath: string, options: { depth?: number; includeFiles?: boolean } = {}): FileSystemEntry[] {
    const depth = options.depth ?? 2
    const includeFiles = options.includeFiles ?? true
    if (depth < 1) {
      throw new Error("Depth must be at least 1")
    }
    const normalizedPath = this.normalizeRelativePath(relativePath)
    return this.walk(normalizedPath, depth, includeFiles)
  }

  private walk(relativePath: string, remainingDepth: number, includeFiles: boolean): FileSystemEntry[] {
    const resolved = this.toAbsolute(relativePath)
    const entries = fs.readdirSync(resolved, { withFileTypes: true })

    return entries.flatMap<FileSystemEntry>((entry) => {
      const entryPath = path.join(relativePath, entry.name)
      const absolutePath = this.toAbsolute(entryPath)
      const stats = fs.statSync(absolutePath)

      const current: FileSystemEntry = {
        name: entry.name,
        path: this.normalizeRelativePath(entryPath),
        type: entry.isDirectory() ? "directory" : "file",
        size: entry.isDirectory() ? undefined : stats.size,
        modifiedAt: stats.mtime.toISOString(),
      }

      if (entry.isDirectory() && remainingDepth > 1) {
        const nested = this.walk(entryPath, remainingDepth - 1, includeFiles)
        return [current, ...nested]
      }

      if (!entry.isDirectory() && !includeFiles) {
        return []
      }

      return [current]
    })
  }

  private normalizeRelativePath(input: string | undefined) {
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

  readFile(relativePath: string): string {
    const resolved = this.toAbsolute(relativePath)
    return fs.readFileSync(resolved, "utf-8")
  }

  private toAbsolute(relativePath: string) {
    const target = path.resolve(this.root, relativePath)
    if (!target.startsWith(this.root)) {
      throw new Error("Access outside of root is not allowed")
    }
    return target
  }
}
