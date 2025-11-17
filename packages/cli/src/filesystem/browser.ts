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

  list(relativePath: string): FileSystemEntry[] {
    const resolved = this.toAbsolute(relativePath)
    const entries = fs.readdirSync(resolved, { withFileTypes: true })

    return entries.flatMap<FileSystemEntry>((entry) => {
      const entryPath = path.join(relativePath, entry.name)
      const absolutePath = this.toAbsolute(entryPath)
      const stats = fs.statSync(absolutePath)

      const current: FileSystemEntry = {
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? "directory" : "file",
        size: entry.isDirectory() ? undefined : stats.size,
        modifiedAt: stats.mtime.toISOString(),
      }

      if (entry.isDirectory()) {
        const nested = this.list(entryPath)
        return [current, ...nested]
      }

      return [current]
    })
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
