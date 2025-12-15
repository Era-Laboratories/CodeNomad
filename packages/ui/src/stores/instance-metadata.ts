import { createSignal } from "solid-js"
import type { InstanceMetadata } from "../types/instance"

const [metadataMap, setMetadataMap] = createSignal<Map<string, InstanceMetadata | undefined>>(new Map())

function getInstanceMetadata(instanceId: string): InstanceMetadata | undefined {
  return metadataMap().get(instanceId)
}

function setInstanceMetadata(instanceId: string, metadata: InstanceMetadata | undefined): void {
  setMetadataMap((prev) => {
    const next = new Map(prev)
    if (metadata === undefined) {
      next.delete(instanceId)
    } else {
      next.set(instanceId, metadata)
    }
    return next
  })
}

function mergeInstanceMetadata(instanceId: string, updates: InstanceMetadata): void {
  setMetadataMap((prev) => {
    const next = new Map(prev)
    const existing = next.get(instanceId) ?? {}
    next.set(instanceId, { ...existing, ...updates })
    return next
  })
}

function clearInstanceMetadata(instanceId: string): void {
  setInstanceMetadata(instanceId, undefined)
}

export { metadataMap, getInstanceMetadata, setInstanceMetadata, mergeInstanceMetadata, clearInstanceMetadata }
