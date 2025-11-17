import type {
  AgentModelSelections,
  ConfigFile,
  ModelPreference,
  OpenCodeBinary,
  Preferences,
  RecentFolder,
} from "./config/schema"

/**
 * Canonical HTTP/SSE contract for the CLI server.
 * These types are consumed by both the CLI implementation and any UI clients.
 */

export type WorkspaceStatus = "starting" | "ready" | "stopped" | "error"

export interface WorkspaceDescriptor {
  id: string
  /** Absolute path on the server host. */
  path: string
  name?: string
  status: WorkspaceStatus
  /** PID/port are populated when the workspace is running. */
  pid?: number
  port?: number
  /** Identifier of the binary resolved from config. */
  binaryId: string
  binaryLabel: string
  binaryVersion?: string
  createdAt: string
  updatedAt: string
  /** Present when `status` is "error". */
  error?: string
}

export interface WorkspaceCreateRequest {
  path: string
  name?: string
}

export type WorkspaceCreateResponse = WorkspaceDescriptor
export type WorkspaceListResponse = WorkspaceDescriptor[]
export type WorkspaceDetailResponse = WorkspaceDescriptor

export interface WorkspaceDeleteResponse {
  id: string
  status: WorkspaceStatus
}

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface WorkspaceLogEntry {
  workspaceId: string
  timestamp: string
  level: LogLevel
  message: string
}

export interface FileSystemEntry {
  name: string
  /** Path relative to the CLI server root ("." represents the root itself). */
  path: string
  type: "file" | "directory"
  size?: number
  /** ISO timestamp of last modification when available. */
  modifiedAt?: string
}

export type FileSystemListResponse = FileSystemEntry[]

export interface WorkspaceFileResponse {
  workspaceId: string
  relativePath: string
  /** UTF-8 file contents; binary files should be base64 encoded by the caller. */
  contents: string
}

export interface InstanceData {
  messageHistory: string[]
}

export interface BinaryRecord {
  id: string
  path: string
  label: string
  version?: string
  /** Indicates that this binary will be picked when workspaces omit an explicit choice. */
  isDefault: boolean
  lastValidatedAt?: string
  validationError?: string
}

export type AppConfig = ConfigFile
export type AppConfigResponse = AppConfig
export type AppConfigUpdateRequest = Partial<AppConfig>

export interface BinaryListResponse {
  binaries: BinaryRecord[]
}

export interface BinaryCreateRequest {
  path: string
  label?: string
  makeDefault?: boolean
}

export interface BinaryUpdateRequest {
  label?: string
  makeDefault?: boolean
}

export interface BinaryValidationResult {
  valid: boolean
  version?: string
  error?: string
}

export type WorkspaceEventType =
  | "workspace.created"
  | "workspace.started"
  | "workspace.error"
  | "workspace.stopped"
  | "workspace.log"
  | "config.appChanged"
  | "config.binariesChanged"

export type WorkspaceEventPayload =
  | { type: "workspace.created"; workspace: WorkspaceDescriptor }
  | { type: "workspace.started"; workspace: WorkspaceDescriptor }
  | { type: "workspace.error"; workspace: WorkspaceDescriptor }
  | { type: "workspace.stopped"; workspaceId: string }
  | { type: "workspace.log"; entry: WorkspaceLogEntry }
  | { type: "config.appChanged"; config: AppConfig }
  | { type: "config.binariesChanged"; binaries: BinaryRecord[] }

export interface ServerMeta {
  /** Base URL clients should target for REST calls (useful for Electron embedding). */
  httpBaseUrl: string
  /** SSE endpoint advertised to clients (`/api/events` by default). */
  eventsUrl: string
  /** Display label for the host (e.g., hostname or friendly name). */
  hostLabel: string
  /** Absolute path of the filesystem root exposed to clients. */
  workspaceRoot: string
}

export type {
  Preferences,
  ModelPreference,
  AgentModelSelections,
  RecentFolder,
  OpenCodeBinary,
}
