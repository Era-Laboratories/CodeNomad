import { Component, Show, createMemo } from "solid-js"
import { ShieldCheck, ShieldOff, RotateCcw } from "lucide-solid"
import {
  getEffectivePermissionState,
  hasSessionPermissionOverride,
  toggleSessionPermission,
  clearSessionPermissionOverride,
} from "../stores/session-permissions"

interface PermissionToggleProps {
  instanceId: string
  sessionId: string
}

const PermissionToggle: Component<PermissionToggleProps> = (props) => {
  const isAutoApprove = createMemo(() =>
    getEffectivePermissionState(props.instanceId, props.sessionId)
  )

  const hasOverride = createMemo(() =>
    hasSessionPermissionOverride(props.instanceId, props.sessionId)
  )

  const handleToggle = () => {
    toggleSessionPermission(props.instanceId, props.sessionId)
  }

  const handleReset = (e: Event) => {
    e.stopPropagation()
    clearSessionPermissionOverride(props.instanceId, props.sessionId)
  }

  return (
    <div class="permission-toggle">
      <button
        type="button"
        class={`permission-toggle-button ${isAutoApprove() ? "enabled" : "disabled"}`}
        onClick={handleToggle}
        title={isAutoApprove() ? "Auto-approve enabled - click to disable" : "Manual approval - click to enable auto-approve"}
      >
        <div class="permission-toggle-icon">
          {isAutoApprove() ? (
            <ShieldCheck class="w-4 h-4" />
          ) : (
            <ShieldOff class="w-4 h-4" />
          )}
        </div>
        <div class="permission-toggle-label">
          <span class="permission-toggle-title">
            {isAutoApprove() ? "Auto-approve" : "Manual"}
          </span>
          <Show when={hasOverride()}>
            <span class="permission-toggle-override">(override)</span>
          </Show>
        </div>
      </button>
      <Show when={hasOverride()}>
        <button
          type="button"
          class="permission-toggle-reset"
          onClick={handleReset}
          title="Reset to inherited setting"
        >
          <RotateCcw class="w-3 h-3" />
        </button>
      </Show>
    </div>
  )
}

export default PermissionToggle
