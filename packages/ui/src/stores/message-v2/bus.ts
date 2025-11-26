import { createInstanceMessageStore } from "./instance-store"
import type { InstanceMessageStore } from "./instance-store"

class MessageStoreBus {
  private stores = new Map<string, InstanceMessageStore>()

  registerInstance(instanceId: string, store?: InstanceMessageStore): InstanceMessageStore {
    if (this.stores.has(instanceId)) {
      return this.stores.get(instanceId) as InstanceMessageStore
    }

    const resolved = store ?? createInstanceMessageStore(instanceId)
    this.stores.set(instanceId, resolved)
    return resolved
  }

  getInstance(instanceId: string): InstanceMessageStore | undefined {
    return this.stores.get(instanceId)
  }

  getOrCreate(instanceId: string): InstanceMessageStore {
    return this.registerInstance(instanceId)
  }

  unregisterInstance(instanceId: string) {
    const store = this.stores.get(instanceId)
    if (store) {
      store.clearInstance()
    }
    this.stores.delete(instanceId)
  }

  clearAll() {
    for (const [instanceId, store] of this.stores.entries()) {
      store.clearInstance()
      this.stores.delete(instanceId)
    }
  }
}

export const messageStoreBus = new MessageStoreBus()
