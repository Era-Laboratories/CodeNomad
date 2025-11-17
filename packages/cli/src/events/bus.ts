import { EventEmitter } from "events"
import { WorkspaceEventPayload } from "../api-types"

export class EventBus extends EventEmitter {
  publish(event: WorkspaceEventPayload): boolean {
    return super.emit(event.type, event)
  }

  onEvent(listener: (event: WorkspaceEventPayload) => void) {
    const handler = (event: WorkspaceEventPayload) => listener(event)
    this.on("workspace.created", handler)
    this.on("workspace.started", handler)
    this.on("workspace.error", handler)
    this.on("workspace.stopped", handler)
    this.on("workspace.log", handler)
    this.on("config.appChanged", handler)
    this.on("config.binariesChanged", handler)
    return () => {
      this.off("workspace.created", handler)
      this.off("workspace.started", handler)
      this.off("workspace.error", handler)
      this.off("workspace.stopped", handler)
      this.off("workspace.log", handler)
      this.off("config.appChanged", handler)
      this.off("config.binariesChanged", handler)
    }
  }
}
