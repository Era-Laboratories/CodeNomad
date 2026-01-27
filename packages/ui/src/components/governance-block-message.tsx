import { Component, Show } from "solid-js"
import { ShieldAlert, Info, Settings } from "lucide-solid"
import type { GovernanceDecision } from "../stores/era-governance"

interface GovernanceBlockMessageProps {
  command: string
  decision: GovernanceDecision
  onOverride?: () => void
  onOpenSettings?: () => void
}

const GovernanceBlockMessage: Component<GovernanceBlockMessageProps> = (props) => {
  return (
    <div class="governance-block-message">
      <div class="governance-block-header">
        <ShieldAlert class="w-5 h-5" />
        <span class="governance-block-title">Command Blocked by Governance</span>
        <Show when={props.decision.rule}>
          <span class="governance-block-rule">{props.decision.rule}</span>
        </Show>
      </div>

      <div class="governance-block-command">
        <code>{props.command}</code>
      </div>

      <Show when={props.decision.reason}>
        <div class="governance-block-reason">{props.decision.reason}</div>
      </Show>

      <Show when={props.decision.suggestion}>
        <div class="governance-block-suggestion">
          <Info class="w-4 h-4" />
          <span>{props.decision.suggestion}</span>
        </div>
      </Show>

      <div class="governance-block-actions">
        <Show when={props.decision.overridable && props.onOverride}>
          <button
            type="button"
            class="governance-block-override-btn"
            onClick={() => props.onOverride?.()}
          >
            Override with Justification
          </button>
        </Show>
        <Show when={props.onOpenSettings}>
          <button
            type="button"
            class="governance-block-settings-link"
            onClick={() => props.onOpenSettings?.()}
          >
            <Settings class="w-3 h-3 inline mr-1" />
            Governance Settings
          </button>
        </Show>
      </div>
    </div>
  )
}

export default GovernanceBlockMessage
