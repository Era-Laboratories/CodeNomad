import { Component, Show } from "solid-js"
import type { Session } from "../types/session"
import { MessageSquare, Info, X } from "lucide-solid"

interface SessionTabProps {
  session?: Session
  special?: "info"
  active: boolean
  isParent?: boolean
  onSelect: () => void
  onClose?: () => void
}

const SessionTab: Component<SessionTabProps> = (props) => {
  const label = () => {
    if (props.special === "info") return "Info"
    return props.session?.title || "Untitled"
  }

  return (
    <div class="group">
      <button
        class={`session-tab-base ${
          props.active
            ? "session-tab-active"
            : "session-tab-inactive"
        } ${props.special === "info" ? "session-tab-special" : ""} ${props.isParent && !props.active ? "font-semibold" : ""}`}
        onClick={props.onSelect}
        title={label()}
        role="tab"
        aria-selected={props.active}
      >
        <Show when={props.special === "info"} fallback={<MessageSquare class="w-3.5 h-3.5 flex-shrink-0" />}>
          <Info class="w-3.5 h-3.5 flex-shrink-0" />
        </Show>
        <span class="tab-label">{label()}</span>
        <Show when={!props.special && props.onClose}>
          <span
            class="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              props.onClose?.()
            }}
            role="button"
            tabIndex={0}
            aria-label="Close session"
          >
            <X class="w-3 h-3" />
          </span>
        </Show>
      </button>
    </div>
  )
}

export default SessionTab
