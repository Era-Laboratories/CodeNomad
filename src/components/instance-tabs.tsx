import { Component, For, Show } from "solid-js"
import type { Instance } from "../types/instance"
import InstanceTab from "./instance-tab"
import KeyboardHint from "./keyboard-hint"
import { Plus } from "lucide-solid"
import { keyboardRegistry } from "../lib/keyboard-registry"

interface InstanceTabsProps {
  instances: Map<string, Instance>
  activeInstanceId: string | null
  onSelect: (instanceId: string) => void
  onClose: (instanceId: string) => void
  onNew: () => void
}

const InstanceTabs: Component<InstanceTabsProps> = (props) => {
  return (
    <div class="instance-tabs bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div class="tabs-container flex items-center justify-between gap-1 px-2 py-1 overflow-x-auto" role="tablist">
        <div class="flex items-center gap-1 overflow-x-auto">
          <For each={Array.from(props.instances.entries())}>
            {([id, instance]) => (
              <InstanceTab
                instance={instance}
                active={id === props.activeInstanceId}
                onSelect={() => props.onSelect(id)}
                onClose={() => props.onClose(id)}
              />
            )}
          </For>
          <button
            class="new-tab-button inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={props.onNew}
            title="New instance (Cmd/Ctrl+N)"
            aria-label="New instance"
          >
            <Plus class="w-4 h-4" />
          </button>
        </div>
        <Show when={Array.from(props.instances.entries()).length > 1}>
          <div class="flex-shrink-0 ml-4">
            <KeyboardHint
              shortcuts={[keyboardRegistry.get("instance-prev")!, keyboardRegistry.get("instance-next")!].filter(
                Boolean,
              )}
            />
          </div>
        </Show>
      </div>
    </div>
  )
}

export default InstanceTabs
