/**
 * CLI entry point.
 * For now this only wires the typed modules together; actual command handling comes later.
 */
import { createHttpServer } from "./server/http-server"
import { WorkspaceManager } from "./workspaces/manager"
import { ConfigStore } from "./config/store"
import { BinaryRegistry } from "./config/binaries"
import { FileSystemBrowser } from "./filesystem/browser"
import { EventBus } from "./events/bus"
import { ServerMeta } from "./api-types"
import { InstanceStore } from "./storage/instance-store"

interface CliOptions {
  port: number
  host: string
  rootDir: string
  configPath: string
}

function parseCliOptions(argv: string[]): CliOptions {
  // TODO: replace with commander/yargs; this is placeholder logic.
  const args = new Map<string, string>()
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key && key.startsWith("--") && value) {
      args.set(key.slice(2), value)
    }
  }

  return {
    port: Number(args.get("port") ?? process.env.CLI_PORT ?? 5777),
    host: args.get("host") ?? process.env.CLI_HOST ?? "127.0.0.1",
    rootDir: args.get("root") ?? process.cwd(),
    configPath: args.get("config") ?? process.env.CLI_CONFIG ?? "~/.config/codenomad/config.json",
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2))

  const eventBus = new EventBus()
  const configStore = new ConfigStore(options.configPath, eventBus)
  const binaryRegistry = new BinaryRegistry(configStore, eventBus)
  const workspaceManager = new WorkspaceManager({
    rootDir: options.rootDir,
    configStore,
    binaryRegistry,
    eventBus,
  })
  const fileSystemBrowser = new FileSystemBrowser({ rootDir: options.rootDir })
  const instanceStore = new InstanceStore()

  const serverMeta: ServerMeta = {
    httpBaseUrl: `http://${options.host}:${options.port}`,
    eventsUrl: `/api/events`,
    hostLabel: options.host,
    workspaceRoot: options.rootDir,
  }

  const server = createHttpServer({
    host: options.host,
    port: options.port,
    workspaceManager,
    configStore,
    binaryRegistry,
    fileSystemBrowser,
    eventBus,
    serverMeta,
    instanceStore,
  })

  await server.start()

  const shutdown = async () => {
    await server.stop()
    await workspaceManager.shutdown()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((error) => {
  console.error("CLI server crashed", error)
  process.exit(1)
})
