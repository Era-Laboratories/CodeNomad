import type { AppConfig, InstanceData } from "../../../cli/src/api-types"
import { cliApi } from "./api-client"
import { cliEvents } from "./cli-events"

export type ConfigData = AppConfig


export class ServerStorage {
  private configChangeListeners: Set<() => void> = new Set()

  constructor() {
    cliEvents.on("config.appChanged", () => this.notifyConfigChanged())
  }

  async loadConfig(): Promise<ConfigData> {
    const config = await cliApi.fetchConfig()
    return config
  }

  async saveConfig(config: ConfigData): Promise<void> {
    await cliApi.updateConfig(config)
  }

  async loadInstanceData(instanceId: string): Promise<InstanceData> {
    return cliApi.readInstanceData(instanceId)
  }

  async saveInstanceData(instanceId: string, data: InstanceData): Promise<void> {
    await cliApi.writeInstanceData(instanceId, data)
  }

  async deleteInstanceData(instanceId: string): Promise<void> {
    await cliApi.deleteInstanceData(instanceId)
  }

  onConfigChanged(listener: () => void): () => void {
    this.configChangeListeners.add(listener)
    return () => this.configChangeListeners.delete(listener)
  }

  private notifyConfigChanged() {
    for (const listener of this.configChangeListeners) {
      listener()
    }
  }
}

export const storage = new ServerStorage()
