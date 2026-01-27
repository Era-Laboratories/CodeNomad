import { Component, Show, createSignal } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import { X, Shield, AlertTriangle } from "lucide-solid"
import { setRuleOverride, type GovernanceRule } from "../stores/era-governance"

interface GovernanceOverrideDialogProps {
  open: boolean
  onClose: () => void
  rule: GovernanceRule | null
  folder: string
}

const GovernanceOverrideDialog: Component<GovernanceOverrideDialogProps> = (props) => {
  const [justification, setJustification] = createSignal("")
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  const handleSubmit = async () => {
    if (!props.rule || !justification().trim()) {
      setError("Please provide a justification")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await setRuleOverride(
      props.rule.id,
      "allow",
      justification().trim(),
      props.folder
    )

    setIsSubmitting(false)

    if (result.success) {
      setJustification("")
      props.onClose()
    } else {
      setError(result.error || "Failed to set override")
    }
  }

  const handleClose = () => {
    setJustification("")
    setError(null)
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleClose()} modal>
      <Dialog.Portal>
        <Dialog.Overlay class="governance-dialog-overlay" />
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <Dialog.Content class="governance-dialog">
            <div class="governance-dialog-header">
              <Dialog.Title class="governance-dialog-title">
                <Shield class="w-5 h-5" />
                <span>Override Rule</span>
              </Dialog.Title>
              <Dialog.CloseButton class="governance-dialog-close">
                <X class="w-4 h-4" />
              </Dialog.CloseButton>
            </div>

            <Show when={props.rule}>
              <div class="governance-dialog-content">
                <div class="governance-dialog-rule-info">
                  <div class="governance-dialog-rule-id">{props.rule!.id}</div>
                  <div class="governance-dialog-rule-reason">{props.rule!.reason}</div>
                  <Show when={props.rule!.suggestion}>
                    <div class="governance-dialog-rule-suggestion">
                      {props.rule!.suggestion}
                    </div>
                  </Show>
                </div>

                <div class="governance-dialog-warning">
                  <AlertTriangle class="w-4 h-4" />
                  <span>
                    Overriding this rule will allow the blocked command to execute.
                    Make sure you understand the implications.
                  </span>
                </div>

                <div class="governance-dialog-form">
                  <label class="governance-dialog-label">
                    Justification <span class="text-red-400">*</span>
                  </label>
                  <textarea
                    class="governance-dialog-textarea"
                    placeholder="Explain why this override is necessary..."
                    value={justification()}
                    onInput={(e) => setJustification(e.currentTarget.value)}
                    rows={3}
                  />
                  <p class="governance-dialog-hint">
                    This justification will be saved to .era/governance.local.yaml
                  </p>
                </div>

                <Show when={error()}>
                  <div class="governance-dialog-error">
                    <AlertTriangle class="w-4 h-4" />
                    <span>{error()}</span>
                  </div>
                </Show>
              </div>

              <div class="governance-dialog-footer">
                <button
                  type="button"
                  class="governance-dialog-btn governance-dialog-btn-cancel"
                  onClick={handleClose}
                  disabled={isSubmitting()}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="governance-dialog-btn governance-dialog-btn-confirm"
                  onClick={handleSubmit}
                  disabled={isSubmitting() || !justification().trim()}
                >
                  {isSubmitting() ? "Saving..." : "Allow Rule"}
                </button>
              </div>
            </Show>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default GovernanceOverrideDialog
