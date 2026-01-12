import { Component } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { AlertTriangle, X, ShieldCheck, ShieldOff } from "lucide-solid"

interface PermissionWarningModalProps {
  open: boolean
  projectName: string
  onProceed: () => void
  onDisable: () => void
}

const PermissionWarningModal: Component<PermissionWarningModalProps> = (props) => {
  const handleProceed = () => {
    props.onProceed()
  }

  const handleDisable = () => {
    props.onDisable()
  }

  // Dismiss (X/ESC) = implicit consent, proceed with auto-approve
  const handleDismiss = () => {
    props.onProceed()
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleDismiss()} modal>
      <Dialog.Portal>
        <Dialog.Overlay class="permission-modal-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="permission-modal">
            <div class="permission-modal-header">
              <div class="permission-modal-icon">
                <AlertTriangle class="w-6 h-6" />
              </div>
              <div class="permission-modal-title-group">
                <Dialog.Title class="permission-modal-title">
                  Auto-approve is enabled
                </Dialog.Title>
                <Dialog.Description class="permission-modal-description">
                  Opening "{props.projectName}"
                </Dialog.Description>
              </div>
              <Dialog.CloseButton class="permission-modal-close" onClick={handleDismiss}>
                <X class="w-4 h-4" />
              </Dialog.CloseButton>
            </div>

            <div class="permission-modal-body">
              <p class="permission-modal-text">
                This project will run with <strong>auto-approve permissions</strong> enabled, which means:
              </p>
              <ul class="permission-modal-list">
                <li>File edits will be applied without confirmation</li>
                <li>Shell commands will execute without prompts</li>
                <li>Potentially destructive operations won't require approval</li>
              </ul>
              <p class="permission-modal-hint">
                You can change this at any time in the session sidebar or global settings.
              </p>
            </div>

            <div class="permission-modal-footer">
              <button
                type="button"
                class="permission-modal-button permission-modal-button-secondary"
                onClick={handleDisable}
              >
                <ShieldOff class="w-4 h-4" />
                <span>Disable for this project</span>
              </button>
              <button
                type="button"
                class="permission-modal-button permission-modal-button-primary"
                onClick={handleProceed}
              >
                <ShieldCheck class="w-4 h-4" />
                <span>Proceed with auto-approve</span>
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default PermissionWarningModal
