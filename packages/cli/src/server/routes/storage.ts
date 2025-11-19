import { FastifyInstance } from "fastify"
import { z } from "zod"
import { InstanceStore } from "../../storage/instance-store"
import { EventBus } from "../../events/bus"
import type { InstanceData } from "../../api-types"

interface RouteDeps {
  instanceStore: InstanceStore
  eventBus: EventBus
}

const InstanceDataSchema = z.object({
  messageHistory: z.array(z.string()).default([]),
})

const EMPTY_INSTANCE_DATA: InstanceData = {
  messageHistory: [],
}

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
      deps.eventBus.publish({ type: "instance.dataChanged", instanceId: request.params.id, data: body })
      reply.code(204)
    } catch (error) {
      reply.code(400)
      return { error: error instanceof Error ? error.message : "Failed to save instance data" }
    }
  })

  app.delete<{ Params: { id: string } }>("/api/storage/instances/:id", async (request, reply) => {
    try {
      await deps.instanceStore.delete(request.params.id)
      deps.eventBus.publish({ type: "instance.dataChanged", instanceId: request.params.id, data: EMPTY_INSTANCE_DATA })
      reply.code(204)
    } catch (error) {
      reply.code(500)
      return { error: error instanceof Error ? error.message : "Failed to delete instance data" }
    }
  })
}
