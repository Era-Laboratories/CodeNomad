import { FastifyInstance } from "fastify"
import { z } from "zod"
import { InstanceStore } from "../../storage/instance-store"

interface RouteDeps {
  instanceStore: InstanceStore
}

const InstanceDataSchema = z.object({
  messageHistory: z.array(z.string()).default([]),
})

export function registerStorageRoutes(app: FastifyInstance, deps: RouteDeps) {
  app.get<{ Params: { id: string } }>("/api/storage/instances/:id", async (request, reply) => {
    try {
      const data = await deps.instanceStore.read(request.params.id)
      return data
    } catch (error) {
      reply.code(500)
      return { error: error instanceof Error ? error.message : "Failed to read instance data" }
    }
  })

  app.put<{ Params: { id: string } }>("/api/storage/instances/:id", async (request, reply) => {
    try {
      const body = InstanceDataSchema.parse(request.body ?? {})
      await deps.instanceStore.write(request.params.id, body)
      reply.code(204)
    } catch (error) {
      reply.code(400)
      return { error: error instanceof Error ? error.message : "Failed to save instance data" }
    }
  })

  app.delete<{ Params: { id: string } }>("/api/storage/instances/:id", async (request, reply) => {
    try {
      await deps.instanceStore.delete(request.params.id)
      reply.code(204)
    } catch (error) {
      reply.code(500)
      return { error: error instanceof Error ? error.message : "Failed to delete instance data" }
    }
  })
}
