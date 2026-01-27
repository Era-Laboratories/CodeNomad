import { Component, Show, createSignal } from "solid-js"
import { Dialog } from "@kobalte/core"
import { X, RotateCcw, Square, Server, FileText } from "lucide-solid"
import type { Instance } from "../types/instance"
import InstanceInfo from "./instance-info"
import InstanceLogsPanel from "./instance-logs-panel"

type TabId = "settings" | "logs"

interface InstanceInfoModalProps {
  open: boolean
  onClose: () => void
  instance: Instance | null
  lspConnectedCount?: number
  onRestart?: () => void
  onStop?: () => void
}

const InstanceInfoModal: Component<InstanceInfoModalProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<TabId>("settings")

  return (
    <Dialog.Root open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog-overlay" />
        <Dialog.Content class="dialog-content dialog-content-lg instance-modal">
          <div class="dialog-header">
            <Dialog.Title class="dialog-title">Instance Details</Dialog.Title>
            <Dialog.CloseButton class="dialog-close-button">
              <X size={16} />
            </Dialog.CloseButton>
          </div>

          {/* Tab navigation */}
          <div class="instance-modal-tabs">
            <button
              type="button"
              class={`instance-modal-tab ${activeTab() === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <Server size={14} />
              Instance Settings
            </button>
            <button
              type="button"
              class={`instance-modal-tab ${activeTab() === "logs" ? "active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              <FileText size={14} />
              Logs
            </button>
          </div>

          <div class="dialog-body instance-modal-body">
            <Show when={props.instance} fallback={<div class="text-muted text-sm">No instance selected</div>}>
              {(instance) => (
                <>
                  <Show when={activeTab() === "settings"}>
                    <div class="space-y-4">
                      <InstanceInfo instance={instance()} />

                      <Show when={props.lspConnectedCount !== undefined}>
                        <div class="text-xs text-muted">
                          LSP Connections: {props.lspConnectedCount}
                        </div>
                      </Show>
                    </div>
                  </Show>
                  <Show when={activeTab() === "logs"}>
                    <InstanceLogsPanel instanceId={instance().id} />
                  </Show>
                </>
              )}
            </Show>
          </div>

          <Show when={activeTab() === "settings"}>
            <div class="dialog-footer">
              <Show when={props.onStop}>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  onClick={props.onStop}
                >
                  <Square size={14} />
                  <span>Stop</span>
                </button>
              </Show>
              <Show when={props.onRestart}>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  onClick={props.onRestart}
                >
                  <RotateCcw size={14} />
                  <span>Restart</span>
                </button>
              </Show>
            </div>
          </Show>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default InstanceInfoModal
