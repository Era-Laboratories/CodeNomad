import Fastify from "fastify"
import cors from "@fastify/cors"
import { WorkspaceManager } from "../workspaces/manager"
import { ConfigStore } from "../config/store"
import { BinaryRegistry } from "../config/binaries"
import { FileSystemBrowser } from "../filesystem/browser"
import { EventBus } from "../events/bus"
import { registerWorkspaceRoutes } from "./routes/workspaces"
import { registerConfigRoutes } from "./routes/config"
import { registerFilesystemRoutes } from "./routes/filesystem"
import { registerMetaRoutes } from "./routes/meta"
import { registerEventRoutes } from "./routes/events"
import { registerStorageRoutes } from "./routes/storage"
import { ServerMeta } from "../api-types"
import { InstanceStore } from "../storage/instance-store"

interface HttpServerDeps {
  host: string
  port: number
  workspaceManager: WorkspaceManager
  configStore: ConfigStore
  binaryRegistry: BinaryRegistry
  fileSystemBrowser: FileSystemBrowser
  eventBus: EventBus
  serverMeta: ServerMeta
  instanceStore: InstanceStore
}

export function createHttpServer(deps: HttpServerDeps) {
  const app = Fastify({ logger: false })

  app.register(cors, {
    origin: true,
    credentials: true,
  })

  registerWorkspaceRoutes(app, { workspaceManager: deps.workspaceManager })
  registerConfigRoutes(app, { configStore: deps.configStore, binaryRegistry: deps.binaryRegistry })
  registerFilesystemRoutes(app, { fileSystemBrowser: deps.fileSystemBrowser })
  registerMetaRoutes(app, { serverMeta: deps.serverMeta })
  registerEventRoutes(app, { eventBus: deps.eventBus })
  registerStorageRoutes(app, { instanceStore: deps.instanceStore })

  return {
    instance: app,
    start: () => app.listen({ port: deps.port, host: deps.host }),
    stop: () => app.close(),
  }
}
