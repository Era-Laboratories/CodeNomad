import { FastifyInstance } from "fastify"
import { spawn, type ChildProcess } from "child_process"
import { fetch } from "undici"

interface RouteDeps {
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void
    error: (msg: string, meta?: Record<string, unknown>) => void
    debug: (msg: string, meta?: Record<string, unknown>) => void
  }
}

interface McpLocalConfig {
  type: "local"
  command: string[]
  environment?: Record<string, string>
}

interface McpRemoteConfig {
  type: "remote"
  url: string
  headers?: Record<string, string>
}

type McpConfig = McpLocalConfig | McpRemoteConfig

interface TestResult {
  success: boolean
  error?: string
  tools?: number
  resources?: number
  serverInfo?: { name: string; version: string }
}

export function registerMcpRoutes(app: FastifyInstance, deps: RouteDeps) {
  const { logger } = deps

  // Test MCP server connection
  app.post<{
    Body: {
      config: McpConfig
      timeout?: number
    }
  }>("/api/mcp/test", async (request, reply) => {
    const { config, timeout = 15000 } = request.body

    if (!config || !config.type) {
      return reply.status(400).send({ success: false, error: "Invalid config" })
    }

    logger.debug("Testing MCP server", { type: config.type, timeout })

    try {
      let result: TestResult

      if (config.type === "local") {
        result = await testLocalMcpServer(config, timeout, logger)
      } else if (config.type === "remote") {
        result = await testRemoteMcpServer(config, timeout, logger)
      } else {
        return reply.status(400).send({ success: false, error: "Unknown server type" })
      }

      return result
    } catch (error) {
      logger.error("MCP test failed", { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })
}

async function testLocalMcpServer(
  config: McpLocalConfig,
  timeout: number,
  logger: RouteDeps["logger"]
): Promise<TestResult> {
  const [command, ...args] = config.command

  if (!command) {
    return { success: false, error: "No command specified" }
  }

  return new Promise((resolve) => {
    let proc: ChildProcess | null = null
    let resolved = false
    let buffer = ""
    let initializeResponseReceived = false

    const cleanup = () => {
      if (proc && !proc.killed) {
        proc.kill("SIGTERM")
        setTimeout(() => {
          if (proc && !proc.killed) {
            proc.kill("SIGKILL")
          }
        }, 1000)
      }
    }

    const resolveOnce = (result: TestResult) => {
      if (!resolved) {
        resolved = true
        cleanup()
        resolve(result)
      }
    }

    // Set timeout
    const timeoutId = setTimeout(() => {
      resolveOnce({
        success: false,
        error: `Server did not respond within ${timeout / 1000} seconds`,
      })
    }, timeout)

    try {
      // Merge environment variables
      const env = {
        ...process.env,
        ...config.environment,
      }

      logger.debug("Spawning MCP server", { command, args, hasEnv: !!config.environment })

      proc = spawn(command, args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: true,
      })

      proc.on("error", (error) => {
        clearTimeout(timeoutId)
        resolveOnce({
          success: false,
          error: `Failed to start server: ${error.message}`,
        })
      })

      proc.on("exit", (code, signal) => {
        if (!resolved) {
          clearTimeout(timeoutId)
          if (code !== null && code !== 0) {
            resolveOnce({
              success: false,
              error: `Server exited with code ${code}`,
            })
          } else if (signal) {
            resolveOnce({
              success: false,
              error: `Server killed by signal ${signal}`,
            })
          }
        }
      })

      // Handle stderr for error messages
      proc.stderr?.on("data", (data) => {
        const text = data.toString()
        logger.debug("MCP stderr", { text: text.substring(0, 200) })
      })

      // Handle stdout for MCP JSON-RPC messages
      proc.stdout?.on("data", (data) => {
        buffer += data.toString()

        // MCP uses newline-delimited JSON
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const message = JSON.parse(line)
            logger.debug("MCP message received", { id: message.id, method: message.method })

            // Check for initialize response
            if (message.id === 1 && message.result) {
              initializeResponseReceived = true
              const serverInfo = message.result.serverInfo

              // Now send tools/list to get tool count
              const toolsRequest = JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "tools/list",
                params: {},
              })
              proc?.stdin?.write(toolsRequest + "\n")
            }

            // Check for tools/list response
            if (message.id === 2 && message.result) {
              clearTimeout(timeoutId)
              const tools = message.result.tools?.length ?? 0

              // Try to get resources too
              const resourcesRequest = JSON.stringify({
                jsonrpc: "2.0",
                id: 3,
                method: "resources/list",
                params: {},
              })
              proc?.stdin?.write(resourcesRequest + "\n")

              // Give it a moment to respond with resources
              setTimeout(() => {
                resolveOnce({
                  success: true,
                  tools,
                  resources: 0,
                })
              }, 500)
            }

            // Check for resources/list response
            if (message.id === 3 && message.result) {
              clearTimeout(timeoutId)
              resolveOnce({
                success: true,
                tools: message.result.tools?.length,
                resources: message.result.resources?.length ?? 0,
              })
            }

            // Handle errors
            if (message.error) {
              // Method not found is okay - means server responded
              if (message.error.code === -32601) {
                if (initializeResponseReceived) {
                  clearTimeout(timeoutId)
                  resolveOnce({ success: true })
                }
              } else {
                clearTimeout(timeoutId)
                resolveOnce({
                  success: false,
                  error: message.error.message || "Server returned error",
                })
              }
            }
          } catch {
            // Not valid JSON, might be server startup output
          }
        }
      })

      // Send initialize request
      const initRequest = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "era-code-test",
            version: "1.0.0",
          },
        },
      })

      // Give the server a moment to start up before sending
      setTimeout(() => {
        if (!resolved && proc?.stdin?.writable) {
          logger.debug("Sending initialize request")
          proc.stdin.write(initRequest + "\n")
        }
      }, 500)
    } catch (error) {
      clearTimeout(timeoutId)
      resolveOnce({
        success: false,
        error: error instanceof Error ? error.message : "Failed to spawn process",
      })
    }
  })
}

async function testRemoteMcpServer(
  config: McpRemoteConfig,
  timeout: number,
  logger: RouteDeps["logger"]
): Promise<TestResult> {
  try {
    logger.debug("Testing remote MCP server", { url: config.url })

    // For remote servers, we just check if the endpoint is reachable
    // and responds to an HTTP request (MCP over HTTP/SSE)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(config.url, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          ...config.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok || response.status === 405) {
        // 405 Method Not Allowed is acceptable - means server is there but expects POST
        return { success: true }
      }

      return {
        success: false,
        error: `Server returned status ${response.status}`,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: `Server did not respond within ${timeout / 1000} seconds`,
        }
      }
      throw error
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect",
    }
  }
}
