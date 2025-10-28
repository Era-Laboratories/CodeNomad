import { Select } from "@kobalte/core/select"
import { For, Show, createEffect, createMemo } from "solid-js"
import { agents, fetchAgents, sessions } from "../stores/sessions"
import { ChevronDown } from "lucide-solid"
import type { Agent } from "../types/session"
import Kbd from "./kbd"

interface AgentSelectorProps {
  instanceId: string
  sessionId: string
  currentAgent: string
  onAgentChange: (agent: string) => Promise<void>
}

export default function AgentSelector(props: AgentSelectorProps) {
  const instanceAgents = () => agents().get(props.instanceId) || []

  const session = createMemo(() => {
    const instanceSessions = sessions().get(props.instanceId)
    return instanceSessions?.get(props.sessionId)
  })

  const isChildSession = createMemo(() => {
    return session()?.parentId !== null && session()?.parentId !== undefined
  })

  const availableAgents = createMemo(() => {
    const allAgents = instanceAgents()
    if (isChildSession()) {
      return allAgents
    }

    const filtered = allAgents.filter((agent) => agent.mode !== "subagent")

    const currentAgent = allAgents.find((a) => a.name === props.currentAgent)
    if (currentAgent && !filtered.find((a) => a.name === props.currentAgent)) {
      return [currentAgent, ...filtered]
    }

    return filtered
  })

  createEffect(() => {
    if (instanceAgents().length === 0) {
      fetchAgents(props.instanceId).catch(console.error)
    }
  })

  const handleChange = async (value: Agent | null) => {
    if (value && value.name !== props.currentAgent) {
      await props.onAgentChange(value.name)
    }
  }

  return (
    <div class="flex items-center gap-2">
      <Select
        value={availableAgents().find((a) => a.name === props.currentAgent)}
        onChange={handleChange}
        options={availableAgents()}
        optionValue="name"
        optionTextValue="name"
        placeholder="Select agent..."
        itemComponent={(itemProps) => (
          <Select.Item
            item={itemProps.item}
            class="px-3 py-2 cursor-pointer rounded outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800"
          >
            <div class="flex flex-col">
              <Select.ItemLabel class="font-medium text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>{itemProps.item.rawValue.name}</span>
                <Show when={itemProps.item.rawValue.mode === "subagent"}>
                  <span class="text-xs font-normal text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                    subagent
                  </span>
                </Show>
              </Select.ItemLabel>
              <Show when={itemProps.item.rawValue.description}>
                <Select.ItemDescription class="text-xs text-gray-600 dark:text-gray-300">
                  {itemProps.item.rawValue.description.length > 50
                    ? itemProps.item.rawValue.description.slice(0, 50) + "..."
                    : itemProps.item.rawValue.description}
                </Select.ItemDescription>
              </Show>
            </div>
          </Select.Item>
        )}
      >
        <Select.Trigger
          data-agent-selector
          class="inline-flex items-center justify-between gap-2 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-xs min-w-[100px] transition-colors"
        >
          <Select.Value<Agent>>
            {(state) => (
              <span class="text-gray-700 dark:text-gray-200">Agent: {state.selectedOption()?.name ?? "None"}</span>
            )}
          </Select.Value>
          <Select.Icon>
            <ChevronDown class="w-3 h-3 text-gray-500 dark:text-gray-300" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content class="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-auto p-1 z-50">
            <Select.Listbox class="bg-white dark:bg-gray-800" />
          </Select.Content>
        </Select.Portal>
      </Select>
      <span class="text-xs text-gray-400 dark:text-gray-500">
        <Kbd shortcut="cmd+shift+a" />
      </span>
    </div>
  )
}
