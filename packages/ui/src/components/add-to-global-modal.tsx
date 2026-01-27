import { Component } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { X, Globe, FolderCog } from "lucide-solid"
import type { McpServerConfig } from "../stores/preferences"

export interface AddToGlobalModalProps {
  open: boolean
  onClose: () => void
  type: "mcp" | "lsp"
  serverName: string
  serverConfig: McpServerConfig
  onAddGlobal: () => void
  onKeepProjectOnly: () => void
}

const AddToGlobalModal: Component<AddToGlobalModalProps> = (props) => {
  const typeLabel = () => (props.type === "mcp" ? "MCP Server" : "LSP Server")

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()} modal>
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="modal-surface w-full max-w-md p-6 flex flex-col gap-4">
            <div class="flex items-start justify-between">
              <Dialog.Title class="text-lg font-semibold text-primary">
                Add {typeLabel()}
              </Dialog.Title>
              <Dialog.CloseButton class="text-secondary hover:text-primary">
                <X class="w-5 h-5" />
              </Dialog.CloseButton>
            </div>

            <Dialog.Description class="text-sm text-secondary">
              Where would you like to add <strong>{props.serverName}</strong>?
            </Dialog.Description>

            <div class="flex flex-col gap-3">
              <button
                type="button"
                class="add-to-global-option"
                onClick={() => {
                  props.onAddGlobal()
                  props.onClose()
                }}
              >
                <div class="add-to-global-option-icon">
                  <Globe class="w-5 h-5" />
                </div>
                <div class="add-to-global-option-content">
                  <span class="add-to-global-option-title">Add to Global</span>
                  <span class="add-to-global-option-desc">
                    Available in all projects and instances
                  </span>
                </div>
              </button>

              <button
                type="button"
                class="add-to-global-option"
                onClick={() => {
                  props.onKeepProjectOnly()
                  props.onClose()
                }}
              >
                <div class="add-to-global-option-icon add-to-global-option-icon-project">
                  <FolderCog class="w-5 h-5" />
                </div>
                <div class="add-to-global-option-content">
                  <span class="add-to-global-option-title">Keep Project Only</span>
                  <span class="add-to-global-option-desc">
                    Only available in this project
                  </span>
                </div>
              </button>
            </div>

            <div class="flex justify-end pt-2">
              <button
                type="button"
                class="modal-button modal-button--secondary"
                onClick={props.onClose}
              >
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default AddToGlobalModal
