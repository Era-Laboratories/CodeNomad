import { FastifyInstance } from "fastify"
import { z } from "zod"
import { FileSystemBrowser } from "../../filesystem/browser"

interface RouteDeps {
  fileSystemBrowser: FileSystemBrowser
}

const FilesystemQuerySchema = z.object({
  path: z.string().optional(),
})

export function registerFilesystemRoutes(app: FastifyInstance, deps: RouteDeps) {
  app.get("/api/filesystem", async (request, reply) => {
    const query = FilesystemQuerySchema.parse(request.query ?? {})
    const targetPath = query.path ?? "."

    try {
      return deps.fileSystemBrowser.list(targetPath)
    } catch (error) {
      reply.code(400)
      return { error: (error as Error).message }
    }
  })
}
