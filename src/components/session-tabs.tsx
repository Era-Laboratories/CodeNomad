import { Component, For, Show } from "solid-js"
import type { Session } from "../types/session"
import SessionTab from "./session-tab"
import KeyboardHint from "./keyboard-hint"
import { Plus } from "lucide-solid"
import { keyboardRegistry } from "../lib/keyboard-registry"

interface SessionTabsProps {
  instanceId: string
  sessions: Map<string, Session>
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onClose: (sessionId: string) => void
  onNew: () => void
}

const SessionTabs: Component<SessionTabsProps> = (props) => {
  const sessionsList = () => Array.from(props.sessions.entries())
  const totalTabs = () => sessionsList().length + 1

  return (
    <div class="tab-bar tab-bar-session">
      <div class="tab-container" role="tablist">
        <div class="flex items-center gap-1 overflow-x-auto">
          <For each={sessionsList()}>
            {([id, session]) => (
              <SessionTab
                session={session}
                active={id === props.activeSessionId}
                isParent={session.parentId === null}
                onSelect={() => props.onSelect(id)}
                onClose={session.parentId === null ? () => props.onClose(id) : undefined}
              />
            )}
          </For>
          <SessionTab
            special="info"
            active={props.activeSessionId === "info"}
            onSelect={() => props.onSelect("info")}
          />
          <button
            class="new-tab-button"
            onClick={props.onNew}
            title="New parent session (Cmd/Ctrl+T)"
            aria-label="New parent session"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>
        <Show when={totalTabs() > 1}>
          <div class="flex-shrink-0 ml-4">
            <KeyboardHint
              shortcuts={[keyboardRegistry.get("session-prev")!, keyboardRegistry.get("session-next")!].filter(Boolean)}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}

export default SessionTabs
