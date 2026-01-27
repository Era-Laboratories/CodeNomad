import { createSignal, createMemo } from "solid-js"
import type { McpServerConfig } from "./preferences"

/**
 * Configuration option for built-in MCP servers
 */
export interface McpConfigurableOption {
  label: string
  type: "number" | "string" | "boolean"
  default: string | number | boolean
  envKey?: string // Environment variable key to store the value
}

/**
 * Built-in MCP server from Era Code
 */
export interface EraCodeMcpServer {
  name: string
  description: string
  config: McpServerConfig
  builtIn: true
  configurable?: Record<string, McpConfigurableOption>
}

/**
 * Era Code built-in MCP servers
 * These are shown in the MCP menu with "Era Code" badge
 * Based on servers from .mcp.json that come with era-code init
 */
export const ERA_CODE_MCP_DEFAULTS: EraCodeMcpServer[] = [
  {
    name: "notion-docs-reader",
    description: "Notion documentation search and fetch",
    builtIn: true,
    config: {
      type: "local",
      command: ["npx", "-y", "@era-laboratories/notion-documentation-mcp"],
      environment: {
        NOTION_TOKEN: "${NOTION_TOKEN}",
      },
      enabled: true,
    },
    configurable: {
      token: {
        label: "Notion Token",
        type: "string",
        default: "",
        envKey: "NOTION_TOKEN",
      },
    },
  },
  {
    name: "linear-server",
    description: "Linear project and issue management",
    builtIn: true,
    config: {
      type: "remote",
      url: "https://mcp.linear.app/mcp",
      enabled: true,
    },
  },
  {
    name: "playwright",
    description: "Browser automation and testing",
    builtIn: true,
    config: {
      type: "local",
      command: ["npx", "-y", "@playwright/mcp@latest"],
      enabled: false, // Disabled by default - requires setup
    },
  },
]

// Signal for tracking built-in server configurations (user overrides)
const [builtInOverrides, setBuiltInOverrides] = createSignal<
  Record<string, Partial<McpServerConfig>>
>({})

/**
 * Get all era-code built-in MCP servers
 */
export function getEraCodeMcpServers(): EraCodeMcpServer[] {
  return ERA_CODE_MCP_DEFAULTS
}

/**
 * Check if an MCP server is a built-in era-code server
 */
export function isBuiltInMcp(name: string): boolean {
  return ERA_CODE_MCP_DEFAULTS.some((server) => server.name === name)
}

/**
 * Get a built-in MCP server by name
 */
export function getBuiltInMcp(name: string): EraCodeMcpServer | undefined {
  return ERA_CODE_MCP_DEFAULTS.find((server) => server.name === name)
}

/**
 * Get the effective config for a built-in server (with user overrides applied)
 */
export function getBuiltInMcpConfig(name: string): McpServerConfig | undefined {
  const builtIn = getBuiltInMcp(name)
  if (!builtIn) return undefined

  const override = builtInOverrides()[name]
  if (!override) return builtIn.config

  return {
    ...builtIn.config,
    ...override,
    environment: {
      ...(builtIn.config.type === "local" ? builtIn.config.environment : {}),
      ...(override.type === "local" ? override.environment : {}),
    },
  } as McpServerConfig
}

/**
 * Update a configurable option for a built-in server
 */
export function updateBuiltInMcpOption(
  serverName: string,
  optionKey: string,
  value: string | number | boolean
): void {
  const builtIn = getBuiltInMcp(serverName)
  if (!builtIn || !builtIn.configurable) return

  const option = builtIn.configurable[optionKey]
  if (!option) return

  setBuiltInOverrides((prev) => {
    const current = prev[serverName] ?? {}
    const currentEnv =
      current.type === "local" ? (current as { environment?: Record<string, string> }).environment ?? {} : {}

    if (option.envKey) {
      return {
        ...prev,
        [serverName]: {
          ...current,
          type: "local",
          environment: {
            ...currentEnv,
            [option.envKey]: String(value),
          },
        },
      }
    }

    return prev
  })
}

/**
 * Get the current value of a configurable option
 */
export function getBuiltInMcpOptionValue(
  serverName: string,
  optionKey: string
): string | number | boolean | undefined {
  const builtIn = getBuiltInMcp(serverName)
  if (!builtIn || !builtIn.configurable) return undefined

  const option = builtIn.configurable[optionKey]
  if (!option) return undefined

  const override = builtInOverrides()[serverName]
  if (override && option.envKey && override.type === "local") {
    const env = (override as { environment?: Record<string, string> }).environment
    if (env && env[option.envKey]) {
      if (option.type === "number") return Number(env[option.envKey])
      if (option.type === "boolean") return env[option.envKey] === "true"
      return env[option.envKey]
    }
  }

  return option.default
}

/**
 * Derived: List of built-in MCP server names
 */
export const builtInMcpNames = createMemo(() =>
  ERA_CODE_MCP_DEFAULTS.map((server) => server.name)
)
