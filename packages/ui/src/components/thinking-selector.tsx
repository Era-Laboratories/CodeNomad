import { createMemo, For } from "solid-js"
import { Select } from "@kobalte/core/select"
import { ChevronDown, Brain, Check } from "lucide-solid"
import { getModelThinkingMode, setModelThinkingMode, type ThinkingMode } from "../stores/preferences"

interface ThinkingSelectorProps {
  /** Current model identifier (e.g., "providerId/modelId" or just "modelId") */
  currentModelId: string
  /** Optional display name for the model */
  modelName?: string
}

interface ThinkingOption {
  value: ThinkingMode
  label: string
  description: string
}

const thinkingOptions: ThinkingOption[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Use model default behavior",
  },
  {
    value: "enabled",
    label: "Enabled",
    description: "Always use extended thinking",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "Never use extended thinking",
  },
]

export default function ThinkingSelector(props: ThinkingSelectorProps) {
  const currentMode = createMemo(() => getModelThinkingMode(props.currentModelId))

  const currentOption = createMemo(() =>
    thinkingOptions.find((opt) => opt.value === currentMode()) ?? thinkingOptions[0]
  )

  const handleChange = (option: ThinkingOption | null) => {
    if (option) {
      setModelThinkingMode(props.currentModelId, option.value)
    }
  }

  // Only show for models that support thinking (Claude models)
  const supportsThinking = createMemo(() => {
    const modelId = props.currentModelId.toLowerCase()
    return modelId.includes("claude") || modelId.includes("anthropic")
  })

  if (!supportsThinking()) {
    return null
  }

  return (
    <div class="sidebar-selector thinking-selector">
      <label class="selector-label">
        <Brain class="w-3 h-3 inline-block mr-1 opacity-70" />
        Extended Thinking
      </label>
      <Select<ThinkingOption>
        value={currentOption()}
        onChange={handleChange}
        options={thinkingOptions}
        optionValue="value"
        optionTextValue="label"
        placeholder="Select thinking mode"
        itemComponent={(itemProps) => (
          <Select.Item
            item={itemProps.item}
            class="thinking-selector-item"
          >
            <Select.ItemLabel class="thinking-selector-item-content">
              <span class="thinking-selector-item-label">{itemProps.item.rawValue.label}</span>
              <span class="thinking-selector-item-description">{itemProps.item.rawValue.description}</span>
            </Select.ItemLabel>
            <Select.ItemIndicator class="thinking-selector-item-indicator">
              <Check class="w-3.5 h-3.5" />
            </Select.ItemIndicator>
          </Select.Item>
        )}
      >
        <Select.Trigger class="selector-trigger thinking-selector-trigger">
          <Select.Value<ThinkingOption>>
            {(state) => (
              <div class="selector-trigger-label">
                <span class="selector-trigger-primary">{state.selectedOption()?.label ?? "Auto"}</span>
              </div>
            )}
          </Select.Value>
          <Select.Icon class="selector-trigger-icon">
            <ChevronDown class="w-3 h-3" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content class="selector-popover thinking-selector-popover">
            <Select.Listbox class="thinking-selector-listbox" />
          </Select.Content>
        </Select.Portal>
      </Select>
      <p class="thinking-selector-hint">
        {currentMode() === "auto" && "Uses model default (enabled for Opus/Sonnet)"}
        {currentMode() === "enabled" && "Extended thinking is always enabled"}
        {currentMode() === "disabled" && "Extended thinking is disabled"}
      </p>
    </div>
  )
}
