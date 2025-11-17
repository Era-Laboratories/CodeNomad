import { FastifyInstance, FastifyReply } from "fastify"
import { z } from "zod"
import { WorkspaceManager } from "../../workspaces/manager"

interface RouteDeps {
  workspaceManager: WorkspaceManager
}

const WorkspaceCreateSchema = z.object({
  path: z.string(),
  name: z.string().optional(),
})

const WorkspaceFilesQuerySchema = z.object({
  path: z.string().optional(),
})

const WorkspaceFileContentQuerySchema = z.object({
  path: z.string(),
})

export function registerWorkspaceRoutes(app: FastifyInstance, deps: RouteDeps) {
  app.get("/api/workspaces", async () => {
    return deps.workspaceManager.list()
  })

  app.post("/api/workspaces", async (request, reply) => {
    const body = WorkspaceCreateSchema.parse(request.body ?? {})
    const workspace = await deps.workspaceManager.create(body.path, body.name)
    reply.code(201)
    return workspace
  })

  app.get<{ Params: { id: string } }>("/api/workspaces/:id", async (request, reply) => {
    const workspace = deps.workspaceManager.get(request.params.id)
    if (!workspace) {
      reply.code(404)
      return { error: "Workspace not found" }
    }
    return workspace
  })

  app.delete<{ Params: { id: string } }>("/api/workspaces/:id", async (request, reply) => {
    await deps.workspaceManager.delete(request.params.id)
    reply.code(204)
  })

  app.get<{
    Params: { id: string }
    Querystring: { path?: string }
  }>("/api/workspaces/:id/files", async (request, reply) => {
    try {
      const query = WorkspaceFilesQuerySchema.parse(request.query ?? {})
      return deps.workspaceManager.listFiles(request.params.id, query.path ?? ".")
    } catch (error) {
      return handleWorkspaceError(error, reply)
    }
  })

  app.get<{
    Params: { id: string }
    Querystring: { path?: string }
  }>("/api/workspaces/:id/files/content", async (request, reply) => {
    try {
      const query = WorkspaceFileContentQuerySchema.parse(request.query ?? {})
      return deps.workspaceManager.readFile(request.params.id, query.path)
    } catch (error) {
      return handleWorkspaceError(error, reply)
    }
  })
}

function handleWorkspaceError(error: unknown, reply: FastifyReply) {
  if (error instanceof Error && error.message === "Workspace not found") {
    reply.code(404)
    return { error: "Workspace not found" }
  }
  reply.code(400)
  return { error: error instanceof Error ? error.message : "Unable to fulfill request" }
}
