import { FastifyInstance } from "fastify"
import { z } from "zod"
import { FileSystemBrowser } from "../../filesystem/browser"

interface RouteDeps {
  fileSystemBrowser: FileSystemBrowser
}

const FilesystemQuerySchema = z.object({
  path: z.string().optional(),
  depth: z.coerce.number().int().min(1).max(10).default(2),
})

export function registerFilesystemRoutes(app: FastifyInstance, deps: RouteDeps) {
  app.get("/api/filesystem", async (request, reply) => {
    const query = FilesystemQuerySchema.parse(request.query ?? {})
    const targetPath = query.path ?? "."

    try {
      return deps.fileSystemBrowser.list(targetPath, query.depth)
    } catch (error) {
      reply.code(400)
      return { error: (error as Error).message }
    }
  })
}
